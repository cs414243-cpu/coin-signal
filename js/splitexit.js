// v56: 建議變成 0 時：一次賣完還是分幾天？（從 0 變成要放時：一次買還是分幾天？）— pure functions (no DOM, no network).
// backtest/split_exit.py → data/splitexit.json: the frozen champion's own walk-forward exposures, exit/entry spread over
// 2/3/5 days (sell/buy 1/N per day) vs all at once, same costs as the virtual portfolios, rules fixed before the first run
// (commit 3bbf8ed), 2022–23 / 2024+ checked separately. Not a signal; the recommendation itself is unchanged.
// Why: the suggestion is 0 now; someone still holding coins asks whether to spread the sale "in case it bounces".
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const R_EXIT = ['exit2', 'exit3', 'exit5'], R_ENTRY = ['entry2', 'entry3', 'entry5'];
const SHORT = { now: '一次做完', exit2: '分 2 天賣', exit3: '分 3 天賣', exit5: '分 5 天賣', entry2: '分 2 天買', entry3: '分 3 天買', entry5: '分 5 天買' };
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const sh2 = x => Number.isFinite(x) ? x.toFixed(2) : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
/** NT$ per NT$1,000,000 at stake, rounded to NT$100, with 多/少 wording. */
export const ntd = d => { const v = Math.round(Math.abs(d) * 1e6 / 100) * 100; return `${d < 0 ? '少' : '多'} NT$${v.toLocaleString('en-US')}`; };

export function valid(D) {
  const r = D?.results; if (!r?.now?.pooled?.oos || !r?.now?.pooled?.is_) return false;
  return [...R_EXIT, ...R_ENTRY].every(k => r[k]?.pooled?.oos && r[k]?.events?.all?.n > 0 && r[k]?.verdict);
}

/** Plain verdict sentence for exits (headline exit3). */
export function exitLine(D) {
  const r = D.results, e = r.exit3, n = r.now;
  const head = e.verdict === 'worse' ? '<strong>一次賣完就好</strong>：分 3 天賣完，回測裡沒有比較好'
    : e.verdict === 'better' ? '分 3 天賣完在回測裡比較好（兩段都好、把握 95% 以上）'
    : '<strong>差不多，沒有證明分天賣比較好</strong>：一次賣完最簡單';
  return `${head}——2022–23 年（拿來選的期間）照建議的 Sharpe 從 ${sh2(n.pooled.is_.sharpe)} 降到 ${sh2(e.pooled.is_.sharpe)}，2024 年起（之後檢查）從 ${sh2(n.pooled.oos.sharpe)} 降到 ${sh2(e.pooled.oos.sharpe)}；最慘跌幅${e.pooled.oos.maxdd < n.pooled.oos.maxdd ? '也更深' : ''}（2024 年起 ${dd1(n.pooled.oos.maxdd)} → ${dd1(e.pooled.oos.maxdd)}）。`
    .replace(/照建議的 Sharpe 從/g, '照建議的「報酬／波動比」從');
}

/** Per-event sentence: what happened each time the suggestion became 0. */
export function eventLine(D) {
  const ev = D.results.exit3.events, a = ev.all, i = ev.is_, o = ev.oos;
  return `過去 ${a.n} 次建議變成 0（2022 年起，BTC ${ev.coins.BTC.n} 次、ETH ${ev.coins.ETH.n} 次）：分 3 天賣完和當天賣完比，每 NT$100 萬的幣平均${ntd(a.mean)}（2022–23 年 ${i.n} 次平均${ntd(i.mean)}；2024 年起 ${o.n} 次平均${ntd(o.mean)}）。分天比較好的次數占 ${pct0(a.share_better)}；最好的一次${ntd(a.best)}、最差的一次${ntd(a.worst)}。平均差別不大，但單次可能差很多，而且沒有「等反彈」的固定好處。`;
}

/** After-signal context: average price move in the next 3 days after the day it became 0. */
export function afterLine(D) {
  const x = D.after?.exit; if (!x) return '';
  const f = (c, k) => x[c]?.d3?.[k]; const s = (c, k) => { const v = f(c, k); return v?.n ? `${c} ${pc1(v.mean)}` : `${c} —`; };
  return `建議變成 0 之後 3 天，價格平均：2022–23 年 ${s('BTC', 'is_')}、${s('ETH', 'is_')}（大多繼續跌）；2024 年起 ${s('BTC', 'oos')}、${s('ETH', 'oos')}（有時反彈、有時繼續跌）。也就是說，「先賣一部分、等反彈再賣」沒有固定的好處。`;
}

export function entryLine(D) {
  const r = D.results, e = r.entry3, n = r.now;
  const flip = e.pooled.is_.sharpe > n.pooled.is_.sharpe && e.pooled.oos.sharpe < n.pooled.oos.sharpe;
  const head = e.verdict === 'better' ? '分 3 天買在回測裡比較好' : e.verdict === 'worse' ? '分 3 天買在回測裡比較差' : '<strong>沒有證明分天買比較好</strong>';
  return `${head}：2022–23 年 ${sh2(n.pooled.is_.sharpe)} → ${sh2(e.pooled.is_.sharpe)}，2024 年起 ${sh2(n.pooled.oos.sharpe)} → ${sh2(e.pooled.oos.sharpe)}${flip ? '（前後兩段方向相反，像是運氣）' : ''}。建議變成要放時，照建議當天買就好；怕一次買在高點，可以少放一點，而不是拖幾天。`;
}

function table(D, keys) {
  const r = D.results;
  const head = '<tr><th>做法</th><th>2024 起年化</th><th>報酬／波動比<div class="muted small">2024 起（2022–23）</div></th><th>最慘跌幅<div class="muted small">2024 起</div></th><th>每年成本</th><th>比一次做完好的把握</th></tr>';
  const row = k => { const x = r[k], o = x.pooled.oos;
    return `<tr><th>${SHORT[k]}</th><td>${pc1(o.cagr)}</td><td>${sh2(o.sharpe)}（${sh2(x.pooled.is_.sharpe)}）</td><td>${dd1(o.maxdd)}</td><td>${pc1(o.cost_yr).replace('+', '')}</td><td>${k === 'now' ? '—' : pct0(x.oos_p_better)}</td></tr>`; };
  return `<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${['now', ...keys].map(row).join('')}</tbody></table></div>`;
}

/** Advanced card 「建議變成 0 時：一次賣完還是分幾天？」. */
export function splitCard(D) {
  const id = 'splitexit', h2 = '建議變成 0 時：一次賣完還是分幾天？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">建議變成 0（先不要放）時，如果你手上還有幣，常會想「分幾天賣，萬一反彈呢？」這裡用預測規則自己過去每一天的建議（每天只用當天以前的資料），比較<strong>建議變了當天一次做完</strong>和<strong>分 2、3、5 天做完</strong>（每天做 1/N），含手續費；做法在第一次計算前就固定。</p>
    <p><strong>結論</strong>：${exitLine(D)}</p>
    <p class="small">${eventLine(D)}</p>
    <p class="small">${afterLine(D)}</p>
    ${table(D, R_EXIT)}
    <h3>反過來：從 0 變成要放時，一次買還是分幾天？</h3>
    <p class="small">${entryLine(D)}</p>
    ${table(D, R_ENTRY)}
    <p class="small"><strong>對你來說</strong>：${D.results.exit3.verdict === 'better' ? '回測裡分天賣比較好，但這是過去紀錄。' : '建議變成 0 時，當天全部賣掉最簡單，回測裡也不比分天差；分天賣只是把一部分「再抱幾天」，繼續跌的時候多虧。'}這和「差一點要不要動手」卡裡「隔天才做明顯變差」是同一個道理：這套規則的用處是大跌時少虧，拖延會丟掉這個用處。這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/split_exit.py</code> → <code>data/splitexit.json</code>（冠軍 trend_vt@1 凍結 walk-forward，Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。分 N 天賣＝建議變成 0 那天起每天賣掉 1/N（第一份當天賣），期間規則又變成要放就照規則；分 N 天買同理。每次買賣 0.15%、買進再加台幣溢價 0.27%（和虛擬投組相同），沒放的錢不計利息；兩幣各一半。「每 NT$100 萬的幣」＝建議變 0 前一天放在幣裡的金額，比到分天做完的那天收盤。報酬／波動比＝年化 Sharpe；把握＝28 天區塊拔靴法 2,000 次。2022–23 年用來事先定判斷標準，2024 年起是之後檢查。</p>
  </section>`;
}
