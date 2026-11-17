// v69: 換個收盤時間還靈嗎 — numbers copied from forecast/proposals/proto_close_hour_check.json (tests check they match).
// Frozen champion formula on daily closes taken at each of the 24 hours (Binance 1h bars), 2022→, costs as paper_sim.
// Basis: Hoffstein, Sibears & Faber 2019 J. Index Investing 10(1):27-36 (rebalance timing luck). Research only; changes nothing.
export const CLOSEHOUR = {"as_of":"2026-11-15","n":24,"full_beat_hold":24,"full_dd_shallower":24,"rule_dd":[-0.2398,-0.1842],"hold_dd":[-0.6925,-0.6817],"h0_oos_cagr":0.1589,"oos_cagr_med":0.1231,"oos_cagr_min":0.1068,"oos_worst_taipei":"19:00","h0_rank_oos":1,"h0_rank_is":19,"tr_oos_cagr":0.1258,"tr_oos_dd":-0.2079,"verdict":"not_special","luck":"small"};
const pc0 = x => `${x < 0 ? '−' : ''}${Math.abs(Math.round(x * 100))}%`;
const pc1 = x => `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
/** One plain line for the advanced 「預測模型與自我改善機制」 card (under 換個設定、換個幣還靈嗎). */
export function closeHourLine(X = CLOSEHOUR) {
  if (!X?.n || !Array.isArray(X.rule_dd)) return '';
  const all = X.full_beat_hold === X.n && X.full_dd_shallower === X.n;
  const head = all ? `${X.n} 個時間點<strong>全部</strong>比一直抱著穩、` : `${X.n} 個時間點有 ${Math.min(X.full_beat_hold, X.full_dd_shallower)} 個比一直抱著穩、`;
  const lucky = X.h0_rank_oos <= 3 && X.h0_oos_cagr > X.oos_cagr_med;
  const luck = lucky ? `但按「賺得穩不穩」排名，2024 年起 8 點剛好是 ${X.n} 個裡第 ${X.h0_rank_oos} 名（一年平均 ${pc1(X.h0_oos_cagr)}；${X.n} 個時間點的中間值 ${pc1(X.oos_cagr_med)}、最差 ${pc1(X.oos_cagr_min)}〔${X.oos_worst_taipei}〕），2022–23 年 8 點卻排第 ${X.h0_rank_is} 名——<strong>2024 年起的回測成績有一部分是「8 點」這個時間點的運氣，別把 ${pc1(X.h0_oos_cagr)} 當成以後的正常值，中間值 ${pc1(X.oos_cagr_med)} 比較有代表性。</strong>`
    : `按「賺得穩不穩」排名，2024 年起 8 點是 ${X.n} 個裡第 ${X.h0_rank_oos} 名（一年平均 ${pc1(X.h0_oos_cagr)}，中間值 ${pc1(X.oos_cagr_med)}），8 點不算特別幸運。`;
  return `<p id="closehour"><strong>換個收盤時間還靈嗎</strong>：建議是用每天早上 8 點的收盤價算的。如果把「一天結束」改成其他 ${X.n - 1} 個整點，同一套規則 2022 年起回測（到 ${X.as_of}，扣成本）${head}最慘跌幅 ${pc0(X.rule_dd[0])}～${pc0(X.rule_dd[1])}（一直抱著 ${pc0(X.hold_dd[0])}～${pc0(X.hold_dd[1])}）。${luck}如果把錢分成 ${X.n} 份、每份用不同時間點，2024 年起一年平均 ${pc1(X.tr_oos_cagr)}、最慘 ${pc0(X.tr_oos_dd)}。這只是檢查，不改建議、也不改時間。</p>`;
}
