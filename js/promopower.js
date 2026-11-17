// v78: 「8 週的實際對答案，分得出哪個方法比較好嗎？」— a collapsible block at the end of the v53 每週檢討 card.
// Numbers come only from data/promopower.json (backtest/promo_power.py, pre-registered, commit b74e3ca): the frozen
// walk-forward caches of the 5 registered models (each day uses only data up to that day), replaying the LIVE part of the
// unchanged promotion rule (forecast/review_weekly.RULES) on every 56-day window since 2022 (start every 7 days), costs
// included. Nothing here changes the rule, the ledger or the recommendation. Pure functions; no DOM writes.
// Research only, not investment advice.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p0 = x => `${Math.round(x * 100)}%`;
const p1 = x => `${(x * 100).toFixed(1)}%`;
const md = s => { const d = new Date(s + 'T00:00:00Z'); return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const NAME = { 'baseline@1': '永遠全放（對照組）', 'knn@1': '找相似的過去（knn）', 'tsmom@1': '看過去漲跌趨勢（tsmom）', 'logit@1': '統計迴歸（logit）' };
export const ORDER = ['baseline@1', 'knn@1', 'tsmom@1', 'logit@1'];

const range = (xs, f) => { const v = xs.map(f).filter(Number.isFinite); return v.length ? [Math.min(...v), Math.max(...v)] : null; };

/** Plain headline by pre-registered verdict (+ which live passes happened, all from the file). */
export function headline(P) {
  const n = P.n_windows, full = P.any_full_pass;
  const lp = ORDER.filter(m => P.cands[m].n_live_pass > 0).map(m => `${NAME[m]} ${P.cands[m].n_live_pass} 段（${P.cands[m].live_pass_windows.map(s => s.slice(0, 7).replace('-', '/')).filter((x, i, a) => a.indexOf(x) === i).join('、')} 開始）`);
  const fullTxt = full === 0 ? `整套規則一次都沒有讓挑戰者換上來` : `整套規則有 ${full} 段會讓挑戰者換上來`;
  const liveTxt = lp.length ? `；只看實際對答案那三關，誤過的只有 ${lp.join('、')}，被「回測不能比較差」那關擋下` : '；只看實際對答案那三關，也一次都沒有誤過';
  const lead = P.verdict === 'strict' ? '不太會換錯' : P.verdict === 'loose' ? '要小心' : '大致擋得住';
  return `${lead}：用 2022 年起每一段 8 週（共 ${n} 段）重演一次「換方法」的規則，${fullTxt}${liveTxt}。${ORDER.length} 個挑戰者全期的賺賠比都比現在用的差，所以沒換是對的。`;
}

/** The whole block ('' when data missing or malformed). */
export function block(P) {
  if (!P || !P.cands || !ORDER.every(m => P.cands[m])) return '';
  const C = ORDER.map(m => P.cands[m]);
  const pers = range(C, c => c.persist_brier), mde = range(C, c => c.mde_brier), gap = range(C, c => Math.abs(c.full_brier_gap)), bok = range(C, c => c.brier_ok);
  const rows = ORDER.map(m => { const c = P.cands[m]; return `<tr><td>${esc(NAME[m])}</td><td>${p0(c.brier_lead)}</td><td>${c.persist_brier == null ? '—' : p0(c.persist_brier)}</td><td>${p1(c.brier_ok)}</td><td>${c.n_live_pass}／${P.n_windows}</td></tr>`; }).join('');
  return `<details class="pp" id="promopower"><summary>8 週的實際對答案，分得出哪個方法比較好嗎？</summary>
    <p>${esc(headline(P))}</p>
    <p>但「這 8 週誰比較準」本身很像擲銅板：某個方法這 8 週預測比較準，下一個 8 週還比較準的只有 ${p0(pers[0])}～${p0(pers[1])}。要在 8 週裡看得出差別，準度（Brier 分數，越低越準）大約要差 ${mde[0].toFixed(3)}～${mde[1].toFixed(3)}，實際上各方法全期只差 ${gap[0].toFixed(4)}～${gap[1].toFixed(4)}。所以除非出現明顯好很多的新方法，短期內大概不會換——這是刻意保守，<strong>尚未證實</strong>哪個挑戰者比較好。</p>
    <p class="small"><strong>對你來說：</strong>從 11/18 早上 8 點開始實際對答案，前幾週成績單上誰領先都不代表什麼；照首頁現在用的方法就好。</p>
    <div class="scroll"><table class="bt"><thead><tr><th>挑戰者</th><th>8 週比現在用的準</th><th>下一個 8 週還比較準</th><th>只看「明顯比較準」那一關就過了</th><th>全部實際關卡都過</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">只看「預測明顯比較準」一關，就有 ${p1(bok[0])}～${p1(bok[1])} 的段落誤過（連全期明顯比較不準的方法也會），所以規則要同時過準度、賺賠比、最大虧損三關＋回測不比較差。</p>
    <p class="small muted">算法：<code>backtest/promo_power.py</code> → <code>data/promopower.json</code>（事先登記，第一次執行前 commit）。讀 5 個已註冊方法凍結的逐日回測紀錄（每天只用當天以前的資料），${md(P.first)}～${md(P.as_of)}、每 7 天開始一段 56 天（共 ${P.n_windows} 段，不重疊 ${P.n_nonoverlap} 段），每段照原規則（${P.rules.k} 個挑戰者 → 機率門檻 ${P.threshold}、7 天區塊重抽 ${P.rules.boot_reps} 次、最大虧損最多差 ${Math.round(P.rules.live_dd_margin * 100)} 個百分點）重演；虛擬投資每段從 NT$100 萬重新開始，買賣各扣 0.15%、買進再扣台幣溢價 0.27%。「看得出差別」＝80% 機率、雙邊 5% 的常態近似。資料到 ${md(P.as_of)}（之後的一週結果還沒揭曉；這是歷史統計，多幾週幾乎不變，不會每週自動重算）；換方法的規則、帳本、首頁建議都沒有改。</p>
  </details>`;
}
