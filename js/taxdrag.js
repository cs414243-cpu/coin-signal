// v86: 照建議做，在台灣要繳多少稅？稅後還划算嗎？ — pure functions (no DOM, no network).
// backtest/tax_drag.py → data/taxdrag.json: the frozen champion's walk-forward exposures with paper_sim costs, plus a
// moving-average cost basis and Taiwan-style yearly tax on realised 財產交易所得 (losses only offset that income, carried
// 3 years, 所得稅法 §17; tax paid the next 5/31), vs buying once and holding until the end. Definitions committed before
// the first run (aba384c), IS-only result (2e66597) before any 2024+ number. Basis: Jeffrey & Arnott 1993 JPM 19(3):15–25
// (doi 10.3905/jpm.1993.710867); 財政部 114-01-13 書面報告 (個人非經常性買賣 BTC/ETH = 財產交易所得). Not tax advice,
// not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const ntd = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}NT$${Math.abs(Math.round(x)).toLocaleString('en-US')}` : '—';
const sntd = x => Number.isFinite(x) ? `${x > 0 ? '+' : ''}${ntd(x)}` : '—';
export const RK = r => r.toFixed(2);
export const R = (D, p, book, r) => D?.results?.[p]?.[book]?.rates?.[RK(r)];
const rateZh = r => r === 0 ? '不用繳稅' : `${Math.round(r * 100)}%`;

export function valid(D) {
  if (!D || D.is_only || !Array.isArray(D.rates) || !D.verdict || !D.results) return false;
  return ['is_', 'oos'].every(p => ['follow', 'hold'].every(b => D.rates.every(r => Number.isFinite(R(D, p, b, r)?.final) && Number.isFinite(R(D, p, b, r)?.cagr))))
    && D.rates.every(r => ['ahead', 'behind', 'mixed'].includes(D.verdict[RK(r)])) && Number.isFinite(D.head_rate)
    && Number.isFinite(D.results.oos.follow.sale_days_per_year);
}

/** Plain conclusion at the headline rate (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const r = D.head_rate, v = D.verdict[RK(r)];
  const f = R(D, 'oos', 'follow', r), h = R(D, 'oos', 'hold', r), f0 = R(D, 'oos', 'follow', 0), h0 = R(D, 'oos', 'hold', 0);
  const all = D.rates.filter(x => x > 0).map(x => D.verdict[RK(x)]);
  const word = v === 'ahead' ? '<strong>稅後照建議還是比一直抱著多</strong>' : v === 'behind' ? '<strong>稅後照建議反而比一直抱著少</strong>' : '<strong>稅後誰比較多，兩段時間不一致</strong>';
  const allTxt = all.every(x => x === v) ? `稅率 5%～40% 都一樣${v === 'ahead' ? '（2022–23、2024 起兩段都是）' : ''}` : '換個稅率結論不一定一樣（看下表）';
  return `以稅率 ${rateZh(r)} 算，${word}：2024 年起照建議稅後年化 ${pc1(f.cagr)}（稅前 ${pc1(f0.cagr)}），一直抱著到最後才賣稅後 ${pc1(h.cagr)}（稅前 ${pc1(h0.cagr)}）。${allTxt}。`;
}

/** How much the tax takes, per NT$1M, at the headline rate. */
export function dragLine(D) {
  const r = D.head_rate, f = R(D, 'oos', 'follow', r), h = R(D, 'oos', 'hold', r), f0 = R(D, 'oos', 'follow', 0), h0 = R(D, 'oos', 'hold', 0);
  const lead0 = f0.final - h0.final, lead = f.final - h.final;
  return `每 NT$100 萬：照建議 2024 年起要繳約 ${ntd(f.tax_paid)} 的稅，一直抱著（最後一次賣掉才繳）約 ${ntd(h.tax_paid)}。照建議領先的錢從稅前 ${sntd(lead0)} 變成稅後 ${sntd(lead)}——稅會吃掉一部分好處，因為照建議每年都在「賣出」，賺的錢每年就要算；抱著的稅可以等到最後才繳。`;
}

function table(D) {
  const row = r => {
    const f = R(D, 'oos', 'follow', r), h = R(D, 'oos', 'hold', r), fi = R(D, 'is_', 'follow', r), hi = R(D, 'is_', 'hold', r);
    return `<tr${r === D.head_rate ? ' class="hl"' : ''}><th>${rateZh(r)}</th><td>${pc1(f.cagr)}</td><td>${pc1(h.cagr)}</td><td>${ntd(f.tax_paid)}</td><td>${pc1(fi.cagr)}／${pc1(hi.cagr)}</td></tr>`;
  };
  return `<div class="scroll"><table class="bt"><thead><tr><th>你的稅率</th><th>照建議 2024 起稅後年化</th><th>一直抱著稅後</th><th>照建議繳的稅（每 NT$100 萬）</th><th>2022–23 照建議／抱著</th></tr></thead><tbody>${D.rates.map(row).join('')}</tbody></table></div>`;
}

/** How often it sells (every sale is a record to keep) and the realised gain per tax year. */
export function salesLine(D) {
  const F = D.results.oos.follow, yrs = Object.entries(F.realised || {});
  const ys = yrs.map(([y, v]) => `${y} 年 ${sntd(v)}`).join('、');
  return `照建議 2024 年起平均<strong>每年有 ${Math.round(F.sale_days_per_year)} 天會賣出</strong>一些（其中 ${Math.round(F.big_sale_days_per_year)} 天賣超過那個幣的 1%）：轉成空手是賣，波動變大、建議比例變小也是賣。每 NT$100 萬、從 2024 年初開始照做，每年已實現的賺賠（要報稅的部分）：${ys}${yrs.length && yrs[yrs.length - 1][0] === D.as_of.slice(0, 4) ? `（${D.as_of.slice(0, 4)} 年只到 ${+D.as_of.slice(5, 7)}/${+D.as_of.slice(8, 10)}）` : ''}。`;
}

export function you() {
  return `<ul class="facts small">
    <li>在 MAX 等<strong>台灣登記的交易所</strong>賣出 BTC、ETH 賺的錢：財政部說個人「不是經常買賣」時算<strong>財產交易所得</strong>，要併入綜合所得稅，<strong>沒有免稅額度</strong>；賠的可以扣同一年和之後 3 年的財產交易所得。</li>
    <li><strong>最要緊：留好每一筆買進成本的證明</strong>（交易所的交易明細、入金紀錄），每年下載一次存起來。拿不出成本，可能被當成 0 成本、全部算賺。App 的「我的決策紀錄」只是輔助，不能當證明。</li>
    <li>在<strong>國外交易所</strong>賺的是海外所得：全戶一年海外所得合計不到 100 萬元不用計入最低稅負；超過也只有「基本所得額」超過 750 萬元才可能要繳。一樣要留紀錄。</li>
    <li>官方<strong>還沒說清楚</strong>：常常買賣會不會被當成「經常性」營利、境內境外怎麼分、幣換幣算不算賣。金額大時，報稅前先問會計師或國稅局。</li>
  </ul>`;
}

export function caution(D) {
  return `這段時間（2022 年起）幣價大起大落，一直抱著的稅前成績本來就比照建議差（上表「不用繳稅」那一列）；照建議稅後領先，是這段時間的結果，不保證以後也會。稅率用你「最高那一級」的綜所稅率簡單乘，沒算其他所得、扣除額和級距跳動。`;
}

/** Advanced card. */
export function taxDragCard(D) {
  const id = 'taxdrag', h2 = '照建議做，在台灣要繳多少稅？稅後還划算嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 上所有成績都是<strong>還沒扣所得稅</strong>的。這張卡把同一份過去的建議（兩幣各半 NT$100 萬、含手續費，同虛擬投資），加上台灣個人所得稅重算一次，和「第一天買進、一直抱著、最後才賣」比。不是稅務建議。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${dragLine(D)}</p>
    ${table(D)}
    <p class="small">${salesLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：</p>
    ${you()}
    <p class="small warn">${caution(D)}</p>
    <p class="small muted">算法：<code>backtest/tax_drag.py</code> → <code>data/taxdrag.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。買賣 0.15%、買進加台幣溢價 0.27%（算進成本）；成本用移動平均；每年賣出的賺賠合計，賠的先扣之前 3 年內沒扣完的；稅在隔年 5/31 從帳上繳（現金不夠就賣幣）；最後一天兩邊都全部賣掉、當年的稅立刻算。兩段各自從現金開始（2022–23 年底算到 12/31 全部賣掉；2024 年起算到 ${+D.as_of.slice(5, 7)}/${+D.as_of.slice(8, 10)}）。規則事先固定（commit aba384c），2022–23 的結果在看任何 2024 年後數字之前先存（2e66597）。稅法依據：財政部 114-01-13 台財稅字第 11304672340 號書面報告、所得稅法 §14、§17、所得基本稅額條例 §12、財政部 114-11-19 公告（750 萬元）。</p>
  </section>`;
}
