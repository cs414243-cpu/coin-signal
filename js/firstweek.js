// v79: 預測成績單「已經對答案：5 個方法誰說得比較準？」— every model's matured live scores, straight from the public
// hash-chained ledger (ledger/scores.jsonl, rows written by run_daily.py / engine.score_one), plus how much so few days can
// tell: data/briernoise.json ← backtest/brier_noise.py (frozen walk-forward of the same 5 models, 2024+ OOS, windows of K
// forecast days). Pure functions; no DOM writes. Changes nothing about the advice. Research only, not investment advice.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p0 = x => `${Math.round(x * 100)}%`;
const f3 = x => Number(x).toFixed(3);
const sp = x => `${x > 0 ? '+' : x < 0 ? '−' : ''}${(Math.abs(x) * 100).toFixed(1)}%`;
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const SHORT = { 'baseline@1': '基準（永遠猜平常的上漲率）', 'trend_vt@1': '現在用的方法（趨勢＋波動）', 'knn@1': '相似日子', 'tsmom@1': '動能混合', 'logit@1': '邏輯迴歸' };

/** Per model: mean Brier over all its scored rows (only forecast days where every listed model has both coins scored,
 *  so the comparison is like-for-like). Returns null when nothing has matured. */
export function table(scores, models) {
  const ok = (scores || []).filter(s => s && s.type === 'score' && Number.isFinite(s.brier) && Number.isFinite(s.p_up));
  if (!ok.length) return null;
  const M = models && models.length ? models : [...new Set(ok.map(s => s.model))];
  const days = [...new Set(ok.map(s => s.asof))].filter(d => M.every(m => ['BTC', 'ETH'].every(c => ok.some(s => s.asof === d && s.model === m && s.coin === c)))).sort();
  if (!days.length) return null;
  const use = ok.filter(s => days.includes(s.asof) && M.includes(s.model));
  const rows = M.map(m => { const R = use.filter(s => s.model === m);
    const last = days[days.length - 1], pick = c => R.find(s => s.asof === last && s.coin === c);
    return { model: m, n: R.length, brier: R.reduce((a, s) => a + s.brier, 0) / R.length, hits: R.filter(s => s.hit === 1).length,
      inBand: R.filter(s => s.in_band === 1).length, pBTC: pick('BTC')?.p_up, pETH: pick('ETH')?.p_up }; })
    .sort((a, b) => a.brier - b.brier || (a.model < b.model ? -1 : 1));
  const last = days[days.length - 1], mv = c => use.find(s => s.asof === last && s.coin === c)?.realized;
  return { days, n: use.length, rows, lastAsof: last, lastTarget: use.find(s => s.asof === last)?.target_date, moveBTC: mv('BTC'), moveETH: mv('ETH') };
}

/** Backtest window with the most days ≤ K (K = scored forecast days). */
export function windowFor(BN, K, part = 'oos') {
  const W = BN?.[part]?.windows || []; let best = null;
  for (const w of W) if (w.days <= K && (!best || w.days > best.days)) best = w;
  return best;
}

/** One plain sentence for the summary line. */
export function headline(T, champ = 'trend_vt@1', base = 'baseline@1') {
  if (!T) return null;
  const c = T.rows.find(r => r.model === champ), b = T.rows.find(r => r.model === base);
  if (!c || !b) return null;
  const rank = T.rows.findIndex(r => r.model === champ) + 1;
  const vs = c.brier < b.brier ? '比「基準」好一點' : c.brier > b.brier ? '比「基準」差一點' : '和「基準」一樣';
  return `已經對答案：5 個方法誰說得比較準？現在用的方法第 ${rank} 名、${vs}——但只有 ${T.days.length} 天的預測（${T.n} 筆），還看不出來`;
}

/** Collapsed block for the scorecard. T = table(), BN = briernoise.json. */
export function block(T, BN, champ = 'trend_vt@1', base = 'baseline@1') {
  const h = headline(T, champ, base); if (!h) return '';
  const K = T.days.length, w = windowFor(BN, K), w56 = windowFor(BN, 56), O = BN?.oos;
  const c = T.rows.find(r => r.model === champ), b = T.rows.find(r => r.model === base);
  const when = K === 1 ? `${closeMD(T.lastAsof)} 早上說的預測，${closeMD(T.lastTarget)} 早上到期` : `${closeMD(T.days[0])}～${closeMD(T.lastAsof)} 早上說的 ${K} 天預測（最後一批 ${closeMD(T.lastTarget)} 早上到期）`;
  const moves = Number.isFinite(T.moveBTC) && Number.isFinite(T.moveETH) ? `；最後一批到期時，一週實際 BTC ${sp(T.moveBTC)}、ETH ${sp(T.moveETH)}` : '';
  const trs = T.rows.map((r, i) => `<tr${r.model === champ ? ' class="hl"' : ''}><td>${i + 1}</td><th>${esc(SHORT[r.model] || r.model)}</th><td>${Number.isFinite(r.pBTC) ? p0(r.pBTC) : '—'}</td><td>${Number.isFinite(r.pETH) ? p0(r.pETH) : '—'}</td><td>${f3(r.brier)}</td></tr>`).join('');
  const noise = w && O ? `<p class="small">這能看出準不準嗎？<strong>還不能。</strong>回測（${esc(O.start.slice(0, 4))} 年起，同樣這 5 個凍結的方法每天只用當天以前的資料）裡，只看 ${w.days} 天的預測時，現在用的方法分數贏「基準」的期間只有 ${p0(w.champ_beats_base)}，跟丟銅板差不多；${w.days} 天裡分數最好的方法，和整段期間最好的方法一樣的只有 ${p0(w.best_matches_long)}。${w56 ? `就算累積到 ${w56.days} 天（8 週），現在用的方法贏基準的期間也只有 ${p0(w56.champ_beats_base)}。` : ''}整段期間平均：現在用的方法 ${f3(O.long_brier.trend_vt)}、基準 ${f3(O.long_brier.baseline)}，幾乎一樣——漲跌本來就很難猜，這個建議的用處是控制放多少、大跌時少虧，不是猜得比較準。</p>` : '';
  return `<details class="fw-box"><summary>${esc(h)}</summary>
    <p class="small">${when}${moves}。每個方法事先說的「一週後會漲的機率」和分數（越低越好；永遠說 50% 的分數是 0.250）：</p>
    <div class="scroll"><table class="bt"><thead><tr><th>名次</th><th>方法</th><th>BTC 說會漲</th><th>ETH 說會漲</th><th>分數</th></tr></thead><tbody>${trs}</tbody></table></div>
    <p class="small">現在用的方法 ${f3(c.brier)}、基準 ${f3(b.brier)}。${K === 1 ? '「說會漲」是那一天的預測。' : '「說會漲」是最後一批的預測，分數是全部天數平均。'}</p>
    ${noise}
    <p class="small muted">只有現在用的方法的建議算數；其他方法要實際累積 8 週、而且明顯比較好，才會換上來（規則沒變）。分數直接從這支手機下載的公開對答案紀錄 <code>ledger/scores.jsonl</code> 算（記錄後不能修改）；回測 backtest/brier_noise.py → data/briernoise.json（資料到 ${esc(O?.end ? closeMD(O.end) : '—')} 說的預測）。研究用途，不是投資建議。</p>
  </details>`;
}
