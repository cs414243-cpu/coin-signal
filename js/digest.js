// v96: 「想自己改一下做法？過去試過的答案，一張看完」 — the top of 進階 lists every "do it my own way" question that an
// earlier card already answered with a pre-registered backtest (two periods, costs included, closed daily bars only), and
// gives each one plain answer + a link to its card. Nothing new is computed or tested here: every answer is chosen ONLY
// from that card's own data file `verdict` (the same field its card uses for its own conclusion), so when the Monday
// refresh changes a verdict, this list changes with it. A file that is missing or fails its card's valid() is shown as
// 「資料讀不到」 and left out of the counts. Pure functions (no DOM, no network). Not a signal; the recommendation is
// unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
import * as XL from './execlag.js';
import * as WKC from './weeklycheck.js';
import * as FT from './fundtiming.js';
import * as ETR from './etfroute.js';
import * as SZU from './sizeup.js';
import * as IPL from './idlepool.js';
import * as CSM from './coinsplit.js';
import * as SE from './splitexit.js';
import * as LE from './lateentry.js';
import * as EE from './earlyentry.js';
import * as TB from './tradeband.js';
import * as DS from './dipstop.js';
import * as TPF from './takeprofit.js';
import * as BEV from './breakeven.js';
import * as QC from './quitcost.js';
import * as RLG from './rellag.js';
import * as DDP from './deepdrop.js';
import * as SAV from './sameavg.js';

/** Answer classes, in display order of the summary. */
export const CLS = {
  rule: { tag: '照建議就好', cls: 'dg-rule' },        // the "my own way" version was worse in both periods
  same: { tag: '兩種都可以', cls: 'dg-same' },        // about the same
  unclear: { tag: '說不準', cls: 'dg-unclear' },      // not shown to be better (periods disagree / too few cases)
  alt: { tag: '過去自己改比較好', cls: 'dg-alt' },    // the alternative was better in both periods (still only a backtest)
};
const r = (c, t) => ({ c, t });

/** Every row: card id (link target), the data key (= app/data/<key>.json), a plain question, and answer(D) → {c, t}.
 *  answer() reads only the pre-registered verdict fields; ok(D) = the card's own validity check. */
export const ITEMS = [
  // 建議變了的那天
  { id: 'execlag', key: 'execlag', ok: XL.valid, q: '建議變了，晚幾天才照做可以嗎？', answer: D => {
    const g = D.verdict.grace_days;
    return g === 0 ? r('rule', '當天照做：連晚 1 天都明顯變差。') : g >= 7 ? r('same', '晚到 7 天以內，過去差不多。') : r('rule', `晚 ${g} 天以內差不多，再晚就明顯變差。`); } },
  { id: 'weeklycheck', key: 'weeklycheck', ok: WKC.valid, q: '一週只看一次 App 可以嗎？', answer: D => {
    const a = D.verdict.answer;
    if (a === 'weekly_ok') return r('same', '一週看一次、那天全部照做，過去差不多。');
    if (a === 'cut_on_time') return r('same', '要減碼當天就做、只有買進等到那天看，過去差不多；全部等到那天做會變差。');
    if (a === 'daily_better') return r('rule', '最好每天看：一週才看一次，不管怎麼做都明顯變差。');
    return D.verdict.families?.all === 'worse' ? r('rule', '每天看最穩：一週只看一次、那天全部照做，明顯變差。') : r('unclear', '說不準，兩段時間結果不一致。'); } },
  { id: 'fundtiming', key: 'fundtiming', ok: FT.valid, q: '台幣先放銀行，要買那天再轉過去，來得及嗎？', answer: D => {
    const a = D.verdict.answer;
    return a === 'bank_ok' ? r('same', '大致來得及（前提是當天轉得過去）。') : a === 'weekday_ok' ? r('same', '平日轉得到就來得及；每次都晚一天就明顯變差。')
      : a === 'keep_on_max' ? r('rule', '來不及：要照建議做，就先把台幣放在交易所。') : r('unclear', '說不準，兩段時間結果不一致。'); } },
  { id: 'splitexit', key: 'splitexit', ok: SE.valid, q: '建議變成 0，要分幾天慢慢賣嗎？', answer: D => {
    const v = D.results.exit3.verdict;
    return v === 'worse' ? r('rule', '一次賣完就好：分 3 天賣沒有比較好。') : v === 'better' ? r('alt', '分 3 天賣完過去比較好。') : r('unclear', '分幾天賣好不好，說不準。'); } },
  { id: 'splitexit', key: 'splitexit', ok: SE.valid, q: '建議轉成要放，要分幾天慢慢買嗎？', answer: D => {
    const v = D.results.entry3.verdict;
    return v === 'better' ? r('alt', '分 3 天買過去比較好。') : v === 'worse' ? r('rule', '當天買就好：分 3 天買比較差。') : r('unclear', '沒有證明分天買比較好；怕買在高點，可以少放一點，而不是拖幾天。'); } },
  { id: 'intraday', key: 'earlyentry', ok: EE.valid, q: '盤中已經漲過翻轉價，要先買、不等早上 8 點嗎？', answer: D => {
    const v = D.verdict;
    return v === 'early_better' ? r('alt', '過去盤中先買略好，但還沒經過實盤驗證。') : v === 'wait_better' ? r('rule', '等早上 8 點收盤再買：盤中先買比較差。')
      : r('unclear', '盤中先買沒有比較好，等早上 8 點收盤再照做就好。'); } },
  { id: 'tradeband', key: 'tradeband', ok: T => !!T?.results?.daily, q: '建議比例每天小小變動，要每天跟著調嗎？', answer: T => {
    const { tol, backed } = TB.tolOf(T);
    return backed ? r('same', `不用：差不到 ${Math.round(tol * 100)} 個百分點就不調，和每天調差不多、比較省事（建議變成 0 時一樣當天賣）。`)
      : r('unclear', `事先定的條件沒成立，維持「差 ${Math.round(tol * 100)} 個百分點以內不用動」。`); } },
  // 買了之後
  { id: 'lateentry', key: 'lateentry', ok: LE.valid, q: '轉成加碼時已經漲很多了，要跳過這次嗎？', answer: D => {
    const v = D.verdict.skip;
    return v === 'follow' ? r('rule', '不要跳過：過去跳過這種「漲很多才轉」的趟是吃虧的。') : v === 'skip' ? r('alt', '過去跳過反而比較好。') : r('unclear', '跳過好不好，說不準。'); } },
  { id: 'dipstop', key: 'dipstop', ok: DS.valid, q: '買了之後跌破買進價，要自己先停損嗎？', answer: D => {
    const v = D.verdict;
    return v === 'hold' ? r('rule', '不用：自己先停損，過去兩段都比較差。') : v === 'stop' ? r('alt', '自己先停損過去兩段都比較好，但次數不多。') : r('unclear', '自己先停損好不好，說不準。'); } },
  { id: 'takeprofit', key: 'takeprofit', ok: TPF.valid, q: '買了之後賺了，要自己先賣掉落袋嗎？', answer: D => {
    const v = D.verdict;
    return v === 'hold' ? r('rule', '不用：賺一點就先賣，過去兩段都比較差。') : v === 'take' ? r('alt', '賺一點就先賣，過去兩段都比較好。') : r('unclear', '先落袋好不好，說不準。'); } },
  { id: 'breakeven', key: 'breakeven', ok: BEV.valid, q: '建議變成 0，但我現在是賠的，要等回本再賣嗎？', answer: D => {
    const v = D.verdict;
    return v === 'sell' ? r('rule', '不用等：規則說賣那天就賣，過去比較好。') : v === 'wait' ? r('alt', '等回本再賣，過去兩段都比較好。') : r('unclear', '等回本好不好，說不準。'); } },
  // 放多少、怎麼分
  { id: 'sizeup', key: 'sizeup', ok: SZU.valid, q: '建議只放一點點，我可以放多一點嗎？', answer: D => {
    const a = D.verdict.answer;
    return a === 'more_is_better' ? r('alt', '過去放多一點比較划算（仍只是回測）。') : a === 'more_is_worse' ? r('rule', '放兩倍，最慘跌幅深很多；換算成「每冒一分險賺多少」比照建議差（差距不大）。')
      : a === 'same_per_risk' ? r('same', '放多一點，賺和賠都一起變大，沒有比較划算。') : r('unclear', '沒有證明放多一點比較好。'); } },
  { id: 'idlepool', key: 'idlepool', ok: IPL.valid, q: '一個幣空手時，那份錢拿去買另一個幣？', answer: D => {
    const a = D.verdict.answer;
    return a === 'pool_better' ? r('alt', '過去挪過去比較好（仍只是回測）。') : a === 'keep_separate' ? r('rule', '不要挪：兩段都明顯變差。')
      : a === 'more_risk_only' ? r('same', '差不多，只是賺賠都放大。') : r('unclear', '沒有證明挪過去比較好。'); } },
  { id: 'coinsplit', key: 'coinsplit', ok: CSM.valid, q: 'BTC 和 ETH 不要各一半，改別的分法？', answer: D => {
    const better = CSM.KEYS.filter(k => k !== '50' && D.rows[k].verdict === 'better');
    return better.length ? r('alt', `${better.map(CSM.label).join('、')} 過去比各一半好。`) : r('unclear', `各一半就好：沒有證明別的分法比較好${(Number(CSM.best(D, 'is_')) - 50) * (Number(CSM.best(D, 'oos')) - 50) < 0 ? '，前後兩段哪個幣比較好還是相反的' : ''}。`); } },
  { id: 'etfroute', key: 'etfroute', ok: ETR.valid, q: '改用美股比特幣 ETF 照建議做？', answer: D => {
    const v = D.verdict.etf_mid;
    return v === 'worse' ? r('rule', '用 ETF 照做明顯比較差。') : v === 'better' ? r('alt', '用 ETF 照做過去反而比較好。') : v === 'similar' ? r('same', '和在交易所做差不多。') : r('unclear', '兩段時間結果不一致。'); } },
  // 空手、成績不好的時候
  { id: 'deepdrop', key: 'deepdrop', ok: DDP.valid, q: '已經從最高點跌一半了，自己先全部買進？', answer: D => {
    const w = D.verdict.now_vs_rule.winner, S = DDP.summary(D);
    return w === 'rule' ? r('rule', '照建議比較好。') : w === 'now' ? r('alt', '過去跌一半就全部買進比較好。')
      : r('unclear', `跌一半不代表到底，沒有一種做法每次都比較好${S.loss.rule < S.loss.now ? '；照建議的好處是賠得少' : ''}。`); } },
  { id: 'quitcost', key: 'quitcost', ok: QC.valid, q: '連賠好幾次，想先停下來不照做？', answer: D => {
    const v = D.verdict.cash;
    return v === 'keep' ? r('rule', '不要停：連賠之後改成空手，過去兩段平均都比繼續照做差。') : v === 'quit' ? r('alt', '過去先停下來反而比較好。') : r('unclear', '停不停，說不準。'); } },
  { id: 'rellag', key: 'rellag', ok: RLG.valid, q: '照建議比一直抱著少賺很多，要改成一直抱著？', answer: D => {
    const v = D.verdict;
    return v === 'keep' ? r('rule', '不要改：改成一直抱著，過去兩段平均都比較差。') : v === 'switch' ? r('alt', '過去改成一直抱著比較好，但跌幅深很多。') : r('unclear', '改不改，說不準。'); } },
  { id: 'sameavg', key: 'sameavg', ok: SAV.valid, q: '乾脆固定放一個比例、不看建議的時機？', answer: D => {
    const v = D.verdict;
    return v === 'better' ? r('rule', '照建議比較好：時機有加分。') : v === 'worse' ? r('alt', '固定放同樣平均比例，過去一樣或更好。')
      : r('unclear', `還沒有證明時機有加分${SAV.ruleAhead(D) ? '，但兩段照建議都賺得比較多、跌得比較淺' : ''}。`); } },
];

/** data = { <key>: parsed json or null }. Returns rows [{item, ok, c, t, asof}] and counts. */
export function rows(data) {
  return ITEMS.map(item => {
    const D = data?.[item.key];
    let ok = false; try { ok = !!D && !!item.ok(D); } catch { ok = false; }
    if (!ok) return { item, ok: false, c: null, t: '資料讀不到', asof: null };
    let a = null; try { a = item.answer(D); } catch { a = null; }
    if (!a || !CLS[a.c]) return { item, ok: false, c: null, t: '資料讀不到', asof: null };
    return { item, ok: true, c: a.c, t: a.t, asof: D.as_of || null };
  });
}
export function counts(R) {
  const n = { rule: 0, same: 0, unclear: 0, alt: 0, na: 0 };
  for (const x of R) n[x.ok ? x.c : 'na']++;
  return n;
}
/** The plain summary sentence (depends only on the counts and the execlag row). */
export function headLine(R) {
  const n = counts(R), m = R.length - n.na;
  if (!m) return '資料讀不到，稍後再試。';
  const parts = [['rule', '照建議就好'], ['same', '兩種都可以'], ['unclear', '說不準'], ['alt', '過去自己改比較好']].filter(([k]) => n[k]).map(([k, w]) => `${w} <strong>${n[k]}</strong> 個`).join('、');
  const lag = R.find(x => x.ok && x.item.key === 'execlag');
  const sameDay = lag && lag.c === 'rule' && lag.t.startsWith('當天照做');
  const tail = n.alt === 0
    ? `<strong>沒有一種「自己改」被證明比照建議好</strong>。${sameDay ? '最簡單的做法：<strong>建議變了，當天照做。</strong>' : ''}`
    : `有 ${n.alt} 個過去自己改比較好（見下面標「過去自己改比較好」的那幾列），但都還只是回測、沒經過實盤驗證，建議本身不會因此改變。`;
  return `${m} 個問題裡：${parts}。${tail}`;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Advanced card (always visible at the top of 進階, above the five groups). */
export function digestCard(data, now = Date.now()) {
  const R = rows(data), ok = R.filter(x => x.ok);
  const asof = ok.map(x => x.asof).filter(Boolean).sort()[0] || null;
  const li = R.map(x => `<li class="dg-row"><a href="#${x.item.id}">${esc(x.item.q)}</a><div>${x.ok
    ? `<span class="dg-tag ${CLS[x.c].cls}">${CLS[x.c].tag}</span> ${esc(x.t)}` : '<span class="muted">資料讀不到</span>'}</div></li>`).join('');
  return `<section class="card" id="digest"><h2>想自己改一下做法？過去試過的答案，一張看完</h2>
    <p class="small">下面每一個「我可不可以這樣做」，進階裡都有一張卡用過去的資料算過（含手續費、每天只用當天以前的價格、分前後兩段時間檢查，事先定好怎麼判定）。這裡只把每張卡自己的結論抄成一句話；點問題可以看那張卡的數字。</p>
    <p><strong>結論</strong>：${headLine(R)}</p>
    <ul class="dg-list">${li}</ul>
    <p class="small muted">「照建議就好」＝自己改的做法過去兩段都比較差；「兩種都可以」＝差不多；「說不準」＝沒有證明比較好（兩段不一致或次數太少）；「過去自己改比較好」＝兩段都比較好，但仍只是回測。每一列的判定直接讀那張卡的資料檔（${asof ? asofInline(asof, now) : '資料到 —'}，${WEEKLY_NOTE}），這張卡自己不算任何新的回測、不改建議。過去的結果不保證以後；只供研究，不是投資建議。</p>
  </section>`;
}
