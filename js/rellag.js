// v72: 照建議比一直抱著少賺很多，要不要改成一直抱著？ — pure functions (no DOM, no network).
// The rule is often partly or fully in cash, so in big rallies it trails simply holding, sometimes for years; people judge a
// method against that visible benchmark and switch at the wrong time (Statman 2004 FAJ 60(4); Frazzini & Lamont 2008 JFE
// 88(2); Dichev 2007 AER 97(1)). backtest/rel_lag.py → data/rellag.json: when the rule's money ÷ hold money falls 20%
// below its best, compare the next year: keep following vs switch to 一直抱著. Definitions committed before the first run
// (db30707), IS results before any 2024+ number (706f436). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const pp1 = x => Number.isFinite(x) ? `${Math.abs(x * 100).toFixed(1)} 個百分點` : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const x2 = x => Number.isFinite(x) ? `${x.toFixed(2)} 倍` : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D.grid?.[`d${Math.round((D.headline?.d ?? 0) * 100)}_h${D.headline?.h}`];
export const VWORD = { keep: '繼續照做比較好', switch: '改成一直抱著比較好', unclear: '說不準' };
export const D0 = D => Math.round(D.headline.d * 100);

export function valid(D) {
  const G = HEAD(D || {});
  if (!D || D.is_only || !G || !['keep', 'switch', 'unclear'].includes(D.verdict)) return false;
  return ['is_', 'oos', 'all'].every(p => Number.isInteger(G[p]?.both?.n)) && G.all.both.n > 0 && Number.isFinite(G.all.both.diff_mean)
    && ['BTC', 'ETH'].every(c => ['rule_x', 'hold_x', 'q_now', 'q_best', 'q_low_after', 'maxdd_rule', 'maxdd_hold'].every(k => Number.isFinite(D.coins?.[c]?.[k])))
    && Array.isArray(D.events);
}

/** The biggest (keep − switch) loss among finished triggers → the event that drives the average. */
export function worstEvent(D) {
  const ev = D.events.filter(e => Number.isFinite(e[5]) && Number.isFinite(e[6]));
  return ev.length ? ev.reduce((a, b) => (b[5] - b[6] < a[5] - a[6] ? b : a)) : null;
}

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const G = HEAD(D), i = G.is_.both, o = G.oos.both, d = D0(D), w = worstEvent(D);
  const tail = w ? `平均被一次拉走：${w[0]} ${md(w[1])} 那次改成抱著接下來一年 ${pc1(w[6])}，照做 ${pc1(w[5])}。` : '';
  if (D.verdict === 'keep') return `<strong>落後一直抱著 ${d}% 時改成一直抱著，過去兩段平均都比繼續照做差</strong>（2023 年以前平均差 ${pp1(i.diff_mean)}、2024 年起 ${pp1(o.diff_mean)}）。`;
  if (D.verdict === 'switch') return `<strong>落後一直抱著 ${d}% 時改成一直抱著，過去兩段平均都比較好</strong>（多 ${pp1(-i.diff_mean)}／${pp1(-o.diff_mean)}），但跌幅會深很多。`;
  const oosTxt = o.n ? `2024 年起 ${o.n} 次，平均繼續照做${o.diff_mean >= 0 ? '多' : '少'} ${pp1(o.diff_mean)}` : '2024 年起一次也沒有發生（相對成績一直還沒回到以前最好的時候，所以沒有重新開始算新的一段落後）';
  return `落後一直抱著 ${d}% 時改不改成一直抱著，好壞<strong>說不準</strong>：2023 年以前 ${i.n} 次，其中 ${Math.round(i.keep_gt_switch * i.n)} 次繼續照做比較好（中間的那次多 ${pp1(i.diff_median)}），但平均${i.diff_mean >= 0 ? '多' : '少'} ${pp1(i.diff_mean)}——${tail}${oosTxt}，次數不夠下結論。`;
}

/** Per coin: whole record since 2018 + the biggest relative slide. */
export function coinLine(D, c) {
  const C = D.coins[c];
  const slide = 1 - C.q_low_after / C.q_best;
  return `${c}：${md(C.first_bar)} 起到現在，照建議的錢變成 ${x2(C.rule_x)}、一直抱著 ${x2(C.hold_x)}；中途最慘跌幅照建議 ${pc1(C.maxdd_rule)}、抱著 ${pc1(C.maxdd_hold)}。但「照建議的錢 ÷ 抱著的錢」在 ${md(C.q_best_date)} 最高（${x2(C.q_best)}），之後的大漲到 ${md(C.q_low_after_date)} 只剩 ${x2(C.q_low_after)}（相對少了 ${pct0(slide)}），現在是 ${x2(C.q_now)}。`;
}

function table(D) {
  const ev = D.events.filter(e => e[7] !== 'pending');
  const per = { is_: '2023 年以前', oos: '2024 年起', cross: '跨兩段' };
  const rows = ev.map(e => `<tr><th>${e[0]} ${md(e[1])}<div class="muted small">${per[e[7]]}</div></th><td>${pc1(e[2])}</td><td${e[5] > e[6] ? ' class="hl"' : ''}>${pc1(e[5])}</td><td${e[6] > e[5] ? ' class="hl"' : ''}>${pc1(e[6])}</td></tr>`).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>落後 ${D0(D)}% 那天<div class="muted small">收盤</div></th><th>落後多少<div class="muted small">比最好時</div></th><th>繼續照做<div class="muted small">接下來一年</div></th><th>改成抱著<div class="muted small">全買不動</div></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => `${c} 照建議的錢是一直抱著的 ${x2(D.coins[c].q_now)}`).join('、') + `（都從 ${md(D.coins.BTC.first_bar)} 算）。如果你是最近才開始，要比的是你開始那天之後，不是這個數字。`;
}

/** Advanced card. */
export function relLagCard(D) {
  const id = 'rellag', h2 = '照建議比一直抱著少賺很多，要不要改成一直抱著？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const G = HEAD(D), d = D0(D);
  const you = D.verdict === 'switch' ? '過去落後時改成抱著比較好，但次數很少，而且抱著的跌幅深很多。'
    : `照建議本來就會在大漲時落後一直抱著，這是「少賺一點、換少跌很多」的代價，不是方法壞了。落後很多時才改成抱著，過去${D.verdict === 'keep' ? '是吃虧的' : `${G.all.both.n} 次裡 ${Math.round(G.all.both.keep_gt_switch * G.all.both.n)} 次吃虧，但碰上一次大漲就大賺，等於在賭大行情`}。如果你真的怕錯過大漲，比較好的做法是事先決定「留一部分一直抱著」（同一組的「留一部分抱著」卡），而不是落後時才整個換。`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">照建議常常一部分或全部放現金，大漲的時候會比一直抱著少賺，而且可能落後很久。這張卡回頭看 2018 年起：照建議的錢跟一直抱著比，落後有多大、多久；以及<strong>每次落後到 ${d}% 的那天</strong>，如果改成一直抱著 vs 繼續照做，接下來一年各差多少。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${coinLine(D, 'BTC')}</p>
    <p class="small">${coinLine(D, 'ETH')}</p>
    ${table(D)}
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you}次數很少，這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/rel_lag.py</code> → <code>data/rellag.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。照建議＝每天調到建議比例，每次買賣 0.15%、買進加台幣溢價 0.27%，現金不計利息；一直抱著＝第一天收盤買一次不動（同成本）。落後＝「照建議的錢 ÷ 抱著的錢」比它以前最好的時候少了多少，只用當天以前的價格；觸發＝一段落後中第一次少了 ${d}%（回到最好之後才重新算）；改成抱著＝那天收盤把這個幣的錢全買（整筆都算成本，偏保守）；365 天後比較，還沒滿一年的 ${G.pending} 次不算。分段：2023 年以前＝那一年整段都在 2023 年底以前；2024 年起＝觸發在 2024 年以後。判斷標準事先固定（commit db30707）：兩段平均都是繼續照做比較好、每段至少 ${D.nmin} 次＝「繼續照做比較好」，兩段都比較差＝「改成一直抱著比較好」，其他＝「說不準」。只供對照：落後 10% 或 30%、看半年，結果放在 data 檔。</p>
  </section>`;
}
