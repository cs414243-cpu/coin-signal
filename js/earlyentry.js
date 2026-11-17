// v77: 盤中已經漲過翻轉價，要不要先買、不等早上 8 點收盤？ — data/earlyentry.json ← backtest/early_entry.py (definitions
// committed before the first run 47a0b1e; IS-only result 0915ef7 before any 2024+ number). Buy-side mirror of v22 guard.
// Not a signal; the recommendation is unchanged. Pure functions (no DOM, no network).
const pc1 = x => `${(x * 100).toFixed(1)}%`.replace('-', '−');
const pc0 = x => `${Math.round(x * 100)}%`;
const f3 = x => x.toFixed(2);
export const VARS = ['up_any', 'up_zero', 'up_buf2'];
export const CH = 'trend_vt@1';
export const HEAD = {
  early_better: '過去盤中先買比較好，但這只是回測、還沒經過 8 週實盤，規則不改。',
  wait_better: '過去盤中先買比較差：<strong>等早上 8 點收盤、看建議再買。</strong>',
  unclear: '過去盤中先買沒有比較好（差不多或更差）：<strong>照規則等早上 8 點收盤再買就好。</strong>',
};
export const HOME = {
  early_better: '過去回測盤中先買略好，但未經實盤驗證；規則仍以收盤為準。',
  wait_better: '過去盤中先買比等收盤差，等 8 點收盤再照建議做。',
  unclear: '過去盤中先買沒有比等收盤好，等 8 點收盤再照建議做就好。',
};

export function valid(D) {
  const ok = m => ['IS', 'OOS'].every(p => Number.isFinite(D?.[p]?.[m]?.pooled?.sharpe) && Number.isFinite(D?.[p]?.[m]?.pooled?.maxdd) && Number.isFinite(D?.[p]?.[m]?.pooled?.cagr));
  const ev = D?.event_study?.oos;
  return !!D && D.verdict in HEAD && ok(CH) && VARS.every(ok) && VARS.includes(D.reference)
    && Number.isFinite(ev?.n) && ev.n > 0 && Number.isFinite(ev?.share_confirmed) && Number.isFinite(ev?.mean_to_close_false);
}

/** One paragraph for the advanced 「盤中離翻轉價多遠」 card. Every number comes from data/earlyentry.json. */
export function earlyLine(D) {
  if (!valid(D)) return '';
  const O = D.OOS, c = O[CH].pooled, row = m => `「${D.labels[m]}」夏普 ${f3(O[m].pooled.sharpe)}、年化 ${pc1(O[m].pooled.cagr)}、最慘跌幅 ${pc1(O[m].pooled.maxdd)}`;
  const ev = D.event_study.oos;
  return `<p id="earlyentry" class="small"><strong>盤中已經漲過翻轉價，要不要先買？</strong>${HEAD[D.verdict]}`
    + `事先登記 3 種「盤中站上翻轉價就先買、早上 8 點收盤再照建議調整」的做法，2024 年起回測（到 ${D.as_of}，扣手續費和台幣溢價，盤中買再多算 ${(D.slippage_extra_per_side * 100).toFixed(1)}% 價差）：照規則等收盤 夏普 ${f3(c.sharpe)}、年化 ${pc1(c.cagr)}、最慘跌幅 ${pc1(c.maxdd)}；`
    + VARS.map(row).join('；') + '。'
    + `原因：2024 年起盤中第一次站上翻轉價的 ${ev.n} 次裡，早上 8 點收盤還站得住的只有 ${pc0(ev.share_confirmed)}；站不住的那 ${pc0(1 - ev.share_confirmed)}，從先買到收盤平均 ${pc1(ev.mean_to_close_false)}，隔天又要賣回、多付一次手續費。`
    + `2022–23 年選出的版本是「${D.labels[D.reference]}」。回測結果，不是保證；每週一重算。</p>`;
}

/** Short extra line on the homepage, only when the live price is ABOVE a flip price that would raise the exposure. */
export function homeHint(D, L) {
  if (!valid(D) || !L?.changed || !(L.crossed || []).some(l => !l.above)) return '';
  return `<p class="live-line small muted" id="early-hint">要不要盤中先買？${HOME[D.verdict]}（2024 年起盤中站上的，收盤只有 ${pc0(D.event_study.oos.share_confirmed)} 還站得住）</p>`;
}
