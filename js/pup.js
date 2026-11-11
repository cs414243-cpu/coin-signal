// v11: the champion's weekly p_up is no better than a constant 50%
// (P-pup-calibration: 2024-onwards Brier 0.2523 vs 0.2500 for a constant 50%).
// Homepage says so in plain language; the raw number lives only under 進階（可不看）.
export const DIR_TEXT = '漲跌方向：約一半一半，無法預測';

export function pctUp(p) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return '—';
  return `${Math.round(Number(p) * 100)}%`;
}

export function advNote(live) {
  const parts = [];
  for (const c of ['BTC', 'ETH']) {
    const p = live?.coins?.[c]?.p_up;
    if (p === null || p === undefined || Number.isNaN(Number(p))) continue;
    parts.push(`${c} ${pctUp(p)}`);
  }
  const raw = parts.length ? parts.join('、') : '—';
  return `冠軍模型算出的一週上漲機率：${raw}。回測顯示這個數字猜漲跌並不比永遠猜 50% 準（2024 年起 Brier 0.2523，永遠猜 50% 是 0.2500），所以首頁改寫成「約一半一半，無法預測」。`;
}
