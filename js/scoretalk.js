// v64 (2026-11-16): 預測成績單「對答案」那一句的白話版 — 第一批實盤預測 11/18 早上 8 點到期之前做好。
// 冠軍的一週上漲機率幾乎都在 45%～55%（首頁本來就寫「漲跌方向：約一半一半，無法預測」），這時「猜對漲跌 X%」只是運氣，
// 不能拿來判斷準不準。這裡只用 live.json 的 track.champion.scores（run_daily.py → engine.summarize_scores，從公開帳本
// scores.jsonl 算出）：calibration 每一組的 bin／n，找出已對答案的預測說的上漲機率落在哪個範圍。
// 全部落在 40%～60% 之內 → 白話說明「等於說一半一半、猜對率主要是運氣，請看價格範圍和虛擬投資」；
// 有任何一筆 < 40% 或 ≥ 60% → 保留原本的句子（那時「猜漲跌」才有一點意義）。沒有任何已評分 → null（呼叫端沿用「第一批要到 … 才能對答案」）。
const p0 = x => `${Math.round(x * 100)}%`;

/** Range of stated p_up among scored forecasts, from summarize_scores().calibration bins ('0.45-0.50'). null if unknown. */
export function scoredRange(S) {
  const B = (S?.calibration || []).filter(b => b.n > 0).map(b => b.bin.split('-').map(Number));
  if (!B.length || B.some(x => x.length !== 2 || x.some(v => !Number.isFinite(v)))) return null;
  return { lo: Math.min(...B.map(x => x[0])), hi: Math.max(...B.map(x => x[1])) };
}

/** The sentence after 「…記錄後不能修改。」 in 預測成績單. S = champion scores summary, B = baseline scores summary. */
export function hitIntro(S, B) {
  const n = S?.n || 0;
  if (!n || S.hit == null) return null;
  const base = B?.hit != null ? `（一直猜「會漲」是 ${p0(B.hit)}）` : '';
  const r = scoredRange(S);
  if (r && r.lo >= 0.4 - 1e-9 && r.hi <= 0.6 + 1e-9) {
    return `已經對答案 ${n} 筆（兩個幣合計）。這些預測說的上漲機率都在 ${p0(r.lo)}～${p0(r.hi)} 之間，等於說「一半一半」，所以猜對漲跌 <strong>${p0(S.hit)}</strong>${base}主要是運氣，不能用來判斷準不準；比較該看的是下面「一週價格範圍」有沒有說中，和虛擬投資少虧多少。`;
  }
  return `已經有 ${n} 次到期可以對答案，猜對漲跌 <strong>${p0(S.hit)}</strong>${base}。`;
}

/** Note for the weekly-review card: its 「已對答案」 count is from Monday; the ledger has moved on since. '' if nothing newer. */
export function reviewLag(reviewDateMD, reviewScoredRows, liveScoredRows) {
  if (!(liveScoredRows > (reviewScoredRows || 0))) return '';
  return `（這是 ${reviewDateMD} 檢討當時的數字；到現在首頁的冠軍已對答案 ${liveScoredRows} 筆（兩個幣合計，見「預測成績單」），下一次週一檢討會更新。）`;
}
