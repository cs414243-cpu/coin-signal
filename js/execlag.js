// v66: 建議變了，我晚幾天才照做，會差多少？ — pure functions (no DOM, no network).
// backtest/exec_lag.py → data/execlag.json: the frozen champion's walk-forward exposures executed 0/1/2/3/7 days late,
// and "sell late / buy on time" vs "buy late / sell on time" (3 days), with paper_sim costs. Definitions committed before
// the first run (53a6bfd), IS-only results before any 2024+ number (4b2397e). Trend rules earn by cutting early in
// drawdowns (Moskowitz, Ooi & Pedersen 2012 JFE 104(2):228–250, doi 10.1016/j.jfineco.2011.11.003).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const LABEL = { lag0: '當天照做', lag1: '晚 1 天', lag2: '晚 2 天', lag3: '晚 3 天', lag7: '晚 7 天', exit_late3: '買進準時、賣出晚 3 天', entry_late3: '賣出準時、買進晚 3 天' };
const SHORT = { exit_late3: '只有賣出晚 3 天', entry_late3: '只有買進晚 3 天' };
export const ORDER = ['lag0', 'lag1', 'lag2', 'lag3', 'lag7', 'exit_late3', 'entry_late3'];
export const P = (D, r, k = 'oos') => D?.results?.[r]?.pooled?.[k];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.rules || !Number.isInteger(v.grace_days) || !['exit', 'entry', 'both', 'neither'].includes(v.side)) return false;
  return ORDER.every(r => ['is_', 'oos'].every(k => Number.isFinite(P(D, r, k)?.sharpe) && Number.isFinite(P(D, r, k)?.cagr) && Number.isFinite(P(D, r, k)?.maxdd)))
    && ORDER.slice(1).every(r => ['small', 'large', 'mixed'].includes(v.rules[r])) && D.now_expo && ['BTC', 'ETH'].every(c => Number.isFinite(D.now_expo[c]));
}

const pair = (D, r, k = 'oos') => `年化 ${pc1(P(D, r, k).cagr)}、最慘跌幅 ${pc1(P(D, r, k).maxdd)}`;

/** Plain conclusion (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const v = D.verdict, g = v.grace_days;
  const lags = D.lags.map(L => `晚 ${L} 天 ${pair(D, 'lag' + L)}`).join('；');
  const head = g === 0 ? `<strong>差很多：連晚 1 天都明顯變差</strong>，2022–23 年和 2024 年起都一樣。`
    : g >= 7 ? `<strong>差不多</strong>：晚到 7 天以內，兩段都沒有明顯變差。`
    : `<strong>晚 ${g} 天以內差不多，再晚就明顯變差</strong>。`;
  return `${head}2024 年起（兩幣各半、含手續費）：當天照做 ${pair(D, 'lag0')}；${lags}。`;
}

export function sideLine(D) {
  const v = D.verdict, x = v.rules.exit_late3, e = v.rules.entry_late3;
  const xs = `買進準時、賣出晚 3 天：2024 年起 ${pair(D, 'exit_late3')}（2022–23 年 ${pair(D, 'exit_late3', 'is_')}，當天照做 ${pair(D, 'lag0', 'is_')}）`;
  const es = `賣出準時、買進晚 3 天：2024 年起 ${pair(D, 'entry_late3')}（2022–23 年 ${pair(D, 'entry_late3', 'is_')}）`;
  const word = r => r === 'large' ? '兩段都明顯變差' : r === 'small' ? '兩段都差不多' : '兩段不一致';
  const head = v.side === 'exit' ? '<strong>最要緊的是「賣出／減碼」要準時</strong>。'
    : v.side === 'entry' ? '<strong>最要緊的是「買進／加碼」要準時</strong>。'
    : v.side === 'both' ? '<strong>買進和賣出晚了都明顯變差</strong>。' : '分開看，買進晚或賣出晚都沒有兩段一致的明顯差別。';
  return `${head}${xs}，${word(x)}；${es}，${word(e)}。`;
}

function table(D) {
  const row = r => {
    const o = P(D, r), i = P(D, r, 'is_'), pw = D.results[r].oos_p_worse;
    return `<tr><th>${SHORT[r] || LABEL[r]}</th><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${pc1(i.cagr)}／${pc1(i.maxdd)}</td><td>${r === 'lag0' ? '—' : pw >= 0.995 ? '超過 99%' : pc0(pw)}</td></tr>`;
  };
  return `<div class="scroll"><table class="bt"><thead><tr><th>做法</th><th>2024 起年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 年化／最慘</th><th>比當天照做差的把握</th></tr></thead><tbody>${ORDER.map(row).join('')}</tbody></table></div>`;
}

export function betterNote(D) {
  const b = ORDER.slice(1).filter(r => P(D, r).sharpe > P(D, 'lag0').sharpe || P(D, r, 'is_').sharpe > P(D, 'lag0', 'is_').sharpe);
  return b.length ? `${b.map(r => LABEL[r]).join('、')}在其中一段看起來比當天照做好，但另一段較差——沒有證明晚一點比較好。` : '';
}

export function nowLine(D) {
  const zero = ['BTC', 'ETH'].filter(c => D.now_expo[c] < 0.005);
  if (zero.length === 2) return `現在：BTC、ETH 建議都是 0。下一次會是「轉成加碼」：買進晚 3 天，2024 年起 ${pair(D, 'entry_late3')}（當天照做 ${pair(D, 'lag0')}）。`;
  return `現在：${['BTC', 'ETH'].map(c => `${c} 建議 ${pc0(D.now_expo[c])}`).join('、')}。手上有幣的時候，建議變少或變成 0 那天最要緊。`;
}

export function you(D) {
  const g = D.verdict.grace_days;
  let t = g === 0 ? '建議變了（尤其是變少或變成 0），<strong>盡量當天早上 8 點後就照做</strong>；這套方法的成績大半靠「快一點」，晚 1 天就少掉一大截。'
    : `建議變了，${g} 天內照做都差不多；再晚就明顯變差。`;
  t += '如果你常常好幾天才打開 App，上面「當天照做」的回測成績就不適用你，寧可把打算放的錢調少，也不要指望晚幾天還一樣。';
  return t + '回測假設剛好用早上 8 點的收盤價成交；同一天內幾點做的差別見「幾點動手」。過去的結果不保證未來。';
}

/** Advanced card. */
export function execLagCard(D) {
  const id = 'execlag', h2 = '建議變了，我晚幾天才照做，會差多少？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 的成績都假設建議一變，當天早上就照做。真人不一定每天看；這張卡把同一份過去的建議，故意晚 1、2、3、7 天才照做，再分開看「賣出晚」和「買進晚」，都含手續費、兩幣各半 NT$100 萬（同虛擬投資）。（「差一點要不要動手」卡裡的「幾點動手」已經用小時K算過同一天內幾點做、拖到隔天早上；這張用日K往後看更多天。）</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${sideLine(D)}</p>
    ${table(D)}
    <p class="small">${betterNote(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/exec_lag.py</code> → <code>data/execlag.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。晚 L 天＝第 t 天持有第 t−L 天的建議比例（買、賣、調整全部晚）；賣出晚 3 天＝取最近 4 天建議的最大值（加碼馬上做、減碼等 3 天）；買進晚 3 天＝取最小值。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息。「明顯變差」事先固定（commit 53a6bfd）：夏普少 ${D.sharpe_tol} 以上或最慘跌幅多 ${Math.round(D.dd_tol * 100)} 個百分點以上；兩段（2022–23、2024 起）都變差才算。「比當天照做差的把握」＝2024 年起每日報酬 28 天區塊重抽 ${D.boot.n} 次。</p>
  </section>`;
}
