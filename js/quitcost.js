// v60: 連賠好幾次，想放棄不照做了？過去放棄的代價 — pure functions (no DOM, no network).
// The rule is "many small losing trips + a few big winners" (v36). People abandon a method right after a losing run.
// backtest/quit_cost.py → data/quitcost.json: after the 3rd losing trip in a row (rule back at 0), compare over the next
// year: keep following vs quit to cash vs quit into 一直抱著; definitions committed before the first run (9d6159b), IS
// results before any 2024+ number (6079539). Background: Dichev 2007 AER 97(1); Frazzini & Lamont 2008 JFE 88(2).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const pp1 = x => Number.isFinite(x) ? `${Math.abs(x * 100).toFixed(1)} 個百分點` : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const ntw = x => Number.isFinite(x) ? `NT$${Math.round(Math.abs(x) * 1e6).toLocaleString('en-US')}` : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D.grid?.[`k${D.headline?.k}_h${D.headline?.h}`];
export const VWORD = { keep: '繼續照做比較好', quit: '放棄比較好', unclear: '說不準' };

export function valid(D) {
  const G = HEAD(D || {});
  if (!D || D.is_only || !G || !D.verdict || !['keep', 'quit', 'unclear'].includes(D.verdict.cash) || !['keep', 'quit', 'unclear'].includes(D.verdict.hold)) return false;
  return ['is_', 'oos', 'all'].every(p => Number.isInteger(G[p]?.both?.n)) && G.all.both.n > 0 && Number.isFinite(G.all.both.keep_mean)
    && ['BTC', 'ETH'].every(c => Number.isInteger(D.coins?.[c]?.streak_now)) && Array.isArray(D.events);
}

/** Plain conclusion (depends only on data + pre-registered verdicts). */
export function headLine(D) {
  const G = HEAD(D), i = G.is_.both, o = G.oos.both, k = D.headline.k;
  const vc = D.verdict.cash === 'keep'
    ? `<strong>連賠 ${k} 趟之後放棄、改成空手，過去兩段平均都比繼續照做差</strong>：接下來一年繼續照做平均 2023 年以前 ${pc1(i.keep_mean)}（${i.n} 次）、2024 年起 ${pc1(o.keep_mean)}（${o.n} 次），空手是 0。`
    : D.verdict.cash === 'quit'
      ? `<strong>連賠 ${k} 趟之後，過去改成空手反而比較好</strong>：接下來一年繼續照做平均 2023 年以前 ${pc1(i.keep_mean)}、2024 年起 ${pc1(o.keep_mean)}。`
      : `連賠 ${k} 趟之後放棄改成空手，好壞<strong>說不準</strong>（接下來一年繼續照做平均 2023 年以前 ${pc1(i.keep_mean)}（${i.n} 次）、2024 年起 ${pc1(o.keep_mean)}（${o.n} 次））。`;
  const vh = D.verdict.hold === 'keep'
    ? `改成一直抱著也比繼續照做差（平均差 ${pc1(i.diff_hold_mean)}／${pc1(o.diff_hold_mean)}）。`
    : D.verdict.hold === 'quit'
      ? `改成一直抱著過去兩段都比繼續照做好（平均多 ${pc1(-i.diff_hold_mean)}／${pc1(-o.diff_hold_mean)}），但跌幅會深很多。`
      : `改成一直抱著則<strong>說不準</strong>：2023 年以前繼續照做平均${i.diff_hold_mean >= 0 ? '多' : '少'} ${pp1(i.diff_hold_mean)}，2024 年起${o.diff_hold_mean >= 0 ? '多' : '少'} ${pp1(o.diff_hold_mean)}，而且一直抱著的那一年最差一次 ${pc1(minHold(D))}。`;
  return vc + vh;
}
export const minHold = D => Math.min(...D.events.filter(e => Number.isFinite(e[4])).map(e => e[4]));

function table(D) {
  const ev = D.events.filter(e => e[5] !== 'pending');
  const per = { is_: '2023 年以前', oos: '2024 年起', cross: '跨兩段' };
  const rows = ev.map(e => `<tr><th>${e[0]} ${md(e[1])}<div class="muted small">${per[e[5]]}</div></th><td${e[3] > e[4] ? ' class="hl"' : ''}>${pc1(e[3])}</td><td>0%</td><td${e[4] > e[3] ? ' class="hl"' : ''}>${pc1(e[4])}</td></tr>`).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>連賠 ${D.headline.k} 趟那天<div class="muted small">收盤</div></th><th>繼續照做<div class="muted small">接下來一年</div></th><th>放棄→空手<div class="muted small">不放</div></th><th>放棄→抱著<div class="muted small">全買不動</div></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** Is a losing streak a sign the method broke? Next trip after ≥k losses vs all trips. */
export function nextLine(D) {
  const k = String(D.headline.k);
  return ['BTC', 'ETH'].map(c => {
    const N = D.coins[c].next_trip; if (!N?.[k] || !N.all_trips) return '';
    const a = N[k], b = N.all_trips;
    return `${c} 連賠 ${k} 趟以上之後的下一趟賺錢的比例：2023 年以前 ${pct0(a.is_.win)}（${a.is_.n} 趟，全部趟 ${pct0(b.is_.win)}）、2024 年起 ${pct0(a.oos.win)}（${a.oos.n} 趟，全部趟 ${pct0(b.oos.win)}）`;
  }).filter(Boolean).join('；') + '。' + nextVerdict(D);
}
/** Data-driven: how many (coin × period) cells have the next trip winning less often than all trips. */
export function nextWorse(D) {
  const k = String(D.headline.k); let w = 0, n = 0;
  for (const c of ['BTC', 'ETH']) for (const p of ['is_', 'oos']) {
    const a = D.coins[c].next_trip?.[k]?.[p], b = D.coins[c].next_trip?.all_trips?.[p];
    if (a?.n && Number.isFinite(a.win) && Number.isFinite(b?.win)) { n++; if (a.win < b.win) w++; }
  }
  return { w, n };
}
function nextVerdict(D) {
  const { w, n } = nextWorse(D);
  if (!n) return '';
  if (w === 0) return '連賠之後的下一趟並沒有比較常賠。';
  if (w === n) return '連賠之後的下一趟比較常賠，這點要留意。';
  return '有的時期比較常賠、有的時期比較少賠，沒有一致的「連賠就代表方法壞了」。';
}

/** Today: each coin's current losing streak. */
export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c], L = C.last_trip;
    if (C.open_trip) return `${c} 這一趟還沒結束（前面已連賠 ${C.streak_now} 趟）`;
    return `${c} ${C.streak_now ? `已連賠 ${C.streak_now} 趟` : '沒有在連賠'}${L ? `（上一趟 ${md(L.start)}～${md(L.end)} 收盤，${pc1(L.r)}）` : ''}`;
  }).join('；') + '。';
}

/** Advanced card. */
export function quitCostCard(D) {
  const id = 'quitcost', h2 = '連賠好幾次，想放棄不照做了？過去放棄的代價';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const G = HEAD(D), A = G.all.both, k = D.headline.k;
  const you = D.verdict.cash === 'keep'
    ? `連賠好幾趟時最想做的「乾脆不管了、先空手」，過去是最吃虧的做法。如果連賠讓你很難受，比較溫和的做法是把打算放的錢調少一點、照樣照建議（放少一點，賺和賠都等比例變小），而不是中途停掉。`
    : D.verdict.cash === 'quit' ? '過去連賠之後先停一陣子並沒有吃虧，但次數很少，不代表以後也一樣。' : '次數很少，放不放棄都沒有明顯的好壞，重點是你承受得了最慘跌幅。';
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">照建議的方法大部分是小賠、少數大賺（見「每一次進場的結果」），所以常會連賠好幾趟，這時最容易想放棄。這張卡回頭看：<strong>每次連賠到第 ${k} 趟、建議回到 0 的那天</strong>，如果放棄（改成空手或改成一直抱著）vs 繼續照做，接下來一年各差多少。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">全部 ${A.n} 次合起來：繼續照做接下來一年平均 ${pc1(A.keep_mean)}，${pct0(A.keep_pos)} 的次數是賺的，最差一次 ${pc1(A.keep_worst)}；每 100 萬打算放在這個幣的錢，平均比空手${A.keep_mean >= 0 ? '多' : '少'} ${ntw(A.keep_mean)}。</p>
    ${table(D)}
    <p class="small">連賠代表方法壞了嗎？${nextLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you}次數很少（每段只有幾次），這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/quit_cost.py</code> → <code>data/quitcost.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0（同「每一次進場的結果」）；連賠＝連續幾趟結果 ≤ 0，賺一趟就重新算。觸發＝連賠剛好到第 ${k} 趟那天收盤（那時建議是 0，三種做法都從現金開始）。繼續照做＝之後每天調到建議比例，每次買賣 0.15%、買進加台幣溢價 0.27%；一直抱著＝那天收盤全買、之後不動（同成本）；空手不計利息；365 天後比較，還沒滿一年的 ${G.pending} 次不算。分段：2023 年以前＝那一年整段都在 2023 年底以前；2024 年起＝觸發在 2024 年以後；跨兩段的只算在全部。判斷標準事先固定（commit 9d6159b）：兩段平均都比放棄好、每段至少 ${D.nmin} 次＝「繼續照做比較好」，兩段都比較差＝「放棄比較好」，其他＝「說不準」。只供對照：連賠 2 趟或 4 趟、看半年，結果放在 data 檔。</p>
  </section>`;
}
