// v99: 我也有台股（0050）：台股大跌的那幾週，幣也一起跌嗎？照建議能少賠嗎？ — pure functions (no DOM, no network).
// backtest/stock_week.py → data/stockweek.json: 0050 weekly closes (Yahoo, cross-checked with TWSE STOCK_DAY for Nov 2026),
// the frozen champion's walk-forward exposures and paper_sim costs, all in NT$. A "bad week" = 0050 fell ≥ 3% that week.
// Definitions + answer keys committed before the first run (63acdd0), IS-only results before any 2024+ number (81c5045).
// The grouping uses the SAME week's 0050 move: it describes what happened together, it cannot warn in advance.
// Down-market correlations rise for equities (Longin & Solnik 2001 JF 56(2):649–676, doi 10.1111/0022-1082.00340;
// Ang & Chen 2002 JFE 63(3):443–494, doi 10.1016/s0304-405x(02)00068-5). Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const md = s => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };
export const TOGETHER = ['together', 'apart', 'unrelated', 'unclear'];
export const CUSHION = ['less', 'more', 'unclear'];
const G = ['n', 'hold_fell', 'hold_mean', 'hold_worst', 'rule_mean', 'rule_worst', 'expo_mean', 'mix0_mean', 'mix0_worst', 'mix_hold_mean', 'mix_hold_worst', 'mix_rule_mean', 'mix_rule_worst'];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v || !TOGETHER.includes(v.together) || !CUSHION.includes(v.cushion) || D.bad !== -0.03) return false;
  return ['is_', 'oos'].every(k => ['bad', 'other'].every(g => G.every(f => Number.isFinite(D.stats?.[k]?.[g]?.[f])) && D.stats[k][g].n > 0))
    && Number.isFinite(D.last_week?.r50) && Number.isFinite(D.last_week?.hold) && Number.isFinite(D.last_week?.rule);
}
const S = (D, k, g = 'bad') => D.stats[k][g];
const cnt = (g) => `${Math.round(g.hold_fell * g.n)}／${g.n} 週`;

/** Short plain answer (also used by tests). */
export function shortAnswer(D) {
  const t = D.verdict.together, c = D.verdict.cushion;
  const a = t === 'together' ? '台股大跌那週，幣常常也一起跌' : t === 'apart' ? '台股大跌那週，幣反而比較常漲' : t === 'unrelated' ? '台股大跌那週，幣跌的機會和平常差不多' : '台股大跌那週幣會不會一起跌，兩段時間說法不一';
  const b = c === 'less' ? '照建議那部分過去少賠很多（主要因為那時通常沒放多少）' : c === 'more' ? '照建議那部分過去反而賠得比較多' : '照建議有沒有少賠，兩段時間不一致';
  return `${a}；${b}`;
}

export function headLine(D) {
  const o = S(D, 'oos'), i = S(D, 'is_'), oo = S(D, 'oos', 'other'), io = S(D, 'is_', 'other');
  const t = D.verdict.together;
  const h1 = t === 'together' ? '<strong>會，常常一起跌。</strong>' : t === 'apart' ? '<strong>不會，反而比較常漲。</strong>' : t === 'unrelated' ? '<strong>跟平常差不多。</strong>' : '<strong>說不準。</strong>';
  return `${h1}台股大跌那週，一直抱著的幣（兩幣各半）也跌的：2024 年起 ${pc0(o.hold_fell)}（${cnt(o)}）、2022–23 年 ${pc0(i.hold_fell)}（${cnt(i)}）；其他週只有 ${pc0(oo.hold_fell)}／${pc0(io.hold_fell)}。`
    + `幣在那些週平均 ${pc1(o.hold_mean)}（2024 起）／${pc1(i.hold_mean)}（2022–23），最慘一週 ${pc1(o.hold_worst)}／${pc1(i.hold_worst)}。`;
}

export function cushionLine(D) {
  const o = S(D, 'oos'), i = S(D, 'is_'), oo = S(D, 'oos', 'other'), io = S(D, 'is_', 'other');
  const c = D.verdict.cushion;
  const h = c === 'less' ? '<strong>照建議的話，過去兩段都少賠很多</strong>' : c === 'more' ? '<strong>照建議的話，過去反而賠得比較多</strong>' : '<strong>照建議有沒有少賠，兩段時間不一致</strong>';
  return `${h}：台股大跌那週，照建議的幣平均 ${pc1(o.rule_mean)}、最慘 ${pc1(o.rule_worst)}（2024 起）；2022–23 年平均 ${pc1(i.rule_mean)}、最慘 ${pc1(i.rule_worst)}。`
    + `但原因主要是那時建議本來就放得少：台股大跌那週開始時平均只放 ${pc0(o.expo_mean)}（其他週 ${pc0(oo.expo_mean)}）；2022–23 年 ${pc0(i.expo_mean)}（其他週 ${pc0(io.expo_mean)}）。`
    + '沒放的錢在 USDT，換回台幣只會跟著匯率小幅變動。這不代表建議會「預先躲開台股大跌」——它只看幣自己的走勢，沒有看台股。';
}

export function mixLine(D) {
  const o = S(D, 'oos'), i = S(D, 'is_'), [a, b] = D.mix;
  return `放進你的總資產看（例：${pc0(a)} 放 0050、${pc0(b)} 放幣，每週調回）：2024 年起台股大跌那週平均——只有 0050 ${pc1(o.mix0_mean)}、加一直抱著的幣 ${pc1(o.mix_hold_mean)}、加照建議的幣 ${pc1(o.mix_rule_mean)}；最慘一週 ${pc1(o.mix0_worst)}／${pc1(o.mix_hold_worst)}／${pc1(o.mix_rule_worst)}。`
    + `2022–23 年平均 ${pc1(i.mix0_mean)}／${pc1(i.mix_hold_mean)}／${pc1(i.mix_rule_mean)}，最慘 ${pc1(i.mix0_worst)}／${pc1(i.mix_hold_worst)}／${pc1(i.mix_rule_worst)}。總資產的賠多賠少主要還是看台股那一大份；幣只放一小份時，影響不大。`;
}

export function lastLine(D) {
  const L = D.last_week;
  const now = D.now_expo || {}, flat = Object.values(now).every(x => x === 0);
  const bad = L.r50 <= D.bad;
  return `最近一週（到 ${md(L.end)} 台股收盤）：0050 ${pc1(L.r50)}${bad ? '（算大跌週）' : ''}；一直抱著的幣 ${pc1(L.hold)}；照建議的幣 ${pc1(L.rule)}。`
    + (flat ? `資料最後一天（${md(D.as_of)}）建議兩個幣都空手：那時台股如果再大跌，照建議的這部分不會跟著賠（只有匯率小變動）。今天的建議以首頁為準。` : `資料最後一天（${md(D.as_of)}）建議放 BTC ${pc0(now.BTC)}、ETH ${pc0(now.ETH)}；今天的建議以首頁為準。`);
}

function listHtml(D, k) {
  const L = D.stats[k].bad_list || [];
  return L.map(x => `<tr><td>${x.end}</td><td>${pc1(x.r50)}</td><td>${pc1(x.hold)}</td><td>${pc1(x.rule)}</td></tr>`).join('');
}

export function you(D) {
  return '幣不是台股的避風港：台股大跌時，幣常常也跌，而且一週可以跌得比台股還多。'
    + '如果你同時有台股和幣，擔心「兩邊一起跌」，比較有用的是一開始就把幣的錢放少、並照建議做；不要因為台股大跌就把錢移到幣想「分散」。'
    + '這張卡是「同一週一起發生」的整理，不能事先預告台股或幣會不會大跌，建議本身也不會因此改變。台股大跌週很少（2024 起 '
    + `${S(D, 'oos').n} 週、2022–23 年 ${S(D, 'is_').n} 週），數字會有誤差；過去不保證未來。`;
}

/** Advanced card. */
export function stockWeekCard(D) {
  const id = 'stockweek', h2 = '我也有台股（0050）：台股大跌那週，幣也一起跌嗎？照建議能少賠嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">很多人除了幣，也有台股 0050。這張卡把 0050 一週跌 ${pc0(-D.bad)} 以上的週當「台股大跌週」，看同一週幣怎麼走：一直抱著的幣 vs 照建議的幣（兩幣各半、含手續費、都換成新台幣算）。</p>
    <p><strong>幣會一起跌嗎？</strong>${headLine(D)}</p>
    <p class="small">${cushionLine(D)}</p>
    <p class="small">${mixLine(D)}</p>
    <p class="small">${lastLine(D)}</p>
    <details><summary class="small">每一個台股大跌週（0050／一直抱著的幣／照建議的幣）</summary>
      <div class="scroll"><table class="bt"><thead><tr><th>那週最後交易日</th><th>0050</th><th>抱著的幣</th><th>照建議</th></tr></thead><tbody>
      <tr><th colspan="4">2024 年起</th></tr>${listHtml(D, 'oos')}<tr><th colspan="4">2022–23 年</th></tr>${listHtml(D, 'is_')}</tbody></table></div>
    </details>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/stock_week.py</code> → <code>data/stockweek.json</code>（0050、新台幣匯率：Yahoo 日收盤，2026 年 11 月的 0050 收盤和證交所資料逐日核對相同；冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。每週用 0050 最後一個交易日收盤（台北 13:30），幣用同一天早上 8 點收盤的日K（早約 5.5 小時）。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢放 USDT、不計利息。判定事先固定（commit 63acdd0）：台股大跌週幣也跌的比例比其他週多 ${Math.round(D.d_tol * 100)} 個百分點以上、兩段都是，才算「常一起跌」；照建議平均和最慘都比一直抱著好、兩段都是，才算「少賠」。2022–23 年的數字在看 2024 年後之前就先算好（commit 81c5045）。</p>
  </section>`;
}
