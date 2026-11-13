// v27: 這週可能要動手嗎 — pure functions (no DOM, no network).
// Base rates from backtest/next_move.py → data/nextmove.json: how often the champion trend_vt@1's trend state changed
// within the next 1 / 7 daily closes, by today's distance to the nearest flip price measured in weeks of typical move.
// Today's state is recomputed from the phone's CLOSED daily bars with the same formulas (reliability.flipLevels, vol30 as
// signals.series). Not a signal, not a forecast of direction; the 08:20 daily forecast stays authoritative.
import { flipLevels, flipAction } from './reliability.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ntd = x => Number.isFinite(x) ? `NT$${Math.round(x).toLocaleString('en-US')}` : '—';
const usd = x => Number.isFinite(x) ? `${x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 })} 美元` : '—';
const pc0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : x > 0 && x < 0.005 ? '不到 1%' : `${Math.round(x * 100)}%`;
const p1 = x => Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—';
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };

export const EDGES = [0, 0.5, 1, 2, Infinity];          // same as backtest/next_move.py (fixed)
export const LABELS = ['lt05', '05to1', '1to2', 'ge2'];
export const BUCKET_ZH = { lt05: '不到半週的典型波動', '05to1': '半週到 1 週', '1to2': '1–2 週', ge2: '2 週以上' };
export const MIN_N = 100;                                // fewer samples than this → use both coins pooled
export const H = 7;
export function bucketOf(z) {
  if (!Number.isFinite(z) || z < 0) return null;
  for (let i = 0; i < LABELS.length; i++) if (z >= EDGES[i] && z < EDGES[i + 1]) return LABELS[i];
  return null;
}
/** Annualised 30-day volatility of log returns on the last 31 closes (ddof 1, √365) — same as signals.series / flip_stats. */
export function vol30(closes) {
  const n = closes.length; if (n < 31) return NaN;
  const lr = []; for (let i = n - 30; i < n; i++) lr.push(Math.log(closes[i] / closes[i - 1]));
  const m = lr.reduce((a, b) => a + b, 0) / lr.length;
  return Math.sqrt(lr.reduce((a, b) => a + (b - m) ** 2, 0) / (lr.length - 1)) * Math.sqrt(365);
}
export const vtScale = v => Number.isFinite(v) && v ? Math.min(1, 0.30 / v) : 0;
/** Today's state from closed closes (ascending). date = UTC candle date of the last close. */
export function stateFrom(closes, date = null) {
  const F = flipLevels(closes); if (!F) return null;
  const v = vol30(closes), wk = v / Math.sqrt(365) * Math.sqrt(H);
  const lv = F.levels.map(l => ({ ma: l.ma, price: l.price, dist: l.dist, above: l.above, next: l.next, nextExpo: l.next * vtScale(v) }));
  const near = lv.reduce((a, b) => Math.abs(Math.log(1 + b.dist)) < Math.abs(Math.log(1 + a.dist)) ? b : a);
  const z = Math.abs(Math.log(1 + near.dist)) / wk;
  return { date, close: F.close, trend: F.trend, vol30: v, exposure: F.trend * vtScale(v), z, bucket: bucketOf(z), levels: lv, near, src: 'phone' };
}
/** Same shape from the weekly file (used only when the phone has no bars and the file is for the forecast's date). */
export function fileState(N, coin) {
  const c = N?.coins?.[coin]?.current; if (!c) return null;
  const lv = c.levels.map(l => ({ ma: l.ma, price: l.price, dist: l.dist, above: l.above, next: l.next_trend, nextExpo: l.next_exposure }));
  const near = lv.find(l => l.ma === c.nearest_ma) || lv[0];
  return { date: c.date, close: c.close, trend: c.trend3, vol30: c.vol30, exposure: c.exposure, z: c.z, bucket: c.bucket, levels: lv, near, src: 'file' };
}
/** closes/date from the phone if available; else the file when it matches the forecast's candle date (asof); else undefined. */
export function pickState(N, coin, closes, date, asof) {
  if (closes && closes.length >= 200) { const s = stateFrom(closes, date); if (s) return s; }
  const f = fileState(N, coin);
  return f && (!asof || f.date === asof) ? f : undefined;
}
/** Historical rate for a bucket: this coin from 2023 (oos) when it has >= MIN_N days, else both coins pooled (oos). */
export function rateFor(N, coin, bucket) {
  const own = N?.coins?.[coin]?.stats?.oos?.buckets?.[bucket];
  if (own && own.n >= MIN_N) return { ...own, who: coin, per: 'oos' };
  const po = N?.pooled?.stats?.oos?.buckets?.[bucket];
  return po ? { ...po, who: 'pooled', per: 'oos' } : null;
}
const usd0 = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) : '—';
const sgn = d => `${d > 0 ? '+' : '−'}${p1(Math.abs(d))}`;
export const actionAfter = s => flipAction(s.trend, s.near.next);
/** One short sentence for the top card. st: {BTC: state|null|undefined, ETH: …}; plan: {BTC: text|'' , …} (optional).
 *  Prices are the flip price for the next 08:00 close; % is vs the last 08:00 close (the base rates are close-to-close). */
export function homeSentence(N, st, plan = {}) {
  if (!N?.coins) return '';
  const parts = [];
  for (const c of ['BTC', 'ETH']) {
    const s = st?.[c]; if (!s || !s.bucket) continue;
    const r = rateFor(N, c, s.bucket); if (!r || r.p7 === null) continue;
    const first = !parts.length, hl = s.near.dist > 0 ? '高於' : '低於';
    parts.push(first
      ? `${c} 收盤${hl} ${usd0(s.near.price)} 美元（比上次收盤${sgn(s.near.dist)}）就會轉為${actionAfter(s)}，過去類似距離 7 天內發生約 ${pc0(r.p7)}${plan[c] ? `（${plan[c]}）` : ''}`
      : `${c} ${hl} ${usd0(s.near.price)} 美元（${sgn(s.near.dist)}）轉為${actionAfter(s)}，約 ${pc0(r.p7)}${plan[c] ? `（${plan[c]}）` : ''}`);
  }
  if (!parts.length) return '';
  return `這週會不會要動手：${parts.join('；')}。這是過去紀錄、不是預測，細節在進階「這週可能要動手嗎」。`;
}
/** v29: one visible plain line per coin on the top card — the nearest flip price for the next 08:00 close and what the
 *  suggestion becomes. s: state from pickState (null/undefined → ''). Same numbers as homeSentence (which moved under 細節). */
export function triggerLine(c, s) {
  if (!s || !s.near || !Number.isFinite(s.near.price) || !Number.isFinite(s.near.dist)) return '';
  const hl = s.near.dist > 0 ? '高於' : '低於';
  const sh = shareAfter(s);
  return `什麼時候會變：${c} 早上 8 點收盤${hl} ${usd0(s.near.price)} 美元（比上次收盤${sgn(s.near.dist)}），建議就會轉為${actionAfter(s)}${sh ? `（${sh}）` : ''}；盤中碰到不算。`;
}
/** v31: how much the suggestion becomes after the flip, in the same words as the top card's 「建議：」 line.
 *  nextExpo = next trend × min(1, 30% ÷ today's 30-day vol) (same estimate as the v27 card's 「建議比例約」).
 *  backtest/flip_size_check.py: on 431 one-step flips since 2018 the estimate was within 5 points of the real share on
 *  the flip close 93% of the time (median error 0.3 points); a very big move on the flip day raises vol and lowers it. */
export function shareAfter(s) {
  const e = s?.near?.nextExpo;
  if (!Number.isFinite(e)) return '';
  if (e < 0.005) return '先不要放';
  const pct = Math.round(e * 100);
  return s.near.next < s.trend ? `降到約 ${pct}%` : `放約 ${pct}%`;
}
/** Short plan text for the home sentence from TB.act-like object {kind, amt}. */
export function planShort(a) {
  if (!a) return '';
  if (a.kind === 'buy') return `到時照你的部位約買 ${ntd(a.amt)}`;
  if (a.kind === 'sell') return `到時約賣 ${ntd(a.amt)}`;
  if (a.kind === 'sellall') return `到時全部賣出約 ${ntd(a.amt)}`;
  if (a.kind === 'wait' || a.kind === 'same') return '到時和建議差不多，可以先不動';
  return '';
}

// ---------- advanced card ----------
function rateCells(b) { return b?.n ? `<td>${pc0(b.p1)}</td><td><strong>${pc0(b.p7)}</strong><div class="muted small">${b.k7}／${b.n} 天</div></td>` : '<td>—</td><td>—</td>'; }
function coinBlock(N, c, s, P, twd) {
  const C = N.coins[c];
  let now;
  if (s === undefined) now = '<p class="small muted">手機還沒抓到最新日K，等一下再看。</p>';
  else if (!s) now = '<p class="small">資料不足，算不出來。</p>';
  else {
    const r = rateFor(N, c, s.bucket), act = actionAfter(s);
    const lv = s.levels.map(l => `${l.ma} 日線 ${usd(l.price)}${twd ? `（約 ${ntd(twd(l.price))}）` : ''}，${l.dist > 0 ? '要漲' : '要跌'} ${p1(Math.abs(l.dist))}`).join('；');
    now = `<p class="nm-now">依 ${closeMD(s.date)} 早上 8 點收盤 ${usd(s.close)}：最近的翻轉價是 <strong>${s.near.ma} 日線 ${usd(s.near.price)}</strong>${twd ? `（在 MAX 約 ${ntd(twd(s.near.price))}）` : ''}，收盤${s.near.dist > 0 ? '高於' : '低於'}它，建議會從${s.trend === 0 ? '空手' : s.trend === 1 ? '持有' : '減碼'}轉為<strong>${act}</strong>（建議比例約 ${pc0(s.near.nextExpo)}）。距離 ${p1(Math.abs(s.near.dist))}＝${s.z.toFixed(2)} 週的典型波動（${BUCKET_ZH[s.bucket]}）。</p>
      <p class="small">過去${r?.who === 'pooled' ? '（兩個幣合計）' : ''}距離差不多時（2023 年起 ${r?.n ?? '—'} 天）：<strong>隔天早上就變 ${pc0(r?.p1)}</strong>、<strong>7 天內變 ${pc0(r?.p7)}</strong>。兩條線：${lv}。</p>
      ${P ? `<p class="nm-plan">${P}</p>` : '<p class="small muted">想看到時要買賣多少錢：在「我的部位」填總資產和持有數量。</p>'}
      ${s.src === 'file' ? `<p class="small muted">（用每週預先算好的資料，最新 ${esc(C.last_bar)}）</p>` : ''}`;
  }
  const S = C.stats, row = (lab, k) => `<tr><th>${lab}</th>${rateCells(S.is.buckets[k])}${rateCells(S.oos.buckets[k])}</tr>`;
  return `<h3 class="sub">${c}</h3>${now}
    <div class="scroll"><table class="bt"><thead><tr><th>離翻轉價</th><th>隔天變<div class="muted small">～2022</div></th><th>7 天內變<div class="muted small">～2022</div></th><th>隔天變<div class="muted small">2023～</div></th><th>7 天內變<div class="muted small">2023～</div></th></tr></thead><tbody>
    ${LABELS.map(k => row(BUCKET_ZH[k], k)).join('')}
    <tr class="muted"><th>不分距離</th><td>${pc0(S.is.p1)}</td><td>${pc0(S.is.p7)}</td><td>${pc0(S.oos.p1)}</td><td>${pc0(S.oos.p7)}</td></tr></tbody></table></div>`;
}
/** st: {BTC, ETH} states; plans: {BTC: html|'' } ; twd: price → NT$ (or null). */
export function nextMoveCard(N, st, plans = {}, twd = null) {
  if (!N?.coins) return '';
  const k = N.pooled.check.p7, k1 = N.pooled.check.p1, PB = N.pooled.stats.oos.buckets;
  return `<section class="card" id="nextmove"><h2>這週可能要動手嗎</h2>
    <p id="nm-line">建議只在收盤穿過 50 日或 200 日均線時才會大改（空手⇄減碼⇄持有）。離那個價格越近，越可能這幾天就要動手；這張卡把「離多近」換成過去實際發生的比例，並先算好到時要做什麼。</p>
    ${['BTC', 'ETH'].filter(c => N.coins[c]).map(c => coinBlock(N, c, st?.[c], plans[c], twd)).join('')}
    <p class="small"><strong>重點</strong>：距離不到半週的典型波動時，2023 年起 7 天內建議改變 ${pc0(PB.lt05.p7)}（兩個幣合計）；超過 2 週的典型波動時幾乎不會（${pc0(PB.ge2.p7)}）。用 2022 年以前的比例去猜 2023 年起，7 天內會不會變的準確度（Brier）比只用平均比例好 ${pc0(k.skill)}（${k.brier_bucket} vs ${k.brier_base}，${k.n} 天），隔天會不會變好 ${pc0(k1.skill)}，所以這些比例在樣本外也站得住。<strong>它只說「會不會要動手」，不說會漲還是會跌</strong>；建議變了之後也常在兩週內又變回來（見「建議變化」）。真的變了以 08:20 的每日預測為準，盤中碰到不算。</p>
    <p class="small muted">算法：<code>backtest/next_move.py</code> → <code>data/nextmove.json</code>（${esc(N.source)}；${esc(N.model)}）。每天只用當天以前的收盤：翻轉價＝讓下一根收盤剛好等於含它的均線的價格（50 日＝最近 49 根平均、200 日＝最近 199 根平均）；${esc(N.z_def)}；距離分 4 組（事先固定）。「變」＝之後 1／7 根收盤中，趨勢狀態和今天不同。2023 年以前是選規則時看過的時期，之後才算樣本外；相鄰日子的 7 天會重疊，天數不是獨立樣本。翻轉後的建議比例用今天的 30 日波動估，收盤時會小幅變動：2018 年起 431 次翻轉（資料到 2026/11/12），估的和翻轉當天實際的比例差 5 個百分點以內 93%（2023 年起 90%）、中位差 0.3 個百分點；翻轉那天如果大漲大跌，30 日波動會跳高、實際比例會低很多（差超過 15 個百分點 4 次，例如 ETH 2026/8/19 估 98%、實際 47%，那天的建議甚至是減碼），所以真的變了以 08:20 的每日預測為準（<code>backtest/flip_size_check.py</code>）。金額用「我的部位」和「差一點要不要動手」同一套算法，成本用「買幣成本」的 MAX 掛單簿快照。只是過去紀錄、不是預測，也不是投資建議。每週一自動重算。</p>
  </section>`;
}
