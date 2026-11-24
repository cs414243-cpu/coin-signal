// v98: 建議剛好在美國重要數據公布前變了：要等公布完再動手嗎？ — pure functions (no DOM, no network).
// backtest/event_wait.py → data/eventwait.json: the frozen champion's walk-forward exposures; when a scheduled US CPI /
// non-farm payrolls / FOMC release (forecast/events/data/calendar.json, the same calendar as 「本週要注意」) falls within
// the next 1/2/3 days, the waiting copy does nothing until the morning after the release. paper_sim costs, NT$1M 50/50.
// Definitions committed before the first run (e67cfb3), IS-only results before any 2024+ number (bcd64aa).
// Scheduled macro news moves prices at the release (Andersen, Bollerslev, Diebold & Vega 2003 AER 93(1):38–62,
// doi 10.1257/000282803321455151); that is not evidence that waiting helps a trend follower.
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pcs = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.00005 ? '0.00%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(2)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const LABEL = { now: '當天照做', wait1: '公布在 1 天內就等', wait2: '公布在 2 天內就等', wait3: '公布在 3 天內就等', buywait2: '只有買進等（2 天內）', sellwait2: '只有賣出等（2 天內）' };
export const ORDER = ['now', 'wait1', 'wait2', 'wait3', 'buywait2', 'sellwait2'];
export const ANSWERS = ['wait_helps', 'dont_wait', 'no_difference', 'unclear'];
const KIND = { CPI: '美國 CPI（通膨）', NFP: '美國非農就業', FOMC: '聯準會利率決議' };
export const P = (D, r, k = 'oos') => D?.results?.[r]?.pooled?.[k];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.rules || v.head !== 'wait2' || !ANSWERS.includes(v.answer)) return false;
  return ORDER.every(r => ['is_', 'oos'].every(k => Number.isFinite(P(D, r, k)?.sharpe) && Number.isFinite(P(D, r, k)?.cagr) && Number.isFinite(P(D, r, k)?.maxdd)))
    && ORDER.slice(1).every(r => ['better', 'worse', 'same', 'mixed'].includes(v.rules[r]))
    && ['is_', 'oos'].every(k => Number.isInteger(D.episodes?.[k]?.all?.n) && Number.isFinite(D.descriptive?.[k]?.near_share));
}

const pair = (D, r, k = 'oos') => `年化 ${pc1(P(D, r, k).cagr)}、最慘跌幅 ${pc1(P(D, r, k).maxdd)}`;

/** Short plain answer used by the homepage line and the digest. */
export function shortAnswer(D) {
  const a = D.verdict.answer;
  return a === 'wait_helps' ? '過去等公布完再做比較好（仍只是回測）'
    : a === 'dont_wait' ? '過去等公布完再做明顯比較差，照建議當天做'
    : a === 'no_difference' ? '過去等公布完再做和當天做差不多，照建議當天做就好'
    : '過去等不等說不準，照建議當天做就好';
}

export function headLine(D) {
  const a = D.verdict.answer;
  const head = a === 'wait_helps' ? '<strong>等公布完再做，過去兩段都比較好</strong>（仍只是回測、沒經過實盤）。'
    : a === 'dont_wait' ? '<strong>不要等：等公布完再做，過去兩段都明顯比較差。</strong>'
    : a === 'no_difference' ? '<strong>不用等：等公布完再做，過去和當天做差不多</strong>，而且前後兩段一段略好、一段略差，方向相反。'
    : '<strong>說不準</strong>：兩段時間結果不一致，沒有證明等一下比較好。';
  return `${head}2024 年起（兩幣各半、含手續費）：當天照做 ${pair(D, 'now')}；公布在 2 天內就等 ${pair(D, 'wait2')}。2022–23 年：當天照做 ${pair(D, 'now', 'is_')}；等 ${pair(D, 'wait2', 'is_')}。`;
}

export function epLine(D) {
  const o = D.episodes.oos.all, i = D.episodes.is_.all, dO = D.descriptive.oos, dI = D.descriptive.is_;
  return `多常碰到：美國這三種公布一年約 ${Math.round(dO.release_days_per_year)} 天；建議有變的日子裡，2 天內剛好有公布的，2024 年起占 ${pc0(dO.near_share)}（${dO.change_days_near}／${dO.change_days} 天），2022–23 年占 ${pc0(dI.near_share)}。`
    + `每一次「等了」的結果（以那個幣的錢計，含之後一天）：2024 年起 ${o.n} 次，等了比較好的 ${pc0(o.ahead)}，中間值 ${pcs(o.median)}；2022–23 年 ${i.n} 次，等了比較好的 ${pc0(i.ahead)}，中間值 ${pcs(i.median)}——每次差的都不大，而且兩段方向相反。`;
}

export function kindLine(D) {
  const b = D.episodes.oos.by_kind || {}, a = D.episodes.is_.by_kind || {};
  return '分公布種類（等了比較好的比例，2024 年起／2022–23 年）：' + ['CPI', 'NFP', 'FOMC'].map(k => `${KIND[k]} ${pc0(b[k]?.ahead)}／${pc0(a[k]?.ahead)}（${b[k]?.n ?? 0}／${a[k]?.n ?? 0} 次）`).join('、') + '。次數很少，不要只看單一種類下結論。';
}

function table(D) {
  const row = r => {
    const o = P(D, r), i = P(D, r, 'is_'), pw = D.results[r].oos_p_worse;
    return `<tr><th>${LABEL[r]}</th><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${pc1(i.cagr)}／${pc1(i.maxdd)}／${f2(i.sharpe)}</td><td>${r === 'now' ? '—' : pw >= 0.995 ? '超過 99%' : pc0(pw)}</td></tr>`;
  };
  return `<div class="scroll"><table class="bt"><thead><tr><th>做法</th><th>2024 起年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 年化／最慘／夏普</th><th>比當天照做差的把握</th></tr></thead><tbody>${ORDER.map(row).join('')}</tbody></table></div>`;
}

export function betterNote(D) {
  const b = ORDER.slice(1).filter(r => D.verdict.rules[r] !== 'better' && (P(D, r).sharpe > P(D, 'now').sharpe || P(D, r, 'is_').sharpe > P(D, 'now', 'is_').sharpe));
  return b.length ? `${b.map(r => LABEL[r]).join('、')}在其中一段看起來比當天照做好，但另一段差不多或比較差——沒有證明等一下比較好。` : '';
}

/** Next scheduled release from data/events.json (daily) — falls back to the data file's own next_release. */
export function nextLine(D, EV, weekLine) {
  const up = EV?.upcoming || [];
  if (up.length && weekLine) return `這 7 天有：${up.map(weekLine).join('；')}。`;
  if (EV?.next_after && weekLine) return `未來 7 天沒有這三種公布；下一個是 ${weekLine(EV.next_after)}。`;
  const n = D.next_release; return n ? `下一個公布（美國日期）：${n.utc_candle} ${KIND[n.kind] || n.kind}。` : '';
}

/** Homepage 「本週要注意」: one sentence, only when a release is within the next 7 days. */
export function weekExtra(D, EV) {
  if (!valid(D) || !(EV?.upcoming?.length)) return '';
  return `<p class="small">公布前一兩天建議如果剛好變了：${shortAnswer(D)}。<a href="#eventwait">（看回測）</a></p>`;
}

export function you(D) {
  const a = D.verdict.answer;
  if (a === 'wait_helps') return '過去等公布完再做比較好，但這只是回測、建議本身不會因此改變；要不要等，你自己決定。';
  return '建議變了就照「建議變了當天照做」的原則，公布日不用特別等、也不用特別提早。'
    + '如果你擔心公布當晚幣價跳動，比較好的做法是一開始就把打算放的錢調少，而不是每次遇到公布就拖。'
    + '回測假設剛好用早上 8 點的收盤價成交；過去的結果不保證未來。';
}

/** Advanced card. EV = data/events.json (for the next release), weekLine = events.js weekLine. */
export function eventWaitCard(D, EV = null, weekLine = null) {
  const id = 'eventwait', h2 = '建議剛好在美國重要數據公布前變了：要等公布完再動手嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">首頁「本週要注意」會列出美國 CPI（通膨）、非農就業、聯準會利率決議的公布時間（台北時間大多是晚上 8:30／9:30，聯準會是半夜 2:00／3:00）。建議如果剛好在公布前一兩天早上變了，很多人會想「等數字出來再說」。這張卡把同一份過去的建議，遇到 1／2／3 天內有公布就先不動、等公布完的隔天早上才照做，和當天照做比；也分開看「只有買進等」「只有賣出等」。都含手續費、兩幣各半 NT$100 萬（同虛擬投資）。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${epLine(D)}</p>
    <p class="small">${kindLine(D)}</p>
    <p class="small">${betterNote(D)}</p>
    <p class="small">${nextLine(D, EV, weekLine)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/event_wait.py</code> → <code>data/eventwait.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；公布日程＝聯準會、美國勞工統計局官方日程，都是事前幾週就公布的；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。「等」＝第 t 天早上 8 點的收盤之後 N 天內有公布，就維持前一天的比例，到公布那天的日K收完（公布後的隔天早上 8 點）才照做。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息。判定事先固定（commit e67cfb3）：夏普差 ${D.sharpe_tol} 以內、最慘跌幅差 ${Math.round(D.dd_tol * 100)} 個百分點以內算「差不多」；兩段都好 ${D.sharpe_tol} 以上、且 2024 年起比較差的把握 ≤ ${pc0(D.p_better)} 才算「比較好」。「比當天照做差的把握」＝2024 年起每日報酬 28 天區塊重抽 ${D.boot.n} 次。</p>
  </section>`;
}
