// v21: 換個設定、換個幣還靈嗎 — numbers copied from forecast/proposals/proto_trend_robustness_results.json (tests check they match).
// Champion trend_vt@1 rule: 300 nearby settings on BTC+ETH, and the frozen rule unchanged on 8 other coins; 2024→ backtest, costs as paper_sim.
export const ROBUST = {"as_of":"2026-11-10","oos_start":"2024-01-01","grid_n":300,"grid_beats_hold":0.9567,"grid_dd_better":1.0,"champ_rank_is":0.7133,"verdict_plateau":"MODERATE","alts":["BNB","XRP","ADA","LTC","DOGE","SOL","LINK","TRX"],"alt_dd_shallower":8,"alt_sharpe_gt_hold":4,"alt_rule_dd":[-0.3432,-0.2319],"alt_hold_dd":[-0.8829,-0.5111],"basket_rule_cagr":0.1014,"basket_hold_cagr":0.1687,"verdict_oou":"MIXED"};
const pc0 = x => `${Math.round(x * 100)}%`;
const pc1 = x => `${(x * 100).toFixed(1)}%`;
/** One plain line for the advanced 「預測模型與自我改善機制」 card. */
export function robustLine(X = ROBUST) {
  if (!X?.grid_n || !X?.alts?.length) return '';
  const y = X.oos_start.slice(0, 4), n = X.alts.length, ddAll = X.alt_dd_shallower === n;
  const notPicked = X.champ_rank_is < 0.95 ? '現在用的設定排在中上、不是挑出來的最好那組；' : '';
  const ret = X.alt_sharpe_gt_hold > n / 2 ? `報酬穩定度 ${X.alt_sharpe_gt_hold} 個幣比抱著好` : `但報酬穩定度只有 ${X.alt_sharpe_gt_hold} 個幣比抱著好`;
  const concl = ddAll && X.grid_dd_better === 1 && X.alt_sharpe_gt_hold <= n / 2 + 1 ? '<strong>結論：它可靠的用處是大跌時少虧，不是多賺。</strong>' : '';
  return `<p id="robust"><strong>換個設定、換個幣還靈嗎</strong>：把冠軍規則的 4 個設定各往上下調（共 ${X.grid_n} 組），${y} 年起回測（到 ${X.as_of}）${pc0(X.grid_beats_hold)} 的組合賺得比一直抱著穩、${pc0(X.grid_dd_better)} 最慘跌幅比抱著小，${notPicked}原封不動拿去 ${n} 個別的幣（${X.alts.join('、')}），${ddAll ? `${n} 個幣` : `${X.alt_dd_shallower} 個幣`}最慘跌幅都變小（${pc0(X.alt_rule_dd[1])}～${pc0(X.alt_rule_dd[0])}，一直抱著 ${pc0(X.alt_hold_dd[1])}～${pc0(X.alt_hold_dd[0])}），${ret}，${n} 幣平均年化 ${pc1(X.basket_rule_cagr)}（抱著 ${pc1(X.basket_hold_cagr)}）。${concl}這 ${n} 個是今天還在的大幣，已經下市的幣不在裡面。</p>`;
}
