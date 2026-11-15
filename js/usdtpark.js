// v52: 空手的錢：留在 USDT，還是換回台幣？ — pure functions (no DOM, no network).
// When the rule says 空手 the coin is sold into USDT. This card compares, on every real 空手 period of the frozen champion
// (trend_vt@1) since 2019: (A) leave the USDT on the exchange (its NT$ value moves with MAX USDT/TWD) vs (B) sell it for
// NT$, keep it in the bank (台灣銀行活儲機動牌告利率) and buy USDT back when the rule buys back (round trip = 2 × MAX VIP0
// taker fee + bid/ask spread). backtest/usdt_park.py → data/usdtpark.json (definitions fixed before the first run).
// Not a forecast of the exchange rate and not a product recommendation. Exchange / stablecoin failure risk is NOT in the
// numbers and is said in words.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => Number.isFinite(x) ? `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc2 = x => Number.isFinite(x) ? `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(2)}%` : '—';
const pa2 = x => Number.isFinite(x) ? `${(x * 100).toFixed(2)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const rt = r => Number.isFinite(r) ? `${r.toFixed(3).replace(/0$/, '')}%` : '—';
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const EPS = 0.005;

/** Is the coin 空手 now? Official recommendation (live.json) first, else the file. */
export function isFlat(UP, c, LIVE) {
  const L = LIVE?.coins?.[c];
  if (L && Number.isFinite(L.exposure)) return L.exposure < EPS;
  const C = UP?.coins?.[c]?.current; return C ? !!C.flat : null;
}

/** One plain line inside 「看 X 的細節」. '' unless the coin is 空手 and the file is there. */
export function detailLine(c, UP, LIVE) {
  const A = UP?.pooled?.all?.any, S = UP?.pooled?.all?.short;
  if (!A?.n || !S?.n || !UP.round_trip || isFlat(UP, c, LIVE) !== true) return '';
  return `空手的錢（USDT）要不要換回台幣：換回去、之後再換回 USDT 要付約 ${pa2(UP.round_trip.rt)}，活儲利息要放約 ${Math.round(UP.break_even_days)} 天才賺得回來。`
    + `2019 年起 ${A.n} 次空手，換回台幣比較划算的只有 ${pc0(A.b_better)}（7 天內結束的 ${S.n} 次只有 ${pc0(S.b_better)}）；留 USDT 的台幣價值這段期間在 ${pc1(A.a_min)}～${pc1(A.a_max)} 之間變動。主要差別是交易所風險，見進階。`;
}

const LAB = { short: '7 天內結束', mid: '8～30 天', long: '超過 30 天', any: '全部' };
function row(k, G) {
  if (!G?.n) return `<tr><th>${LAB[k]}</th><td colspan="4">—</td></tr>`;
  return `<tr${k === 'any' ? ' class="hl"' : ''}><th>${LAB[k]}<div class="muted small">${G.n} 次，中間 ${G.days_med} 天</div></th>`
    + `<td>${pc2(G.a_med)}<div class="muted small">${pc1(G.a_min)}～${pc1(G.a_max)}</div></td>`
    + `<td>${pc2(G.b_med)}</td><td><strong>${pc0(G.b_better)}</strong></td><td>${pc0(G.a_big)}</td></tr>`;
}
function table(title, P) {
  return `<h3 class="sub">${title}</h3><div class="scroll"><table class="bt"><thead><tr><th>空手多久</th><th>留 USDT<div class="muted small">台幣價值變化（中間；最差～最好）</div></th><th>換回台幣存活儲<div class="muted small">扣來回成本、加利息（中間）</div></th><th>換回台幣比較好</th><th>留 USDT 變動超過 1%</th></tr></thead>`
    + `<tbody>${['short', 'mid', 'long', 'any'].map(k => row(k, P[k])).join('')}</tbody></table></div>`;
}
function nowLine(UP, c, LIVE) {
  const C = UP.coins?.[c]?.current; const flat = isFlat(UP, c, LIVE);
  if (!C) return `${c}：—`;
  if (flat !== true) return `${c}：現在有放一部分，沒有空手中的 USDT 要決定。`;
  if (!C.spell_start || !Number.isFinite(C.a_sofar)) return `${c}：空手中（還沒有 USDT 台幣價格可以比）。`;
  return `${c}：${closeMD(C.spell_start)} 早上 8 點收盤賣出、已空手 ${C.days} 天。如果一直留 USDT，台幣價值 <strong>${pc2(C.a_sofar)}</strong>（USDT ${C.u0.toFixed(2)} → ${C.u_last.toFixed(2)} 台幣，${closeMD(C.u_last_date)} 收盤）；如果當時換回台幣存活儲，扣掉來回成本是 ${pc2(C.b_sofar)}。`;
}

/** Advanced card. */
export function usdtParkCard(UP, LIVE) {
  const id = 'usdtpark', h2 = '空手的錢：留在 USDT，還是換回台幣？';
  if (!UP?.pooled?.all?.any?.n || !UP?.coins?.BTC || !UP?.coins?.ETH) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const P = UP.pooled, A = P.all.any, S = P.all.short, L = P.all.long, O = P.oos.any, R = UP.round_trip, F = UP.fx, U = UP.u_last;
  const rate = UP.coins.BTC.current.rate;
  const fx = h => `${pc1(F[h].all.p10)}～${pc1(F[h].all.p90)}`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">建議變成空手時，幣會賣成 USDT（跟美元 1:1 的穩定幣）。接下來有兩個選擇：<strong>A 留在交易所當 USDT</strong>，等建議買回時直接用；<strong>B 賣成台幣存銀行活儲</strong>，買回時再換一次 USDT。這張卡用這套建議過去每一次真的空手，算兩種做法差多少。</p>
    <p><strong>結論</strong>：只看錢，<strong>大多數時候留 USDT 比較省</strong>——換回台幣再換回來要付約 ${pa2(R.rt)}，台灣銀行活儲 ${rt(rate)} 的利息要放約 ${Math.round(UP.break_even_days)} 天才補得回來，但空手的中間值只有 ${A.days_med} 天。2019 年起 ${A.n} 次空手，換回台幣比較好的只有 <strong>${pc0(A.b_better)}</strong>（2023 年起 ${O.n} 次：${pc0(O.b_better)}）。換回台幣真正的好處是<strong>不用承擔交易所和穩定幣出事的風險</strong>，這個數字算不出來。</p>
    <p class="small"><strong>現在</strong>：${nowLine(UP, 'BTC', LIVE)}<br>${nowLine(UP, 'ETH', LIVE)}</p>
    ${table(`2019 年起每一次空手（BTC、ETH 合計 ${A.n} 次）`, P.all)}
    <p class="small muted">「換回台幣比較好」＝扣掉來回成本、加上活儲利息後，B 拿回的台幣比 A 多。成本加倍（${pa2(2 * R.rt)}）時這個比例是 ${pc0(A.b_better_2rt)}。</p>
    <h3 class="sub">留 USDT 等於拿著美元：台幣價值會上下動</h3>
    <p class="small">2019 年起任何一天開始拿著 USDT，10 次有 8 次的台幣價值變化落在：一週後 ${fx('7')}、一個月後 ${fx('30')}、三個月後 ${fx('91')}。所以空手很久時（超過 30 天的 ${L.n} 次），留 USDT 的結果主要看美元對台幣怎麼走（${pc1(L.a_min)}～${pc1(L.a_max)}，換回台幣比較好的 ${pc0(L.b_better)}），<strong>開始空手時沒辦法知道會等多久，也沒辦法預測匯率</strong>。MAX 的 USDT 價格現在比銀行間美元匯率高 ${pc1(U.premium)}（${closeMD(U.date)} 收盤 ${U.close.toFixed(2)} vs ${U.yahoo_date.slice(5).replace('-', '/')} 美元 ${U.yahoo.toFixed(2)}），大跌時常常更高。</p>
    <p class="small"><strong>重點</strong>：① 空手常常幾天就結束（7 天內結束的 ${S.n} 次，換回台幣比較好的只有 ${pc0(S.b_better)}），來回換匯不划算。② 錢多、或打算很久不買回時，<strong>交易所倒閉、凍結提領或 USDT 脫鉤</strong>的風險可能比 0.3% 成本更重要：2022 年 FTX 倒閉時客戶的錢被凍住。放不放在交易所是你的風險選擇，這張卡不替你決定。③ 不管選哪個，都不影響建議的比例和翻轉價。</p>
    <p class="small muted">算法：<code>backtest/usdt_park.py</code> → <code>data/usdtpark.json</code>（Binance 已收完日K，${asofInline(UP.as_of)}，${WEEKLY_NOTE}；定義在第一次執行前固定在程式說明）。空手＝冠軍 trend_vt@1 建議 &lt; 0.5%（凍結公式，與每日預測每一天相同）；從賣出那天早上 8 點收盤，到買回那天早上 8 點收盤。留 USDT＝MAX USDT/台幣日K收盤的變化（同樣是早上 8 點）；換回台幣＝扣一次來回成本（MAX 一般會員吃單手續費 ${pa2(R.fee_taker)} × 2＋買賣價差 ${pa2(R.spread)}，${R.snapshot.slice(0, 10)} 掛單快照），再加台銀活儲機動牌告利率按日計息（中央銀行 EG2WM01）。只算 2019 年起（2018 年 MAX 報價只到 0.1 台幣、有錯價）；USDT 價格離 Yahoo 美元匯率超過 3% 的日子當作可疑，開始或結束在這種日子的 ${UP.coins.BTC.n_excluded + UP.coins.ETH.n_excluded} 次不算（算進去結論一樣）。沒算銀行和交易所之間的轉帳手續費與時間、稅、交易所的 USDT 理財利息。這是過去紀錄，不是匯率預測，也不是推薦任何金融商品。</p>
  </section>`;
}
