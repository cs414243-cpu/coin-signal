// v32: 成績單現在的差距算不算數 — reads data/scorenoise.json (backtest/score_noise.py: champion trend_vt@1 walk-forward,
// fresh virtual NT$1M portfolios over windows of exactly N days, costs as the live scorecard). Descriptive only.
const p0 = x => `${Math.round(x * 100)}%`;
const pp = x => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(0)}`;

/** Row for the largest horizon ≤ days (null when days < 1 or no data). */
export function pick(rows, days) {
  if (!Array.isArray(rows) || !(days >= 1)) return null;
  let best = null;
  for (const r of rows) if (r.days <= days && (!best || r.days > best.days)) best = r;
  return best;
}
const part = r => r?.oos?.n ? r.oos : r?.all?.n ? r.all : null;   // 2024→ (out of sample) first, else 2022→

/** One plain sentence under the scorecard's two paper portfolios. track = LIVE.track. */
export function paperLine(SN, track) {
  const c = track?.champion?.paper, b = track?.baseline?.paper, start = track?.paper_start_twd;
  if (!SN?.horizons?.length || !c?.equity || !b?.equity || !start) return '';
  const days = c.days, row = pick(SN.horizons, days), P = part(row);
  if (!P || P.win_down == null || P.win_up == null) return '';
  const cr = c.equity / start - 1, br = b.equity / start - 1, lead = cr > br, fell = br < 0;
  const span = days >= 7 && days % 7 === 0 ? `${days / 7} 週` : `${days} 天`;
  const why = fell ? `這 ${span}幣價在跌（一直抱著 −${Math.abs(br * 100).toFixed(2)}%）` : `這 ${span}幣價沒跌（一直抱著 +${(br * 100).toFixed(2)}%）`;
  const who = lead ? '照建議領先' : '一直抱著領先';
  const r8 = days < 56 ? part(pick(SN.horizons, 56)) : null;
  const tail = r8?.win != null ? `拉長到 8 週，照建議贏的期間也只有 ${p0(r8.win)}；它的用處是大跌時少虧。` : '';
  return `<p class="small sn-paper" id="sn-paper"><strong>${who}，但還不算數：</strong>${why}。回測裡同樣 ${span}的期間，幣價跌時照建議 ${p0(P.win_down)} 會贏、漲時只有 ${p0(P.win_up)}——短期誰贏主要看漲跌，不代表預測準。${tail}</p>`;
}

/** When forecasts have matured: is the hit rate outside what chance alone gives over the same number of days? */
export function hitLine(SN, ns, hit) {
  if (!SN?.hit?.windows?.length || !(ns > 0) || hit == null) return '';
  const days = Math.ceil(ns / 2), r = pick(SN.hit.windows, days);
  if (!r) return '';
  const lo = r.p10, hi = r.p90;
  if (lo <= 0 && hi >= 1) return `<p class="small sn-hit" id="sn-hit">猜對率要很多筆才看得準：回測裡只有 ${days} 天的預測，猜對 0% 到 100% 都很常見；現在的 ${p0(hit)} 還看不出準不準。</p>`;
  const where = hit < lo - 1e-9 ? '比這個範圍低，但筆數還少，先不要下結論' : hit > hi + 1e-9 ? '比這個範圍高，但筆數還少，可能只是運氣' : '在這個範圍裡，還看不出準不準';
  return `<p class="small sn-hit" id="sn-hit">猜對率要很多筆才看得準：回測裡同樣 ${days} 天的預測，猜對率一般在 ${p0(lo)}～${p0(hi)} 之間跳動；現在的 ${p0(hit)} ${where}。</p>`;
}

const SHOW = [[1, '1 天'], [7, '1 週'], [28, '4 週'], [56, '8 週'], [182, '半年'], [364, '1 年']];
/** Advanced card (inside 「預測模型與自我改善機制」): the numbers behind the sentence. */
export function advBlock(SN) {
  if (!SN?.horizons?.length) return '';
  const rows = SHOW.map(([d, lab]) => { const r = SN.horizons.find(x => x.days === d); if (!r) return '';
    const O = r.oos, A = r.all, f = x => x == null ? '—' : p0(x);
    return `<tr><th>${lab}</th><td>${f(O?.win)}<div class="muted small">${f(A?.win)}</div></td><td>${f(O?.win_down)}</td><td>${f(O?.win_up)}</td><td>${O ? `${pp(O.diff_p10)}～${pp(O.diff_p90)}` : '—'}</td></tr>`; }).join('');
  return `<div id="sn-adv"><p class="small"><strong>成績單的差距算不算數</strong>：用冠軍逐日重做的建議（${SN.oos_start.slice(0, 4)} 年起，到 ${SN.as_of}），從每一天開始各開一個新的虛擬 NT$100 萬，照建議 vs 一直抱著，過了同樣天數誰比較多（已扣手續費和台幣買 USDT 溢價，和成績單同一套算法）。</p>
    <div class="scroll"><table class="bt"><thead><tr><th>期間</th><th>照建議贏的比例<div class="muted small">小字＝${SN.start.slice(0, 4)} 年起</div></th><th>幣價跌時</th><th>幣價漲時</th><th>差距一般範圍（百分點）</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">「一般範圍」是中間 80% 的期間。期間逐日滑動、彼此重疊，不是獨立的試驗；這只是描述過去，不是新訊號。照建議主要是在跌的時候少虧、漲的時候少賺，所以短期誰贏幾乎由漲跌決定；要看出它值不值得，至少要等系統規定的 8 週實盤紀錄。算法：<code>backtest/score_noise.py</code> → <code>data/scorenoise.json</code>。</p></div>`;
}
