// v35: 翻轉價會自己移動 — pure functions (no DOM, no network).
// The 「什麼時候會變」 price is recomputed every morning (the 50-/200-day averages roll forward), so a fixed price alert
// set today can be wrong a week later. Projection = "if every close stays at the last close" (flat closes), same formula
// as backtest/flip_drift.py; history from data/flipdrift.json (Binance closed daily bars, 2018→, OOS = 2023→).
// Not a signal, not a forecast of direction; the 08:20 daily forecast stays authoritative.
export const K = 7;                 // = backtest/flip_drift.py K
export const HOME_MIN = 0.02;       // show the short home clause only when the projected one-week move is >= 2% of price
const usd0 = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) : '—';
const p1 = x => Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—';
const sgn = d => `${d >= 0 ? '+' : '−'}${p1(Math.abs(d))}`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
/** Taipei date (M/D) of the 08:00 close that the flip price after k more closes applies to (candle date + k + 1 closes at +k+2). */
export function closeMDk(date, k) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k + 2); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }
/** Flip price of line L after k more closes that all equal the last close (k = 0 → today's flip price = flipLevels). */
export function flatFlip(closes, L, k) {
  const n = closes.length, w = L - 1; if (n < w || k < 0 || k > w) return NaN;
  let s = 0; for (let i = n - (w - k); i < n; i++) s += closes[i];
  return (s + k * closes[n - 1]) / w;
}
/** s: nextmove state (near.ma, near.price, date). → {ma, now, wk, move (vs price), from, to} or null. */
export function drift(s, closes) {
  if (!s?.near || !closes || closes.length < 200 || !s.date) return null;
  const L = s.near.ma, now = flatFlip(closes, L, 0), wk = flatFlip(closes, L, K), c = closes[closes.length - 1];
  if (!Number.isFinite(now) || !Number.isFinite(wk) || Math.abs(now / s.near.price - 1) > 1e-9) return null;   // must be the card's price
  return { ma: L, now, wk, close: c, move: (wk - now) / c, distWk: wk / c - 1, from: closeMDk(s.date, 0), to: closeMDk(s.date, K) };
}
/** Short clause appended to the home 「什麼時候會變」 line, only when the projected move is material. */
export function homeClause(d) {
  if (!d || Math.abs(d.move) < HOME_MIN) return '';
  return `這個價格每天會重算：收盤都不動的話，一週後約 ${usd0(d.wk)} 美元（${d.move < 0 ? '往下' : '往上'}移 ${p1(Math.abs(d.move))}）。`;
}
/** One plain line inside 「看 X 的細節」. D = data/flipdrift.json (or null). */
export function detailLine(c, d, D) {
  if (!d) return '';
  const F = D?.pooled?.flips?.oos;
  const hist = F?.n ? `2023 年起兩個幣 ${F.n} 次趨勢翻轉，有 ${pc0(F.not_reached)} 是翻轉價移過來、收盤其實沒到一週前看到的價格；` : '';
  return `翻轉價每天早上重算，不是固定的：${c} 收盤如果每天都停在 ${usd0(d.close)} 美元，翻轉價會從 ${usd0(d.now)}（${d.from} 收盤用）慢慢變成約 ${usd0(d.wk)}（${d.to} 收盤用，${sgn(d.now ? d.wk / d.now - 1 : NaN)}）。${hist}設價格提醒的話，每天早上看一下新的翻轉價。`;
}
/** Paragraph for the advanced 「這週可能要動手嗎」 card. */
export function advPara(D) {
  const F = D?.pooled?.flips, P = D?.pooled?.projection; if (!F?.oos?.n || !P?.oos?.n) return '';
  const o = F.oos, p = P.oos;
  return `<div id="fd-adv"><h3 class="sub">翻轉價會自己移動</h3>
    <p class="small">翻轉價是用最近 49／199 天的收盤算的，每天早上舊的一天移出、新的一天加入，所以就算價格不動，它也會變。2023 年起兩個幣 <strong>${o.n} 次</strong>趨勢翻轉中，<strong>${pc0(o.not_reached)}</strong>（${o.k_not} 次）的翻轉收盤其實沒到一週前看到的翻轉價——是翻轉價移過來；50 日線 ${pc0(o.l50?.not_reached)}（${o.l50?.n} 次）、200 日線 ${pc0(o.l200?.not_reached)}（${o.l200?.n} 次，200 日線移得慢）。2022 年以前：${pc0(F.is.not_reached)}（${F.is.n} 次）。</p>
    <p class="small">「收盤都不動」的估法：一週後的翻轉價一般差 ${p1(p.med_err_flat)}（10 次有 9 次在 ${p1(p.p90_err_flat)} 以內），當成固定不動則一般差 ${p1(p.med_err_naive)}（${p1(p.p90_err_naive)}）；${pc0(p.flat_closer)} 的日子比較準（${p.n} 天）。一週內翻轉價移動 2% 以上的日子占 ${pc0(p.drift_ge_2pct)}，這時首頁會多一句提醒。</p>
    <p class="small muted">算法：<code>backtest/flip_drift.py</code> → <code>data/flipdrift.json</code>（Binance 已收完日K，資料到 ${D.as_of}；定義事先固定在程式說明）。只用當天以前的收盤；「一週前看到的」＝翻轉前第 7 根收盤後算的價格，且這 7 天內同一條線沒穿過。它只說翻轉價會怎麼移，不說價格會漲會跌；真的變了以 08:20 的每日預測為準。</p></div>`;
}
