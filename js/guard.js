// v22: 盤中急跌要不要先賣 — numbers copied from forecast/proposals/proto_intraday_guard_results.json (tests check they match).
// 5 pre-registered intraday guards on top of the champion trend_vt@1 (cut during the day, buy back at the next 08:00 close); 2024→ backtest, costs as paper_sim + crash slippage.
export const GUARD = {"as_of": "2026-11-10", "oos_start": "2024-01-01", "n_var": 5, "n_worse": 5, "slip": 0.001, "lead": "kvol2", "lead_label": "跌超過平常一天漲跌的 2 倍就先全賣", "lead_cagr": 0.1001, "champ_cagr": 0.1629, "lead_dd": -0.2056, "champ_dd": -0.1842, "lead_2022": 0.0357, "btc5_n": 37, "btc5_lower": 0.351, "eth5_n": 95, "eth5_lower": 0.389, "promising": false};
const pc0 = x => `${Math.round(x * 100)}%`;
const pc1 = x => `${(x * 100).toFixed(1)}%`.replace('-', '−');
/** One plain line for the advanced 「盤中離翻轉價多遠」 card. */
export function guardLine(X = GUARD) {
  if (!X?.n_var || !X?.lead_label) return '';
  const y = X.oos_start.slice(0, 4), all = X.n_worse === X.n_var;
  const res = all ? `${X.n_var} 種<strong>全部比照規則等到收盤差</strong>` : `${X.n_worse} 種比照規則等到收盤差`;
  const why = X.btc5_lower < 0.5 && X.eth5_lower < 0.5
    ? `原因是急跌之後到早上 8 點收盤，價格多半沒有繼續跌：2024 年起比前一天跌 5% 時賣掉，收盤反而更低的只有 BTC ${pc0(X.btc5_lower)}（${X.btc5_n} 次）、ETH ${pc0(X.eth5_lower)}（${X.eth5_n} 次），常常是賣在低點、隔天又買回，還多付手續費。` : '';
  const ex2022 = X.lead_2022 > 0 ? `只有 2022 年大跌那一年有幫上一點忙。` : '';
  const concl = all && !X.promising ? '<strong>結論：盤中急跌不要慌著先賣，等早上 8 點的建議再動。</strong>' : '';
  return `<p id="guard" class="small"><strong>盤中急跌要不要先賣</strong>：事先登記 ${X.n_var} 種「盤中跌太多就先賣、下一個早上 8 點再照建議買回」的做法（比前一天收盤跌 5%／8%、跌超過平常一天漲跌的 2 倍、盤中跌破翻轉價、從盤中最高點回落 6%），${y} 年起回測（到 ${X.as_of}，扣手續費，急跌時賣出再多算 ${(X.slip * 100).toFixed(1)}% 價差），${res}。2022–23 年表現最好的「${X.lead_label}」：年化 ${pc1(X.lead_cagr)}（照規則 ${pc1(X.champ_cagr)}）、最慘跌幅 ${pc1(X.lead_dd)}（照規則 ${pc1(X.champ_dd)}），連少虧都沒做到。${ex2022}${why}${concl}這是回測，不保證未來。</p>`;
}
