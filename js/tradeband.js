// v19: 差一點要不要動手 — pure functions (no DOM, no network).
// Numbers come from backtest/trade_band.py → data/tradeband.json (champion trend_vt@1's own walk-forward exposures,
// engine.paper_sim costs, rule picked on 2022–23 and checked from 2024). Today's suggestion comes from live.json.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ntd = x => `NT$${Math.round(x).toLocaleString('en-US')}`;
const pc0 = x => x === null || x === undefined ? '—' : x > 0 && x < 0.005 ? '不到 1%' : `${Math.round(x * 100)}%`;
const pc1 = x => x === null || x === undefined ? '—' : `${(x * 100).toFixed(1)}%`;
const f2 = x => x === null || x === undefined ? '—' : Number(x).toFixed(2);
export const OLD_TOL = 0.02;      // pre-v19 wording: "不用動" if the gap < max(NT$1,000, 2% of the budget)
export const MIN_NTD = 1000;      // never suggest a trade smaller than this (practical minimum; unchanged since v4)

/** Tolerance (share of the money planned for the coin) the home card uses, and whether history backs it. */
export function tolOf(T) {
  const s = T?.selection;
  if (s && s.confirmed_oos && Number.isFinite(s.tol)) return { tol: s.tol, backed: true };
  return { tol: OLD_TOL, backed: false };
}

/** What to do with the money: have = NT$ now in the coin, B = NT$ planned for it, e = suggested share. */
export function act({ have, B, e, T }) {
  if (!(B > 0) || !Number.isFinite(have) || !Number.isFinite(e)) return null;
  const { tol, backed } = tolOf(T);
  const tgt = e * B, diff = tgt - have, gap = Math.abs(diff) / B, gapPp = Math.round(gap * 100);
  if (e < 0.005 && have >= MIN_NTD) return { kind: 'sellall', amt: have, gapPp, tol, backed };
  if (Math.abs(diff) < Math.max(MIN_NTD, tol * B)) return { kind: gap < 0.005 || Math.abs(diff) < MIN_NTD ? 'same' : 'wait', amt: Math.abs(diff), gapPp, tol, backed };
  return { kind: diff > 0 ? 'buy' : 'sell', amt: Math.abs(diff), gapPp, tol, backed };
}

/** HTML fragment that ends the home money sentence ("你現在有 NT$X，" + this). */
export function actHtml(a) {
  if (!a) return '';
  const tp = Math.round(a.tol * 100);
  switch (a.kind) {
    case 'sellall': return `建議是先不放：<strong>全部賣出約 ${ntd(a.amt)}</strong>（建議是 0 時當天照做最重要）`;
    case 'same': return '和建議差不多，<strong>不用動</strong>';
    case 'wait': return a.backed ? `和建議差 ${a.gapPp} 個百分點，在 ${tp} 個以內，<strong>可以先不動</strong>（差超過 ${tp} 個或建議變成先不放時再調）`
      : `和建議差 ${a.gapPp} 個百分點，<strong>不用動</strong>`;
    case 'buy': return `差 ${a.gapPp} 個百分點，可以<strong>買進約 ${ntd(a.amt)}</strong>`;
    case 'sell': return `差 ${a.gapPp} 個百分點，建議<strong>賣出約 ${ntd(a.amt)}</strong>`;
    default: return '';
  }
}

const R = (T, k) => T?.results?.[k];
/** One small line on the top card (for everyone, also without holdings). '' when the data is missing or not backed. */
export function homeNote(T) {
  const { tol, backed } = tolOf(T); const d = R(T, 'daily'), w = R(T, 'weekly'), g = R(T, T?.selection?.tol_rule);
  if (!backed || !d || !w || !g) return '';
  const y = T.oos_start.slice(0, 4);
  const weeklyWorse = w.pooled.oos.cagr < d.pooled.oos.cagr && w.pooled.oos.sharpe < d.pooled.oos.sharpe;
  return `不用每天微調：你放的比例和建議差 ${Math.round(tol * 100)} 個百分點以內可以先不動（${y} 年起回測差不多、手續費少一些，沒有證明比較好）。`
    + (weeklyWorse ? `但建議變成「先不要放」時要當天照做：只在每週一才看，${y} 年起回測年化只剩 ${pc0(w.pooled.oos.cagr)}（每天看 ${pc0(d.pooled.oos.cagr)}）。` : '');
}

// ---------- advanced card ----------
const ORDER = ['daily', 'gap02', 'gap05', 'gap10', 'gap20', 'weekly'];
const NAME = { daily: '每天調到剛好', gap02: '差 2 個百分點以上才調', gap05: '差 5 個以上才調', gap10: '差 10 個以上才調', gap20: '差 20 個以上才調', weekly: '只在每週一看一次' };
function row(T, k, per) {
  const x = R(T, k); if (!x) return '';
  const o = x.pooled[per], ib = x.pooled.is_;
  const pick = k === T.selection?.tol_rule ? ' class="hl"' : '';
  const tr = per === 'oos' ? `BTC ${Math.round(x.coins.BTC.oos.trades_yr)}／ETH ${Math.round(x.coins.ETH.oos.trades_yr)}` : '';
  return `<tr${pick}><th>${NAME[k]}${k === T.selection?.tol_rule ? '<div class="muted small">首頁採用</div>' : ''}</th><td>${pc1(o.cagr)}<div class="muted small">選規則時 ${pc1(ib.cagr)}</div></td><td>${f2(o.sharpe)}<div class="muted small">${f2(ib.sharpe)}</div></td><td>${pc1(o.maxdd)}</td><td>${tr}</td><td>${pc1(o.cost_yr)}</td><td>${k === 'daily' ? '—' : pc0(x.oos_p_better)}</td></tr>`;
}
/** Per-coin direction of the chosen rule vs daily (OOS Sharpe). */
export function coinMix(T, k) {
  const g = R(T, k), d = R(T, 'daily'); if (!g || !d) return '';
  const b = c => g.coins[c].oos.sharpe > d.coins[c].oos.sharpe;
  const [B, E] = [b('BTC'), b('ETH')];
  return B === E ? `兩個幣都${B ? '略好' : '略差'}。` : `BTC ${B ? '變好' : '變差'}、ETH ${E ? '變好' : '變差'}，方向不一致。`;
}
// v20: 幾點動手 — numbers copied from forecast/proposals/proto_execution_timing_results.json (tests check they match).
// Same champion exposures, executed at different Taipei hours after the 08:00 daily close; 2024→ backtest, costs as paper_sim.
export const EXEC_TIMING = {"as_of":"2026-11-10","oos_start":"2024-01-01","h0":{"cagr":0.1629,"maxdd":-0.1842},"h1":{"cagr":0.1646,"maxdd":-0.1819},"h4":{"cagr":0.1584,"maxdd":-0.1908},"h12":{"cagr":0.1535,"maxdd":-0.1913},"h16":{"cagr":0.138,"maxdd":-0.2056},"h24":{"cagr":0.1063,"maxdd":-0.2261},"same_day_min_holm_worse_p":0.279,"h24_holm_worse_p":0.0035,"tod_reliable":false};
/** One plain line for the advanced 「差一點要不要動手」 card. */
export function timingLine(X = EXEC_TIMING) {
  if (!X?.h1 || !X?.h24) return '';
  const y = X.oos_start.slice(0, 4), sameOk = X.same_day_min_holm_worse_p >= 0.05, lateBad = X.h24_holm_worse_p < 0.05;
  return `<p id="exectiming"><strong>幾點動手</strong>：同一份建議，${y} 年起回測（到 ${X.as_of}）早上 9 點做年化 ${pc1(X.h1.cagr)}、中午 12 點 ${pc1(X.h4.cagr)}、晚上 8 點 ${pc1(X.h12.cagr)}、半夜 12 點 ${pc1(X.h16.cagr)}${sameOk ? '（同一天內的差別沒有證明，可能只是運氣）' : ''}；${lateBad ? `<strong>拖到隔天早上才做，年化只剩 ${pc1(X.h24.cagr)}、最慘時虧 ${pc1(X.h24.maxdd)}（9 點做 ${pc1(X.h1.maxdd)}），這個差別在統計上站得住</strong>，主要虧在趨勢轉向的那幾天。` : `拖到隔天早上年化 ${pc1(X.h24.cagr)}。`}${X.tod_reliable ? '' : '沒有哪個時段固定比較好：看到建議就做，最晚當天做完。'}</p>`;
}
export function tradeBandCard(T) {
  if (!T?.results?.daily) return '';
  const s = T.selection, { tol, backed } = tolOf(T), y = T.oos_start.slice(0, 4), tp = Math.round(tol * 100);
  const d = R(T, 'daily').pooled.oos, g = s?.tol_rule ? R(T, s.tol_rule) : null, w = R(T, 'weekly').pooled.oos;
  const verdict = backed
    ? `用 2022–23 年事先選出「差 ${tp} 個百分點以上才調」，${y} 年起也站得住：年化 ${pc1(g.pooled.oos.cagr)}（每天調 ${pc1(d.cagr)}）、最慘時虧 ${pc1(g.pooled.oos.maxdd)}（${pc1(d.maxdd)}），手續費加溢價每年 ${pc1(g.pooled.oos.cost_yr)}（${pc1(d.cost_yr)}）。比每天調好的把握只有 ${pc0(g.oos_p_better)}，<strong>只能說差不多、比較省事，不能說比較會賺</strong>；${coinMix(T, s.tol_rule)}`
    : `事先定的條件在 ${y} 年起沒有成立，所以首頁維持「差 2 個百分點以內不用動」的舊說法。`;
  return `<section class="card" id="tradeband"><h2>差一點要不要動手</h2>
    <p class="small">首頁的「建議放 X%」每天都會小幅變動（主要是因為最近漲跌的劇烈程度在變）。真的每天去買賣幾百塊不實際，所以這裡用冠軍模型自己每天的建議比例，模擬幾種一般人做得到的做法：你實際放的比例會跟著價格漂，差距超過門檻才調回建議；建議變成 0（先不要放）時一律當天全部賣出。</p>
    <p>${verdict}</p>
    <p><strong>只在每週一看一次（連「先不要放」也等到週一才賣）</strong>：${y} 年起年化 ${pc1(w.cagr)}、最慘時虧 ${pc1(w.maxdd)}，${w.sharpe < d.sharpe - 0.1 ? `比每天看差很多（比每天調好的把握 ${pc0(R(T, 'weekly').oos_p_better)}）。趨勢轉壞時晚幾天賣，就把這個規則主要的好處（大跌時少虧）丟掉了。` : `和每天看差不多（比每天調好的把握 ${pc0(R(T, 'weekly').oos_p_better)}）。`}</p>
    ${timingLine()}
    <div class="scroll"><table class="bt"><thead><tr><th>做法</th><th>${y} 起年化</th><th>夏普值</th><th>${y} 起最慘時虧</th><th>每年動手天數</th><th>成本／年</th><th>比每天調好的把握</th></tr></thead><tbody>
    ${ORDER.map(k => row(T, k, 'oos')).join('')}</tbody></table></div>
    <p class="small muted">算法：<code>backtest/trade_band.py</code> → <code>data/tradeband.json</code>（${esc(T.source)}）。BTC、ETH 各半的虛擬 NT$100 萬，和「預測成績單」同一套模擬；成本：${esc(T.costs.note)}。每一天只用當天以前的資料決定要不要調；門檻和選法在算任何結果之前寫好（2022–23 年夏普不低於每天調 0.02 以上、最慘跌幅不多 2 個百分點，取最大的門檻；${y} 年起再用同樣條件檢查）。夏普值下面的小字是 2022–23 年選規則時期。「比每天調好的把握」是區塊重抽 ${2000} 次中夏普比較高的比例，要 97.5% 以上才算證明。這和「試過但沒通過的訊號」裡的「差一點就不調」是同一個想法：它不會讓預測變準，所以不能當新模型，只是執行上的省事做法。這是過去紀錄，不是預測，也不是投資建議。</p>
  </section>`;
}
