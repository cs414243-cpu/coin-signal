// v94: 建議變成 0 了，但我現在是賠的——要不要等回本再賣？ — pure functions (no DOM, no network).
// backtest/breakeven_wait.py → data/breakeven.json: every past trip (same trips as v36/v62/v71) that the rule sold on a
// day when the close was below the entry close; "wait for even" = don't sell that day, sell at the first close back at the
// entry close, or follow the rule again if it buys back first. Definitions committed before the first run (a5dcfff),
// IS-only results before any 2024+ number (ce0b7bf). Disposition effect: Shefrin & Statman 1985 J. Finance 40(3):777–790;
// Odean 1998 J. Finance 53(5):1775–1798; break-even effect: Thaler & Johnson 1990 Management Science 36(6):643–660.
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const ab1 = x => Number.isFinite(x) ? `${(Math.abs(x) * 100).toFixed(1)}%` : '—';
const px = x => Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const G = D => D?.grid?.all_losses;
// event columns: coin, start, end, paid, exit, exit_loss, resolved, kind, wait_days, low, d, period
export const EV = (D, p) => D.events.filter(e => !p || e[11] === p);
const median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
/** Typical gain when waiting helped (as a plain %, not log). */
export const helpMedian = D => median(EV(D).map(e => e[10]).filter(x => x > 0).map(Math.expm1));
/** The waits that cost the most, worst first. */
export const worstWaits = (D, k = 3) => [...EV(D)].sort((a, b) => a[10] - b[10]).slice(0, k).filter(e => e[10] < 0);

export function valid(D) {
  const g = G(D);
  if (!D || D.is_only || !g || !['sell', 'wait', 'unclear'].includes(D.verdict)) return false;
  return ['is_', 'oos', 'all'].every(p => ['BTC', 'ETH', 'both'].every(c => Number.isInteger(g[p]?.[c]?.n) && Number.isInteger(g[p]?.[c]?.n_trips)))
    && Array.isArray(D.events) && D.events.length === g.all.both.n && ['BTC', 'ETH'].every(c => D.coins?.[c]) && !!D.grid.small && !!D.grid.big;
}

export function headLine(D) {
  const A = G(D).all.both;
  const how = `過去 ${A.n_trips} 趟裡，有 ${A.n} 趟規則說賣的那天，價格比買進那天低。`;
  if (D.verdict === 'sell') return `<strong>等回本再賣，過去兩段都比較差</strong>，規則說賣那天就賣比較好。${how}`;
  if (D.verdict === 'wait') return `<strong>等回本再賣，過去兩段都比較好</strong>，但不代表以後也一樣。${how}`;
  const tilt = G(D).is_.both.mean_d > 0 && G(D).oos.both.mean_d < 0 ? '（2023 年以前小贏、2024 年起較差）' : '';
  return `<strong>等回本再賣好不好，說不準</strong>${tilt}。${how}`;
}

export function compareLine(D) {
  const g = G(D), A = g.all.both, i = g.is_.both, o = g.oos.both, w = worstWaits(D);
  const wt = w.length ? `但少數幾次越等越低（${w.map(e => `${e[0]} ${md(e[2])} 規則賣出那次，等了 ${e[8]} 天、中間最多再跌 ${ab1(e[9])}，比當天賣少 ${ab1(Math.expm1(e[10]))}`).join('；')}）` : '';
  return `等回本的 ${A.n} 次裡，有 ${A.better} 次比當天賣好一點（一般只多 ${ab1(helpMedian(D))}，因為多半幾天內就彈回來、或規則很快又說買）${wt ? '，' + wt : ''}。每次平均差：2023 年以前 ${i.n} 次 ${pc1(i.mean_d)}、2024 年起 ${o.n} 次 ${o.mean_d == null ? '—' : pc1(o.mean_d)}。`;
}

export function howLine(D) {
  const A = G(D).all.both;
  return `怎麼結束的：真的回到買進價 ${A.even} 次、還沒回本規則就又說買 ${A.reentry} 次${A.open ? `、到現在還沒等到 ${A.open} 次` : ''}；一般等 ${A.wait_med} 天，最久 ${A.wait_max} 天；等的時候最多又跌了 ${ab1(A.low_min)}。`;
}

function table(D) {
  const g = G(D);
  const row = (lab, x) => `<tr><th>${lab}</th><td>${x.n_trips}</td><td>${x.n}</td><td>${x.better}／${x.worse}</td><td>${x.n ? pc1(x.total_d) : '—'}</td><td>${x.n ? x.wait_max + ' 天' : '—'}</td></tr>`;
  const rows = [['2023 年以前', 'is_'], ['2024 年起', 'oos']].flatMap(([p, k]) => ['BTC', 'ETH'].map(c => row(`${p}<div class="muted small">${c}</div>`, g[k][c]))).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>時期</th><th>賣出的趟數</th><th>賣的時候是賠的</th><th>等回本比較好／比較差</th><th>合起來多賺（少賺）</th><th>等最久</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function splitLine(D) {
  const s = D.grid.small, b = D.grid.big, big = Math.round(-D.big * 100);
  const part = (x, lab) => x.all.both.n ? `${lab}的 ${x.all.both.n} 次：平均 ${pc1(x.all.both.mean_d)}（2023 年以前 ${x.is_.both.n ? pc1(x.is_.both.mean_d) : '沒發生'}、2024 年起 ${x.oos.both.n ? pc1(x.oos.both.mean_d) : '沒發生'}）` : `${lab}：沒發生`;
  return `分開看（只供對照，事先沒選）：${part(s, `賣的時候賠不到 ${big}%`)}；${part(b, `賠 ${big}% 以上`)}。`;
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c], L = C.last_trip;
    if (C.open_trip) return `${c} 有進行中的一趟（${md(C.open_trip.start)} 進場），規則還沒說賣`;
    if (!L) return `${c} 建議是 0`;
    const now = L.last_close / L.paid - 1;
    const sold = L.losing ? `賠著賣（賣在 ${px(L.exit)}，比買進價低 ${ab1(L.exit_loss)}）` : `賺著賣（賣在 ${px(L.exit)}，比買進價高 ${ab1(L.exit_loss)}）`;
    return `${c} 建議是 0；上一趟 ${md(L.start)} 進場（那天收盤 ${px(L.paid)}），${md(L.end)} 規則${sold}；如果那時沒賣，現在 ${px(L.last_close)}，比買進價${now < 0 ? '低' : '高'} ${ab1(now)}`;
  }).join('；') + '。';
}

export function you(D) {
  const g = G(D);
  const base = `規則說賣的時候，多半只比買進價低一點點，等一兩天常常就回來，所以「等回本」大部分時候小贏；但它等於不理會規則的賣出，遇到真的轉跌就會一路抱著往下，幾次大輸就把很多次小贏吐回去。全部合起來 BTC ${pc1(g.all.BTC.total_d)}、ETH ${pc1(g.all.ETH.total_d)}。「買進價」只是自己記得的數字，價格不會因為它回頭。`;
  if (D.verdict === 'sell') return base + '規則說賣那天就賣比較好。';
  if (D.verdict === 'wait') return base + '過去兩段等回本比較好，但次數與時期有限，不代表以後也一樣。';
  return base + '好壞沒有證明，不需要改成等回本；規則說賣，就當天照做。';
}

/** Advanced card. */
export function breakevenCard(D) {
  const id = 'breakeven', h2 = '建議變成 0 了，但我現在是賠的——要不要等回本再賣？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const g = G(D);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">規則說賣（變成 0）那天，價格常常比當初買進時低，很多人會想「等回本再賣」。這張卡用過去每一趟（同「每一次進場的結果」）試算：<strong>規則賣的那天如果收盤比買進那天低，就先不賣，等收盤回到買進價那天才賣</strong>；還沒回本規則就又說買的話，從那天起照規則。跟「規則說賣那天就賣」比。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${compareLine(D)}</p>
    ${table(D)}
    <p class="small">${howLine(D)}</p>
    <p class="small">${splitLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}2024 年以後賠著賣的有 ${g.oos.both.n} 次，這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/breakeven_wait.py</code> → <code>data/breakeven.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0，結果含第一次買進、中間每天調整、最後賣出（買賣 0.15%、買進加台幣溢價 0.27%）。買進價＝那一趟第一天的收盤。等回本＝規則賣的那天收盤低於買進價時那天不賣（幣不動），之後第一個收盤 ≥ 買進價那天全部賣掉（0.15%）；如果規則先重新買進，那天起照規則的比例（之後兩邊一樣）。只用當天以前的價格。分段：2023 年以前＝等待在 2023 年底以前結束；2024 年起＝規則在 2024 年以後賣出（還沒等到的算到最後一天）。判斷標準事先固定（commit a5dcfff）：兩段平均（取對數）都比當天賣差、每段至少 ${D.nmin} 次＝「當天賣」，都比較好＝「等回本」，其他＝「說不準」。「合起來」＝那段時間所有等回本的次數合計，對那個幣的錢多賺或少賺多少。</p>
  </section>`;
}
