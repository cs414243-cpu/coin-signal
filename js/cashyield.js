// v48: 空手的錢放銀行活儲，會多多少？ — pure functions (no DOM, no network).
// Every other card and the virtual portfolios count the money that is not in the coin at 0% interest. This card re-runs
// the same frozen rule (trend_vt@1) with that money earning Bank of Taiwan's posted passbook-savings rate (台灣銀行 活期
// 儲蓄存款 機動, 中央銀行統計資料庫 EG2WM01, monthly) — backtest/cash_yield.py → data/cashyield.json. Not a signal, not a
// forecast, not a product recommendation; it only shows how much the "waiting" money can earn and whether it changes
// 照建議 vs 一直抱著.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
export const NT = 1_000_000;
const pt = x => Number.isFinite(x) ? `${(x * 100).toFixed(1)}` : '—';             // percentage points, 1 decimal
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const rt = r => Number.isFinite(r) ? `${r.toFixed(3).replace(/0$/, '')}%` : '—';     // 0.825% / 1.225%
const nt = n => Number.isFinite(n) ? `NT$${Math.round(n).toLocaleString('en-US')}` : '—';
const ym = s => { const [y, m] = String(s || '').split('-'); return y && m ? `${y} 年 ${Number(m)} 月` : '—'; };

/** Interest one week of waiting earns on NT$1,000,000 set aside for a coin (same formula as cash_yield.py current.week_interest). */
export const weekInterest = (exposure, ratePct) => Math.round(NT * (1 - exposure) * ratePct / 100 * 7 / 365);

/** Exposure to use: the official recommendation (live.json) when it is for the file's day, else the file's. */
export function nowExposure(CY, c, LIVE) {
  const L = LIVE?.coins?.[c], C = CY?.coins?.[c]?.current;
  if (L && Number.isFinite(L.exposure)) return L.exposure;
  return C ? C.exposure : null;
}

/** One plain line inside 「看 X 的細節」. '' when the file is missing or the coin is fully invested. */
export function detailLine(c, CY, LIVE) {
  const C = CY?.coins?.[c]; const O = C?.periods?.oos; const r = C?.current?.rate;
  const e = nowExposure(CY, c, LIVE);
  if (!C || !O || !Number.isFinite(r) || !Number.isFinite(e) || e >= 0.995) return '';
  const wk = weekInterest(e, r);
  const flip = O.flips ? '算進利息後，跟一直抱著比誰好會改變' : '不會改變跟一直抱著比誰好';
  return `沒放進 ${c} 的錢（現在 ${pc0(1 - e)}）可以先放在隨時能領的銀行活儲：台灣銀行活儲年利率 ${rt(r)}（${ym(C.current.rate_month)}牌告），打算放 ${c} 的每 100 萬台幣，等一週約 ${nt(wk)} 利息。`
    + `2023 年起照建議平均 ${pc0(O.cash_share)} 的錢沒放，算進活儲利息一年多約 ${pt(O.extra)} 個百分點，${flip}；不算稅和轉帳手續費。`;
}

function row(lab, B, showCash) {
  if (!B) return `<tr><th>${lab}</th><td colspan="5">—</td></tr>`;
  return `<tr><th>${lab}</th>${showCash ? `<td>${pc0(B.cash_share)}<div class="muted small">利率平均 ${rt(B.avg_rate)}</div></td>` : ''}`
    + `<td>${pc1(B.zero.cagr)}</td><td><strong>${pc1(B.bank.cagr)}</strong><div class="muted small">多 ${pt(B.extra)} 點</div></td>`
    + `<td>${pc1(B.hold.cagr)}</td><td>${pc1(B.bank.max_dd)}<div class="muted small">抱著 ${pc1(B.hold.max_dd)}</div></td></tr>`;
}
function table(name, P, showCash) {
  const head = `<tr><th>${name}</th>${showCash ? '<th>平均沒放的錢</th>' : ''}<th>照建議<div class="muted small">沒放的錢 0%</div></th><th>照建議<div class="muted small">沒放的錢放活儲</div></th><th>一直抱著</th><th>最慘時少<div class="muted small">照建議＋活儲</div></th></tr>`;
  return `<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${row('2018–22', P.is, showCash)}${row('2023 起', P.oos, showCash)}${row('最近一年', P.last365, showCash)}</tbody></table></div>`;
}

/** Advanced card 「空手的錢放哪」. */
export function cashYieldCard(CY, LIVE) {
  const id = 'cashyield', h2 = '空手的錢放銀行活儲，會多多少';
  if (!CY?.coins?.BTC || !CY?.coins?.ETH || !CY?.mix) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const B = CY.coins.BTC, E = CY.coins.ETH, M = CY.mix, R = CY.rate_source;
  const eB = nowExposure(CY, 'BTC', LIVE), eE = nowExposure(CY, 'ETH', LIVE), r = B.current.rate;
  const wkMix = Math.round(weekInterest(eB, r) / 2 + weekInterest(eE, r) / 2);
  const anyFlip = ['is', 'oos', 'last365'].some(k => B.periods[k]?.flips || E.periods[k]?.flips || M.periods[k]?.flips);
  const now = `<p><strong>現在</strong>：BTC 建議放 ${pc0(eB)}、ETH ${pc0(eE)}，所以打算投入的錢有 ${pc0(1 - (eB + eE) / 2)} 沒放（兩幣各一半算）。台灣銀行活儲年利率 ${rt(r)}（${ym(B.current.rate_month)}牌告，中央銀行最新公布到 ${ym(R.last_month)}）：<strong>每 100 萬台幣等一週約 ${nt(wkMix)}、整年都沒放約 ${nt(B.current.year_interest_full_cash)}</strong>。</p>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">這個 App 其他卡片和虛擬投資都把「沒放進幣裡的錢」當成 0 利息。這個方法常常空手或只放一部分，所以重算一次：同一套建議、同樣的手續費，只是沒放的錢放在隨時能領的台灣銀行活儲（用每個月的實際牌告利率）。</p>
    ${now}
    ${table('BTC', B.periods, true)}${table('ETH', E.periods, true)}${table('各一半', M.periods, false)}
    <p class="small"><strong>重點</strong>：① 2023 年起照建議平均有 ${pc0(B.periods.oos.cash_share)}（BTC）／${pc0(E.periods.oos.cash_share)}（ETH）的錢沒放，活儲利息讓年化多 ${pt(B.periods.oos.extra)}／${pt(E.periods.oos.extra)} 個百分點（2018–22 活儲利率平均只有 ${rt(B.periods.is.avg_rate)}，只多 ${pt(B.periods.is.extra)}／${pt(E.periods.is.extra)} 點）。② ${anyFlip ? '有的期間算進利息後，跟一直抱著比誰好會改變（看上表）。' : '<strong>不會改變跟一直抱著比誰好</strong>：差距主要還是來自幣價漲跌，利息只是小加分。'} ③ 錢放在交易所等待沒有利息，還多一層交易所出事的風險；這裡用銀行活儲當比較基準，因為它可以隨時領、不用承擔價格風險。定存利率比較高，但要綁約，空手常常只有幾天（見「空手要等多久」），提前解約利息會打折，所以這裡不用定存算。</p>
    <p class="small muted">算法：<code>backtest/cash_yield.py</code> → <code>data/cashyield.json</code>（Binance 已收完日K，${asofInline(CY.as_of)}，${WEEKLY_NOTE}；定義事先固定在程式說明）。利率來源：中央銀行統計資料庫「銀行業利率」月資料（EG2WM01，台灣銀行 活期儲蓄存款 機動），每天依那個月的牌告利率按日計息；中央銀行還沒公布的月份沿用最後一個月。每天照冠軍建議比例調整，買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同）；沒放的錢設成 0% 時和其他卡片完全相同。沒算利息所得稅、銀行和交易所之間的轉帳手續費與時間、台幣美元匯率。2022 年以前是這套規則設定時看過的期間。這是過去紀錄，不是預測，也不是推薦任何金融商品。</p>
  </section>`;
}
