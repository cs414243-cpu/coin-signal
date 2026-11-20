// v87: 建議改變那天：掛單（限價）還是直接買賣（市價）？ — pure functions (no DOM, no network).
// backtest/limit_order.py → data/limitorder.json: every day the frozen champion trend_vt@1 changed its recommendation
// (walk-forward, 2022→), a limit order at the 08:00 close vs a market order, simulated on closed Binance 1-hour bars after
// the decision (filled only when the price goes strictly through the limit), MAX VIP 0 fees (maker 0.08%, taker 0.16%).
// Definitions committed before the first run (142b1fb), IS-only result (c3244cb) before any 2024+ number; the `late`
// block (placed 1–2 hours later) was added after the first full run and is labelled so. Basis: Handa & Schwartz 1996
// JF 51(5):1835–1861 (doi 10.1111/j.1540-6261.1996.tb05228.x) — limit orders save the spread/fee but risk not filling;
// Linnainmaa 2010 JF 65(4):1473–1506 (doi 10.1111/j.1540-6261.2010.01576.x). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc2 = x => !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(2)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const ntd = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}NT$${Math.abs(Math.round(x)).toLocaleString('en-US')}` : '—';
const per100k = x => ntd(x * 100000);
const ROWS = ['d0_h12', 'd0.2_h12', 'd0.5_h12', 'd1_h12'];
const DZ = { 'd0_h12': '收盤價', 'd0.2_h12': '好 0.2%', 'd0.5_h12': '好 0.5%', 'd1_h12': '好 1%' };

export function valid(D) {
  const m = D?.results?.[D?.main];
  return !!(D && !D.is_only && m?.is_?.all?.pooled?.n && m?.oos?.all?.pooled?.n && D.verdict?.[D.main]
    && ROWS.every(k => D.results[k]?.oos?.buy?.pooled && D.results[k]?.oos?.sell?.pooled)
    && ['close_s1', 'now_s1'].every(k => D.late?.results?.[k]?.oos?.all && D.late.results[k].is_?.all));
}

/** The plain conclusion (depends only on data: pre-registered verdict + the labelled post-hoc late check). */
export function headLine(D) {
  const v = D.verdict[D.main].all, m = D.results[D.main].oos.all.pooled;
  const lc = D.late.results.close_s1, ln = D.late.results.now_s1;
  const lateBad = lc.is_.all.mean_w < 0 && lc.oos.all.mean_w < 0;
  const nowOk = ln.is_.all.mean_w > 0 && ln.oos.all.mean_w > 0;
  const main = v === 'limit_better'
    ? `8 點一收盤就掛在收盤價，2024 年起 ${m.n} 次動手有 ${pc0(m.fill)} 當天成交，每次平均省 ${pc2(m.mean_w).replace('+', '')}（手續費差，每 NT$10 萬約 ${per100k(m.mean_w)}）`
    : v === 'market_better' ? '掛在 8 點收盤價，過去平均反而比直接買賣多付' : '掛在 8 點收盤價，過去省不省說不準';
  const late = lateBad
    ? `；但 App 的正式建議 8:20 以後才出來，<strong>晚 1 小時才掛「8 點的收盤價」，過去平均反而多付</strong>（事後加的檢查；2024 起 ${pc2(lc.oos.all.mean_w)}，賣出 ${pc2(lc.oos.sell.mean_w)}）——價格已經走開，常常要等到晚上改用更差的價格`
    : '';
  const now = nowOk ? `。要掛單，就<strong>掛在你下單當時的價格</strong>（過去 2024 起平均 ${pc2(ln.oos.all.mean_w)}、幾乎都成交）` : '';
  return `${main}${late}${now}。`;
}

function table(D) {
  const r = k => D.results[k].oos, i = k => D.results[k].is_;
  return `<table class="bt"><thead><tr><th>8 點掛在</th><th>當天成交</th><th>買進省</th><th>賣出省</th></tr></thead><tbody>
    ${ROWS.map(k => `<tr${k === D.main ? ' class="hl"' : ''}><th>${DZ[k]}${k === D.main ? '<div class="muted small">主要比較</div>' : ''}</th><td>${pc0(r(k).all.pooled.fill)}</td><td>${pc2(r(k).buy.pooled.mean_w)}<div class="muted small">22–23 ${pc2(i(k).buy.pooled.mean_w)}</div></td><td>${pc2(r(k).sell.pooled.mean_w)}<div class="muted small">22–23 ${pc2(i(k).sell.pooled.mean_w)}</div></td></tr>`).join('')}
  </tbody></table>
  <p class="small muted">「好 0.2%」＝買進掛低 0.2%、賣出掛高 0.2%；到 20:00 沒成交就改市價。「主要比較」是第一次執行前就指定的。小字是 2022–23 年。</p>`;
}

function lateTable(D) {
  const L = D.late.results;
  const row = (k, t) => `<tr><th>${t}</th><td>${pc0(L[k].oos.all.fill)}</td><td>${pc2(L[k].oos.buy.mean_w)}</td><td>${pc2(L[k].oos.sell.mean_w)}</td></tr>`;
  return `<table class="bt"><thead><tr><th>晚一點才掛</th><th>當天成交</th><th>買進省</th><th>賣出省</th></tr></thead><tbody>
    ${row('close_s1', '9 點掛 8 點價')}${row('now_s1', '9 點掛當時價')}${row('close_s2', '10 點掛 8 點價')}
  </tbody></table>`;
}

/** Block inside the 台幣買幣成本 card (id limitorder). */
export function limitBlock(D, now = Date.now()) {
  if (!valid(D)) return '<div id="limitorder"><h3 class="sub">建議變了那天：掛單還是直接買賣？</h3><p class="small muted">回測資料讀不到，先不顯示。</p></div>';
  const m = D.results[D.main].oos.all.pooled, s = D.results['d1_h12'].oos.sell.pooled, ln = D.late.results.now_s1.oos.all;
  const yr = ln.mean_w > 0 ? `掛在下單當時價格，用 NT$100 萬照建議，2024 年起一年約省 ${ntd(ln.ntd_yr)}` : `用 NT$100 萬照建議，8 點整就掛，2024 年起一年約省 ${ntd(m.ntd_yr)}`;
  return `<div id="limitorder"><h3 class="sub">建議變了那天：掛單還是直接買賣？</h3>
    <p>${headLine(D)}</p>
    <p class="small">對你來說：① 省的只是手續費差（MAX VIP 0 掛單 0.08%、吃單 0.16%），${yr}，不是大錢；② <strong>賣出（減碼、空手）不要掛高等它</strong>：掛高 1% 只有 ${pc0(s.fill)} 當天成交，平均 ${pc2(s.mean_w)}——跌的時候掛單常常賣不掉；③ 不管掛不掛，同一天做完（晚一天的代價大很多，看「晚幾天才照做」）。</p>
    ${table(D)}
    <p class="small">事後加的檢查（看到上面結果才加，比較接近真實：建議 8:20 後才出來）；和「那個時間直接買賣」比：</p>
    ${lateTable(D)}
    <p class="small muted">算法：<code>backtest/limit_order.py</code> → <code>data/limitorder.json</code>（冠軍 2022 年起逐日建議每次「動手」〔加碼／減碼差 10 個百分點以上、或從 0 變成要放、變成 0〕：買 ${D.results[D.main].oos.buy.pooled.n} 次、賣 ${D.results[D.main].oos.sell.pooled.n} 次〔2024 起〕；Binance 已收完 1 小時K，只用決定之後的小時；價格要「穿過」掛單價才算成交，偏保守；直接買賣不算價差和滑價，對掛單偏不利；${asofInline(D.as_of, now)}，${WEEKLY_NOTE}；定義在第一次執行前固定）。限制：用的是 Binance 的價格，MAX 台幣市場比較薄，實際成交可能更少；買幣的 USDT 溢價兩種做法一樣，沒算進來。不改建議、不是投資建議。</p></div>`;
}
