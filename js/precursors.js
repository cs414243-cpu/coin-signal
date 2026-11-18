// v81: 「大動前兆」現在有沒有出現？2024 年後還準嗎？ — the two findings that the 「最近大漲大跌的原因」 card labels
// 「校正後仍成立」 (found on ALL data 2020/2021→now) re-checked on 2024+ only, with the big-move threshold fixed from data up to
// 2023 (backtest/precursors_oos.py, pre-registered fb06ef9 → data/precursors.json, weekly), plus whether each condition is on at
// the latest close (forecast/events/publish.py → data/events.json precursors_now, daily). Pure functions (no DOM, no fetch).
// Descriptive only: predicts "a big move in EITHER direction" at most; never changes the recommendation.
import { asofInline, WEEKLY_NOTE } from './fresh.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pc = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
const sp = x => !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
// funding: daily sum of 8-hour rates, shown as % per day with 3 decimals
const fpd = x => !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(3)}%`;
// candle date D closes at D+1 08:00 Taipei
const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const md = s => s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '—';

export const NAME = {
  F1: { short: '美股近 5 天跌 3% 以上', coin: 'BTC', long: '美股（標普 500）近 5 個交易日跌 3% 以上 → BTC 隔天' },
  F2: { short: 'ETH 資金費率特別低', coin: 'ETH', long: 'ETH 資金費率掉到過去一年最低 5%（很多人押跌）→ ETH 隔天' },
};
export const VERDICT_ZH = {
  holds_oos: '2024 年後還成立',
  weak_oos: '2024 年後方向一樣，但次數太少，還不能確定',
  gone_oos: '2024 年後沒有再看到',
};

export const VERDICT_SHORT = { holds_oos: '還成立', weak_oos: '方向一樣，次數太少，還不能確定', gone_oos: '沒有再看到' };

export function valid(P) {
  return !!(P && P.schema === 1 && P.findings?.F1?.oos && P.findings?.F2?.oos && P.findings.F1.verdict && P.findings.F2.verdict);
}
const nowOk = N => !!(N && !N.error && N.spx_dd5 && N.fund_lo && N.asof);

/** One plain status per condition at the latest close; null if the daily data is missing. */
export function nowState(N) {
  if (!nowOk(N)) return null;
  const s = N.spx_dd5, f = N.fund_lo;
  return {
    close: closeMD(N.asof),
    F1: { on: !!s.on, text: `美股近 5 個交易日 ${sp(s.value)}（${md(s.spx_date)} 美股收盤；門檻 −3%）` },
    F2: { on: !!f.on, text: `ETH 資金費率最近 7 天平均每天 ${fpd(f.value)}（「特別低」門檻 ${fpd(f.q05)}）` },
  };
}

/** For the 進階 events card: a short 2024+ note appended to the two robust findings. '' when unknown. */
export function findingNote(P, cond) {
  if (!valid(P)) return '';
  const id = cond === 'spx_dd5' ? 'F1' : cond === 'fund_lo' ? 'F2' : null;
  if (!id) return '';
  const o = P.findings[id].oos;
  return `2024 年後重新檢查：${VERDICT_ZH[P.findings[id].verdict]}（${o.n_cond} 天裡只有 ${o.ev_cond} 天大動；見「大動前兆現在有沒有出現」）`;
}

/** Top 本週要注意: ONLY when a condition is on now AND it held up 2024+ (pre-registered rule). Otherwise ''. */
export function weekExtra(P, N) {
  const S = nowState(N);
  if (!valid(P) || !S) return '';
  const on = ['F1', 'F2'].filter(k => S[k].on && P.findings[k].verdict === 'holds_oos');
  if (!on.length) return '';
  return `<p class="small pre-week">⚡ ${on.map(k => `${esc(NAME[k].short)}：過去之後隔天 ${NAME[k].coin} 比較常大漲或大跌（不代表方向，建議不變）`).join('；')}。</p>`;
}

export function row(P, k) {
  const F = P.findings[k], i = F.is, o = F.oos;
  return `<tr><td>${esc(NAME[k].short)} → ${NAME[k].coin}</td><td>${pc(i.p_cond)} vs ${pc(i.p_not)}<div class="muted">${i.n_cond} 天有 ${i.ev_cond} 次</div></td><td>${pc(o.p_cond)} vs ${pc(o.p_not)}<div class="muted">${o.n_cond} 天有 ${o.ev_cond} 次</div></td><td>${esc(VERDICT_SHORT[F.verdict])}</td></tr>`;
}

export function precursorsCard(P, N) {
  const id = 'precursors', h2 = '「大動前兆」現在有沒有出現？2024 年後還準嗎？';
  if (!valid(P)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const S = nowState(N), F1 = P.findings.F1, F2 = P.findings.F2, C = P.findings.C1;
  const nowHtml = S
    ? `<p><strong>現在（${esc(S.close)} 早上 8 點收盤）</strong>：${['F1', 'F2'].map(k => `${esc(S[k].text)} → ${S[k].on ? '<strong>有出現</strong>' : '沒有出現'}`).join('；')}。</p>`
    : '<p class="muted small">今天的前兆資料讀不到（每天 08:20 更新），下次更新會補上。</p>';
  const anyHolds = ['F1', 'F2'].some(k => P.findings[k].verdict === 'holds_oos');
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">「最近大漲大跌的原因」裡有兩個前一天就知道、而且多重檢定校正後仍成立的「前兆」。但它們是用 2020 年以來<strong>全部</strong>資料找出來的，可能只是剛好；這裡只用 2024 年以後的資料重新看一次（「大動」＝當天漲跌超過 2023 年以前 95% 的日子：BTC ${pc(F1.threshold)}、ETH ${pc(F2.threshold)}，門檻只用 2023 年以前的資料定）。</p>
    ${nowHtml}
    <p class="small">隔天大動的比例（前兆出現的日子 vs 其他日子）：</p>
    <div class="scroll"><table class="bt"><thead><tr><th>前兆</th><th>2023 年以前</th><th>2024 年起</th><th>結論</th></tr></thead><tbody>${row(P, 'F1')}${row(P, 'F2')}</tbody></table></div>
    <p class="small">${anyHolds ? '有前兆在 2024 年後還成立：它出現時首頁「本週要注意」會多一句提醒。' : `2024 年後美股那個 ${F1.oos.n_cond} 天裡只有 ${F1.oos.ev_cond} 次大動、ETH 那個 ${F2.oos.n_cond} 天裡只有 ${F2.oos.ev_cond} 次；扣掉「一次試兩個」之後還可能是運氣（校正後 p ${F1.oos.holm?.toFixed(2)}、${F2.oos.holm?.toFixed(2)}，要小於 0.10 才算），所以首頁不提醒。`}對照：「BTC 前一天剛大漲跌、隔天又大動」2024 年後 ${pc(C.oos.p_cond)} vs ${pc(C.oos.p_not)}（${C.oos.n_cond} 天有 ${C.oos.ev_cond} 次）——大動會連在一起，這本來就知道。</p>
    <p class="small"><strong>對你來說</strong>：就算前兆出現，也只代表「隔天可能大漲<strong>或</strong>大跌」，不說方向，所以<strong>建議不會因此改變</strong>；比較實際的是：放進去的錢要能承受某一天突然漲跌 ${pc(F1.threshold)} 以上。</p>
    <p class="small muted">算法：<code>backtest/precursors_oos.py</code>（事先登記、2024 年後判）→ <code>data/precursors.json</code>（${asofInline(P.as_of)}，${WEEKLY_NOTE}）；「現在」來自每天 08:20 更新的 <code>data/events.json</code>。條件都用前一天收盤就知道的值；p 值用循環位移重抽樣、兩個前兆一起做 Holm 校正。這是過去紀錄，不是預測。</p>
  </section>`;
}
