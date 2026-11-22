// v92: 一週只能看一次 App，照做會差多少？ — pure functions (no DOM, no network).
// backtest/weekly_check.py → data/weeklycheck.json: the frozen champion's walk-forward exposures followed every day
// (= virtual portfolio) vs only on one fixed weekday (all 7 weekdays computed): "all_" = every change waits for that day;
// "cut_" = cuts/sells done the same morning (e.g. via the calendar alert), only buys/adds wait. Definitions committed before
// the first run (06c79bc), IS-only results before any 2024+ number. Rebalance timing luck: Hoffstein, Sibears & Faber 2019
// (SSRN 3319045); Hoffstein, Faber & Braun 2020 (SSRN 3673910). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const wan = x => Number.isFinite(x) ? `${(x / 10000).toFixed(1)} 萬` : '—';
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const ZH = { mon: '週一', tue: '週二', wed: '週三', thu: '週四', fri: '週五', sat: '週六', sun: '週日' };
const ANS = ['weekly_ok', 'cut_on_time', 'daily_better', 'unclear'];
const VERD = ['similar', 'worse', 'mixed'];
const S = (D, r, k = 'oos') => D?.rules?.[r]?.[k];
const FM = (D, f, k = 'oos') => D?.families?.[f]?.[k];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.families || !ANS.includes(v.answer) || !['all', 'cut'].every(f => VERD.includes(v.families[f]))) return false;
  const rules = ['daily', ...['all', 'cut'].flatMap(f => DAYS.map(d => `${f}_${d}`))];
  return rules.every(r => ['is_', 'oos'].every(k => ['sharpe', 'cagr', 'maxdd', 'end_per_1m'].every(x => Number.isFinite(S(D, r, k)?.[x]))))
    && ['all', 'cut'].every(f => ['is_', 'oos'].every(k => ['mean_sharpe', 'mean_maxdd', 'mean_end', 'min_end', 'max_end', 'skipped_share', 'mean_wait', 'trade_days_per_year'].every(x => Number.isFinite(FM(D, f, k)?.[x])))
      && DAYS.includes(D.families[f].best_is_day) && Number.isInteger(D.families[f].best_is_day_oos_rank) && Number.isFinite(D.families[f].oos_p_worse))
    && Number.isFinite(S(D, 'daily', 'oos')?.end_per_1m) && D.now && ['BTC', 'ETH'].every(c => Number.isFinite(D.now[c]));
}

const word = v => v === 'similar' ? '照事先定的標準算差不多' : v === 'worse' ? '2022–23 和 2024 年起兩段都明顯變差' : '兩段不一致（說不準）';

/** Plain conclusion (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const a = D.verdict.answer, d = S(D, 'daily'), A = FM(D, 'all'), Cc = FM(D, 'cut');
  const head = a === 'weekly_ok' ? '<strong>一週看一次、那天再全部照做，過去差不多</strong>。'
    : a === 'cut_on_time' ? '<strong>一週看一次全部照做會變差；但「要減碼當天就做、只有買進等到那天」差不多</strong>。'
    : a === 'daily_better' ? '<strong>最好每天看</strong>：一週才看一次，不管怎麼做都明顯變差。'
    : '<strong>每天看最穩；一週只看一次全部照做明顯變差</strong>，「減碼當天做、買進等」說不準。';
  return `${head}2024 年起每 NT$100 萬（兩幣各半、含手續費）：每天照做 → ${wan(d.end_per_1m)}（最慘跌幅 ${pc1(d.maxdd)}）；`
    + `固定一天才看、那天全部照做 → 平均 ${wan(A.mean_end)}（看哪一天：${wan(A.min_end)}～${wan(A.max_end)}；最慘跌幅平均 ${pc1(A.mean_maxdd)}；${word(D.verdict.families.all)}）；`
    + `減碼當天做、買進等到那天 → 平均 ${wan(Cc.mean_end)}（${wan(Cc.min_end)}～${wan(Cc.max_end)}；最慘跌幅平均 ${pc1(Cc.mean_maxdd)}；${word(D.verdict.families.cut)}）。`;
}

/** Why: what weekly checking misses (both parts from the data). */
export function whyLine(D) {
  const A = FM(D, 'all'), Cc = FM(D, 'cut'), d = S(D, 'daily');
  return `<strong>為什麼會差</strong>：2024 年起每天照做平均每年動手約 ${Math.round(D.rules.daily.desc.oos.trade_days_per_year)} 天；一週看一次只剩約 ${Math.round(A.trade_days_per_year)} 天（手續費比較少），`
    + `但有 ${pc0(A.skipped_share)} 的「轉成買進」在下次看之前就又結束了，整趟錯過；真的買到的，平均也晚 ${A.mean_wait.toFixed(1)} 天。`
    + `拆開看（2024 年起每 100 萬）：<strong>買進晚、錯過幾趟</strong>少了約 ${wan(d.end_per_1m - Cc.mean_end)}（每天照做 vs 減碼當天做）；<strong>減碼也拖到那天</strong>再少約 ${wan(Cc.mean_end - A.mean_end)}，而且最慘跌幅從平均 ${pc1(Cc.mean_maxdd)} 變成 ${pc1(A.mean_maxdd)}。`;
}

/** Timing luck: which weekday — do not pick one. */
export function luckLine(D) {
  const A = D.families.all, Cc = D.families.cut;
  const same = A.best_is_day === A.best_oos_day && A.best_is_day_oos_rank === 1;
  return `<strong>星期幾比較好？不要選</strong>：同一套建議，只是看的日子不同，2024 年起每 100 萬就差了 ${wan(FM(D, 'all').max_end - FM(D, 'all').min_end)}。`
    + (same ? `${ZH[A.best_is_day]}在 2022–23 和 2024 年起剛好都最好，但這是 7 天裡挑出來的（光靠運氣也常會這樣），沒有理由相信${ZH[A.best_is_day]}以後也比較好。`
      : `2022–23 最好的是${ZH[A.best_is_day]}，到 2024 年起排第 ${A.best_is_day_oos_rank}（7 天中）——換了時期就換了名次。`)
    + `研究也發現：同一套方法只因調整的日子不同，成績就可以差很多（Hoffstein 等人 2019、2020 稱為「調整日的運氣」），而且訊號變得越快、越少調整，差越多。`;
}

function table(D) {
  const row = (lab, r) => { const o = S(D, r), i = S(D, r, 'is_'); return `<tr><th>${lab}</th><td>${wan(o.end_per_1m)}</td><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${f2(i.sharpe)}</td></tr>`; };
  const fam = (lab, f) => { const o = FM(D, f), i = FM(D, f, 'is_'); return `<tr><th>${lab}（7 天平均）</th><td>${wan(o.mean_end)}</td><td>${pc1(o.blend?.cagr)}</td><td>${pc1(o.mean_maxdd)}</td><td>${f2(o.mean_sharpe)}</td><td>${f2(i.mean_sharpe)}</td></tr>`; };
  const days = f => DAYS.map(d => `${ZH[d]} ${wan(S(D, `${f}_${d}`).end_per_1m)}`).join('、');
  return `<div class="scroll"><table class="bt"><thead><tr><th>怎麼做</th><th>2024 起每 100 萬變成</th><th>年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 穩定度</th></tr></thead><tbody>
    ${row('每天看、當天照做', 'daily')}${fam('固定一天看、那天全部照做', 'all')}${fam('減碼當天做、買進等到那天', 'cut')}</tbody></table></div>
    <p class="small muted">固定哪一天（2024 起每 100 萬）——全部等那天：${days('all')}。減碼當天做：${days('cut')}。</p>`;
}

export function betterNote(D) {
  const b = ['all', 'cut'].filter(f => FM(D, f).mean_sharpe > S(D, 'daily').sharpe || FM(D, f, 'is_').mean_sharpe > S(D, 'daily', 'is_').sharpe);
  return b.length ? `${b.map(f => f === 'all' ? '「那天全部照做」' : '「減碼當天做、買進等」').join('、')}在 2022–23 看起來比每天照做還好，但 2024 年起較差——沒有證明比較好。` : '';
}

export function nowLine(D) {
  const zero = ['BTC', 'ETH'].every(c => D.now[c] < 0.005);
  return zero ? '現在：BTC、ETH 建議都是 0（空手），下一次動作一定是「買進」——一週才看一次的話，很可能晚幾天買到，或整趟錯過短的那幾次。'
    : `現在：${['BTC', 'ETH'].map(c => `${c} 建議 ${pc0(D.now[c])}`).join('、')}——手上有幣時，最重要的是建議變少那天就照做。`;
}

export function you(D) {
  return '<strong>對你來說</strong>：① 能每天看最好（早上 8 點收盤後看一眼就好），少賺的大部分來自買進晚了、錯過短的那幾趟；'
    + '② 不能每天看，就在首頁下面按「加到 iPhone 行事曆」，建議變了標題會有 ⚠️，那天再打開照做——等於每天看；至少<strong>減碼／賣出那天一定要做</strong>，拖著不賣最容易讓跌幅變大；'
    + '③ 不要因為某個星期幾過去比較好就固定那天，那多半是運氣。過去的結果不保證未來。';
}

/** Advanced card. */
export function weeklyCheckCard(D) {
  const id = 'weeklycheck', h2 = '一週只能看一次 App，照做會差多少？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 的成績都假設你每天早上 8 點後看、建議一變當天就照做。如果只能固定每週某一天看一次（例如每週日），建議變了要等到那天才動。這張用同一份過去的建議，7 個星期幾都算一次，和每天照做比（「晚幾天才照做」那張是每次都晚同樣天數，這張是固定日子，所以短的那幾趟會整趟錯過）。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${whyLine(D)}</p>
    ${table(D)}
    <p class="small">${betterNote(D)}</p>
    <p class="small">${luckLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small">${you(D)}</p>
    <p class="small muted">算法：<code>backtest/weekly_check.py</code> → <code>data/weeklycheck.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息。「明顯變差」事先固定（commit 06c79bc）：7 天平均夏普少 ${D.sharpe_tol} 以上或平均最慘跌幅多 ${Math.round(D.dd_tol * 100)} 個百分點以上，2022–23 和 2024 起兩段都變差才算。2024 年起 7 天平均的結果比每天照做差的把握：全部等那天 ${pc0(D.families.all.oos_p_worse)}、減碼當天做 ${pc0(D.families.cut.oos_p_worse)}（每日報酬 28 天區塊重抽 ${D.boot.n} 次）。整趟錯過＝冠軍的一次進場（建議從 0 變成大於 0、到變回 0），在你看的那天之前就結束了。</p>
  </section>`;
}
