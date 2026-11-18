// v82 (2026-11-19): 預測成績單「一眼看懂」— the homepage scorecard shows only the record line, the two virtual portfolios and
// ONE plain sentence (who leads, why it doesn't count yet, how long until it does); every longer explanation (猜對率、回測、
// 成本、為什麼還不算數) moves into a collapsed 「這些數字怎麼看」 block, word for word as before. Nothing is removed or recomputed.
// Basis: Agnew & Szykman 2005 J. Behav. Finance 6(2):57–70 (doi 10.1207/s15427579jpfm0602_2, information overload);
// Beshears, Choi, Laibson & Madrian 2011 in Explorations in the Economics of Aging, 75–96 (doi 10.7208/chicago/9780226903385.003.0003,
// simplified summary disclosure); Loewenstein, Sunstein & Golman 2014 Annu. Rev. Econ. 6:391–419 (doi 10.1146/annurev-economics-080213-041341).

/** Visible record line. ch = LIVE.track.champion, firstMD = closeMD(first), nDays = live days so far. */
export function recordLine(ch, firstMD, nDays, firstAnswerMD) {
  if (!ch) return '';
  const n = ch.n_forecasts || 0, ns = ch.scores?.n || 0;
  const ans = ns ? `已對答案 ${ns} 筆` : `第一次對答案在 ${firstAnswerMD || '—'}`;
  return `從 ${firstMD || '—'} 開始每天記錄、記錄後不能修改（第 ${nDays} 天、${n} 筆，兩個幣合計；${ans}）。`;
}

/** One plain sentence under the two virtual portfolios. track = LIVE.track. '' when the portfolios are missing. */
export function brief(track) {
  const c = track?.champion?.paper, b = track?.baseline?.paper, start = track?.paper_start_twd;
  if (!c?.equity || !b?.equity || !start || !(c.days >= 1)) return '';
  const minW = track.min_weeks_for_promotion || 8, days = c.days;
  const span = days >= 7 && days % 7 === 0 ? `${days / 7} 週` : `${days} 天`;
  const cr = c.equity / start - 1, br = b.equity / start - 1;
  const who = Math.abs(cr - br) < 5e-4 ? '兩個差不多' : cr > br ? '照建議暫時領先' : '一直抱著暫時領先';
  const move = br < 0 ? '幣價在跌' : '幣價在漲';
  if (days >= minW * 7) return `${who}（已經 ${span}）。差距是不是靠預測，看下面「這些數字怎麼看」。`;
  return `${who}，但只有 ${span}、這段${move}——短期誰贏主要看漲跌，<strong>還不能說預測準</strong>；至少要 ${minW} 週才開始算數。`;
}

/** Collapsed block holding the longer explanations (inner = existing HTML, unchanged). */
export function more(inner) {
  if (!inner || !inner.trim()) return '';
  return `<details class="fc-more" id="track-more"><summary>這些數字怎麼看（為什麼還不算數、猜對率、回測、成本）</summary>${inner}</details>`;
}
