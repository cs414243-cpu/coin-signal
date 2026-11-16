// v59: 照建議贏一直抱著，是時機抓得好，還是只是放得比較少？ — pure functions (no DOM, no network).
// The scorecard compares 「照建議」 with 「一直抱著」 (100% in). The rule is on average only ~30% in, so in a falling market
// it wins just by holding less. backtest/same_avg.py → data/sameavg.json compares the rule with 「一開始就放同樣平均比例、
// 之後都不動」, the average taken from 2022–23 only (known before 2024, so 2024+ uses no future information); definitions
// committed before the first run (dfb4de8). Background: Moreira & Muir 2017 JF 72(4); Cederburg, O'Doherty, Wang & Yan 2020
// JFE 138(1) (benchmark must be known in real time); Moskowitz, Ooi & Pedersen 2012 JFE 104(2).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const sh2 = x => Number.isFinite(x) ? x.toFixed(2) : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
export const PERIODS = ['is_', 'oos'];
export const SERIES = ['rule', 'const', 'hold'];

export function valid(D) {
  if (!D || D.is_only || !['better', 'same', 'worse'].includes(D.verdict) || !Number.isFinite(D.oos_p_rule_better?.both)) return false;
  return PERIODS.every(p => SERIES.every(s => ['both', 'BTC', 'ETH'].every(c => Number.isFinite(D.periods?.[p]?.[s]?.[c]?.sharpe) && Number.isFinite(D.periods[p][s][c].total))))
    && Number.isFinite(D.e_is?.BTC) && Number.isFinite(D.e_is?.ETH);
}

/** true when the rule earned more AND had a shallower worst drop than the same-average fixed portfolio in both periods. */
export const ruleAhead = D => PERIODS.every(p => { const r = D.periods[p].rule.both, k = D.periods[p].const.both; return r.total > k.total && r.maxdd > k.maxdd; });

/** Plain conclusion sentence (depends only on the data and the pre-registered verdict). */
export function headLine(D) {
  const P = D.oos_p_rule_better.both, o = D.periods.oos, i = D.periods.is_;
  const nums = `2024 年起照建議 ${pc1(o.rule.both.total)}、固定放同樣平均 ${pc1(o.const.both.total)}；2022–23 年 ${pc1(i.rule.both.total)} vs ${pc1(i.const.both.total)}`;
  if (D.verdict === 'better') return `<strong>照建議的時機有加分</strong>，不只是放得比較少：${nums}（把握 ${pct0(P)}）。`;
  if (D.verdict === 'worse') return `<strong>時機沒有加分</strong>：一開始就放同樣平均比例、之後不動，結果一樣或更好（${nums}）。照建議贏一直抱著，主要是因為放得比較少。`;
  const ahead = ruleAhead(D);
  return `<strong>還沒有證明時機有加分</strong>${ahead ? `，但兩段期間照建議都<strong>賺得比較多、最慘跌幅也比較淺</strong>（${nums}）。2024 年起「照建議比較好」的把握是 ${pct0(P)}，沒到事先定的 95%` : `（${nums}；2024 年起把握 ${pct0(P)}）`}。`;
}

function table(D) {
  const o = D.periods.oos, i = D.periods.is_;
  const name = { rule: '照建議（每天調）', const: `固定放同樣平均<div class="muted small">BTC ${pct0(D.e_is.BTC)}、ETH ${pct0(D.e_is.ETH)}，放了就不動</div>`, hold: '一直抱著（全放）' };
  const head = '<tr><th>兩幣各半</th><th>2024 起<div class="muted small">總報酬</div></th><th>2024 起<div class="muted small">最慘跌幅</div></th><th>2022–23<div class="muted small">總報酬</div></th><th>2022–23<div class="muted small">最慘跌幅</div></th><th>報酬／波動比<div class="muted small">2024 起（2022–23）</div></th></tr>';
  const row = s => `<tr${s === 'rule' ? ' class="hl"' : ''}><th>${name[s]}</th><td>${pc1(o[s].both.total)}</td><td>${dd1(o[s].both.maxdd)}</td><td>${pc1(i[s].both.total)}</td><td>${dd1(i[s].both.maxdd)}</td><td>${sh2(o[s].both.sharpe)}（${sh2(i[s].both.sharpe)}）</td></tr>`;
  return `<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${SERIES.map(row).join('')}</tbody></table></div>`;
}

/** Per-coin line (report only). */
export function coinLine(D) {
  const o = D.periods.oos, P = D.oos_p_rule_better;
  return ['BTC', 'ETH'].map(c => `${c}：2024 年起照建議 ${pc1(o.rule[c].total)}（最慘 ${dd1(o.rule[c].maxdd)}），固定放 ${pct0(D.e_is[c])} ${pc1(o.const[c].total)}（最慘 ${dd1(o.const[c].maxdd)}），照建議比較好的把握 ${pct0(P[c])}`).join('；') + '。';
}

/** What it means today. */
export function nowLine(D) {
  const b = D.exposure_now?.BTC, e = D.exposure_now?.ETH;
  if (!Number.isFinite(b) || !Number.isFinite(e)) return '';
  const p = x => `${Math.round(x * 100)}%`;
  return `現在（${D.as_of} 收盤）照建議是 BTC ${p(b)}、ETH ${p(e)}；「固定放」的做法則是不管漲跌一直放著 BTC ${pct0(D.e_is.BTC)}、ETH ${pct0(D.e_is.ETH)}。`;
}

/** Advanced card. */
export function sameAvgCard(D) {
  const id = 'sameavg', h2 = '照建議贏一直抱著，是時機抓得好，還是只是放得比較少？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const x = D.periods;
  const you = D.verdict === 'worse'
    ? '如果你不想天天看，<strong>只放少一點、一直抱著</strong>過去的結果不比照建議差。'
    : ruleAhead(D)
      ? '照建議比「只放少一點」多做的事，是跌勢裡賣出、漲勢裡放回；過去兩段都有幫到，但證據還不到很確定。不想天天看的話，只放少一點一直抱著比較簡單，代價是過去報酬少很多、最慘跌幅也比較深。'
      : '照建議和「只放少一點」過去互有勝負，選哪個都可以，重點是你承受得了最慘跌幅。';
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">首頁成績單拿照建議和「一直抱著（全放）」比。可是照建議平均只放一部分（2022–23 年平均 BTC 約 ${pct0(D.e_is.BTC)}、ETH 約 ${pct0(D.e_is.ETH)}），幣價跌時它本來就會少虧——那不一定是預測準。公平的比法：<strong>一開始就放同樣的平均比例、之後都不動</strong>。比例只用 2022–23 年算，2024 年起是事先就知道的數字，不偷看未來；都含手續費。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${coinLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you}這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/same_avg.py</code> → <code>data/sameavg.json</code>（冠軍 trend_vt@1 凍結 walk-forward，Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。照建議＝每天調到建議比例；固定放＝期間第一天把各幣的錢放進 2022–23 年平均比例、其餘留現金、之後不買不賣；兩幣各半；每次買賣 0.15%、買進再加台幣溢價 0.27%，沒放的錢不計利息；2022–23 與 2024 起各自從現金重新開始（2022–23 的比例是同期間配的）。報酬／波動比＝年化 Sharpe；把握＝28 天區塊拔靴法 2,000 次。判斷標準事先固定（commit dfb4de8）：兩段都比固定放高 0.02 以上且 2024 起把握 ≥ 95% 才算「時機有加分」，兩段都低 0.02 以上算「沒加分」，其他是「還沒有證明」。只供對照：比例改用 2024 起自己的平均（事後才知道）報酬／波動比 ${sh2(x.oos.const_post?.both?.sharpe)}、每天調回固定比例 ${sh2(x.oos.const_daily?.both?.sharpe)}，都低於照建議 ${sh2(x.oos.rule.both.sharpe)}。</p>
  </section>`;
}
