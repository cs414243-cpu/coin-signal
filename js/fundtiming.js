// v90: 建議轉成買進那天，台幣還在銀行來得及嗎？ — pure functions (no DOM, no network).
// backtest/fund_timing.py → data/fundtiming.json: the frozen champion's walk-forward exposures with the NT$ waiting on MAX
// (reference = virtual portfolio) vs waiting in the bank (earns the 臺灣銀行 demand rate) and arriving the same day / on
// weekdays only / always a day late / at most NT$100k per day. Sells are never delayed. Definitions committed before the
// first run (ee938dc), IS-only results before any 2024+ number. Limits checked 2026-11-21 on official pages (MAX 說明中心;
// 銀行公會「金融機構辦理電子銀行業務安全控管作業基準」第八條). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const wan = x => Number.isFinite(x) ? `${(x / 10000).toFixed(1)} 萬` : '—';
export const ORDER = ['ready', 'bank_same', 'bank_wkday', 'bank_next', 'cap10', 'cap05'];
export const LABEL = {
  ready: '台幣先放在 MAX 等', bank_same: '放銀行，要買那天早上轉、當天到', bank_wkday: '放銀行，平日當天到、週末等到週一',
  bank_next: '放銀行，每次都隔天才到', cap10: '放銀行，每天最多轉 10 萬（放 100 萬）', cap05: '放銀行，每天最多轉 10 萬（放 200 萬）',
};
export const P = (D, r, k = 'oos') => D?.results?.[r]?.pooled?.[k];
const ANS = ['bank_ok', 'weekday_ok', 'keep_on_max', 'unclear'];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.rules || !ANS.includes(v.answer) || !D.descriptives?.oos || !D.limits || !D.rate) return false;
  return ORDER.every(r => ['is_', 'oos'].every(k => ['sharpe', 'cagr', 'maxdd'].every(f => Number.isFinite(P(D, r, k)?.[f]))) && Number.isFinite(P(D, r)?.end_per_1m))
    && ORDER.slice(1).every(r => ['similar', 'worse', 'mixed'].includes(v.rules[r])) && D.now_expo && ['BTC', 'ETH'].every(c => Number.isFinite(D.now_expo[c]));
}

const end = (D, r) => wan(P(D, r).end_per_1m);
const word = r => r === 'similar' ? '照事先定的標準算差不多' : r === 'worse' ? '兩段都明顯變差' : '兩段不一致';

/** Plain conclusion (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const a = D.verdict.answer;
  const head = a === 'bank_ok' ? '<strong>放銀行、要買那天再轉，大致來得及</strong>（前提是當天轉得過去）。'
    : a === 'weekday_ok' ? '<strong>平日轉得到就來得及；每次都晚一天就明顯變差</strong>。'
    : a === 'keep_on_max' ? '<strong>來不及：錢放銀行等，明顯變差</strong>，要照建議做就得先把台幣放在 MAX。'
    : '<strong>說不準</strong>：兩段期間結果不一致。';
  return `${head}2024 年起每 NT$100 萬（兩幣各半、含手續費）：先放 MAX 等 → ${end(D, 'ready')}；放銀行、平日當天到、週末等到週一 → ${end(D, 'bank_wkday')}；`
    + `就算每次都隔天才到 → ${end(D, 'bank_next')}（${word(D.verdict.rules.bank_next)}，但數字比較少）；當天就到，再加上活儲利息 → ${end(D, 'bank_same')}。`;
}

/** The real trap: how much can be moved in one day. */
export function capLine(D) {
  const o = D.descriptives.oos;
  return `<strong>真正要小心的是「一天能轉多少」</strong>：2024 年起平均每年約 ${Math.round(o.per_year)} 天要買，其中 ${pc0(o.over10_share)} 那天要買超過總額的 10%（中間值 ${pc0(o.median_need)}）。`
    + `如果每天只能轉 10 萬（2024 年起）：放 100 萬 → ${end(D, 'cap10')}（比先放 MAX 差的把握 ${pc0(D.results.cap10.oos_p_worse)}）；放 200 萬 → ${wan(2 * P(D, 'cap05').end_per_1m)}（每 100 萬 ${end(D, 'cap05')}；年化 ${pc1(P(D, 'cap05').cagr)}，先放 MAX ${pc1(P(D, 'ready').cagr)}；${word(D.verdict.rules.cap05)}）。`;
}

export function limitsList(D) {
  const L = D.limits;
  return `<ul class="small">
    <li>網路銀行轉到「<strong>非約定帳戶</strong>」：每筆 ${wan(L.bank_nondesignated_single)}、每天 ${wan(L.bank_nondesignated_daily)}、每月 ${wan(L.bank_nondesignated_monthly)}（銀行公會「金融機構辦理電子銀行業務安全控管作業基準」；有些銀行用更強的驗證可以提高）。把 MAX 的專屬入金帳號設成「<strong>約定轉入帳號</strong>」就不受這個限制（額度看各銀行）。</li>
    <li>MAX 自己的入金上限：2025/6/28 以後註冊、還沒升級的<strong>新戶每天 ${wan(L.max_new_daily)}</strong>；一般個人戶單筆 ${wan(L.max_normal_single)}、每天 ${wan(L.max_normal_daily)}（MAX 說明中心「新臺幣餘額出入金限額」）。在 MAX「錢包 → TWD → 入金」可以看到你自己的上限。</li>
    <li>只能從你在 MAX 驗證過的<strong>本人銀行帳戶</strong>用網銀或 ATM 轉；臨櫃、現金、別的帳戶轉都不會入帳（MAX 說明中心「新臺幣入金教學」）。</li>
    <li>週末、晚上轉的錢什麼時候到，MAX 官方頁沒寫（有些教學說可能等下一個上班日，我們沒查證）。2024 年起要買的日子有 ${pc0(D.descriptives.oos.weekend_share)} 落在週六、週日早上。</li>
  </ul>`;
}

function table(D) {
  const row = r => {
    const o = P(D, r), i = P(D, r, 'is_'), pw = D.results[r].oos_p_worse;
    return `<tr><th>${LABEL[r]}</th><td>${end(D, r)}</td><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${pc1(i.cagr)}／${pc1(i.maxdd)}</td><td>${r === 'ready' ? '—' : pw >= 0.995 ? '超過 99%' : pc0(pw)}</td></tr>`;
  };
  return `<div class="scroll"><table class="bt"><thead><tr><th>錢放哪裡等</th><th>2024 起每 100 萬變成</th><th>年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 年化／最慘</th><th>比先放 MAX 差的把握</th></tr></thead><tbody>${ORDER.map(row).join('')}</tbody></table></div>`;
}

export function betterNote(D) {
  const b = ORDER.slice(2).filter(r => P(D, r).sharpe > P(D, 'ready').sharpe || P(D, r, 'is_').sharpe > P(D, 'ready', 'is_').sharpe);
  return b.length ? `${b.map(r => LABEL[r]).join('、')}在其中一段看起來比先放 MAX 好，但另一段較差——沒有證明比較好。` : '';
}

export function nowLine(D) {
  const zero = ['BTC', 'ETH'].filter(c => D.now_expo[c] < 0.005);
  if (zero.length === 2) return '現在：BTC、ETH 建議都是 0，下一次動作一定是「買進」——<strong>現在正是先把轉帳設定好的時候</strong>（約定轉入帳號、確認 MAX 入金上限），不用等建議變了才處理。';
  return `現在：${['BTC', 'ETH'].map(c => `${c} 建議 ${pc0(D.now_expo[c])}`).join('、')}。賣出不受影響（幣已經在 MAX）；再加碼時才需要轉錢。`;
}

export function you(D) {
  return '<strong>對你來說</strong>：① 想讓沒用到的錢在銀行生利息，可以放銀行，但<strong>先把 MAX 入金帳號設成約定轉入帳號</strong>，並確認自己不是 MAX 新戶上限；'
    + '② 打算放的錢比一天能轉的金額多很多時（例如每天只能轉 10 萬，卻打算放 200 萬），至少先把一部分放在 MAX，或接受過去少賺的那一段（上表）；交易所也有風險，見「幣放哪裡」；'
    + '③ 賣出不用等轉帳（幣已經在 MAX），賣完的錢要不要轉回銀行是另一件事（出金費用沒算）。過去的結果不保證未來。';
}

/** Advanced card. */
export function fundTimingCard(D) {
  const id = 'fundtiming', h2 = '建議轉成買進那天，台幣還在銀行來得及嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 的成績都假設建議一變成「買進」，台幣已經在 MAX、早上 8 點就買得到。很多人把錢放銀行（有利息），要買才轉過去。這張用同一份過去的建議，比較錢放哪裡等、轉帳晚到或每天轉不完，會差多少（賣出都準時，因為幣本來就在 MAX）。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${capLine(D)}</p>
    ${table(D)}
    <p class="small">${betterNote(D)}</p>
    <p class="small"><strong>轉帳有哪些限制</strong>（2026/11/21 查官方頁面；會改，動手前請自己再看一次）：</p>
    ${limitsList(D)}
    <p class="small">${nowLine(D)}</p>
    <p class="small">${you(D)}</p>
    <p class="small muted">算法：<code>backtest/fund_timing.py</code> → <code>data/fundtiming.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。買賣 0.15%、買進加台幣溢價 0.27%；放 MAX 的台幣不計利息，放銀行的照臺灣銀行活儲機動利率（中央銀行資料，最新 ${D.rate.last_month} ${D.rate.last_rate}%）按日計、不扣稅；轉帳費、出金費沒算；國定假日沒算（連假會更晚）。隔天到＝每次買進／加碼晚 1 天；每天最多加總額的 10%／5%（兩幣各半估）。「明顯變差」事先固定（commit ee938dc）：夏普少 ${D.sharpe_tol} 以上或最慘跌幅多 ${Math.round(D.dd_tol * 100)} 個百分點以上，2022–23 和 2024 起兩段都變差才算。「差的把握」＝2024 年起每日報酬 28 天區塊重抽 ${D.boot.n} 次。</p>
  </section>`;
}
