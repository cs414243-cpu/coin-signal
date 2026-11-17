// v71: 加碼之後已經賺了，要不要自己先全賣落袋（停利）？ — pure functions (no DOM, no network).
// backtest/take_profit.py → data/takeprofit.json: every past trip (same trips as v36/v62); a self-made take-profit = sell
// everything at the first close that is U% above the entry close (before the rule's own exit day), then stay in cash for
// the rest of that trip. U = median max price gain of the 2018–2023 trips (frozen from those trips only). Definitions
// committed before the first run (d61f77b), IS-only results before any 2024+ number (b0a268a). Disposition effect:
// Shefrin & Statman 1985 J. Finance 40(3):777–790; trend-following payoffs: Fung & Hsieh 2001 RFS 14(2):313–341.
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const ab1 = x => Number.isFinite(x) ? `${(Math.abs(x) * 100).toFixed(1)}%` : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D?.grid?.[D?.headline];
export const upct = D => Math.round(D.U * 100);
// trip columns: coin, start, end, days, maxgain, r, period, tp_date, r_tp, endgain
export const triggered = (D, p) => D.trips.filter(t => (!p || t[6] === p) && t[7]);
export const dOf = t => Math.log1p(t[8]) - Math.log1p(t[5]);
const median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
export const savedMedian = D => median(triggered(D).map(dOf).filter(x => x > 0).map(Math.expm1));
/** The triggered trips where taking profit cost the most (rule result vs take-profit result), worst first. */
export const biggestCuts = (D, k = 2) => [...triggered(D)].sort((a, b) => dOf(a) - dOf(b)).slice(0, k).filter(t => dOf(t) < 0);

export function valid(D) {
  const G = HEAD(D);
  if (!D || D.is_only || !G || !['hold', 'take', 'unclear'].includes(D.verdict)) return false;
  return ['is_', 'oos', 'all'].every(p => ['BTC', 'ETH', 'both'].every(c => Number.isInteger(G[p]?.[c]?.n_trig) && Number.isInteger(G[p]?.[c]?.n)))
    && Number.isFinite(D.U) && D.U > 0 && Array.isArray(D.trips) && D.trips.length === G.all.both.n && ['BTC', 'ETH'].every(c => D.coins?.[c]);
}

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const A = HEAD(D).all.both, P = upct(D);
  const how = `過去 ${A.n} 趟裡，有 ${A.n_trig} 趟在規則賣出前收盤曾經比買進價高 ${P}% 以上。`;
  if (D.verdict === 'hold') return `<strong>賺一點就自己先賣，過去兩段都比較差</strong>，照規則等它自己出場比較好。${how}`;
  if (D.verdict === 'take') return `<strong>賺一點就自己先賣，過去兩段都比較好</strong>，但不代表以後也一樣。${how}`;
  return `<strong>賺一點就自己先賣好不好，說不準</strong>。${how}`;
}

export function compareLine(D) {
  const G = HEAD(D), A = G.all.both, i = G.is_.both, o = G.oos.both;
  const cuts = biggestCuts(D);
  const cutTxt = cuts.length ? `但少數幾次把後來的大行情整個錯過（${cuts.map(t => `${t[0]} ${md(t[1])} 進場那趟，照規則 ${pc1(t[5])}，自己先賣只有 ${pc1(t[8])}`).join('；')}）` : '';
  return `會提早賣的 ${A.n_trig} 次裡，有 ${A.better} 次比照規則好一點（一般只多 ${ab1(savedMedian(D))}，因為很多趟後來變成小賠）${cutTxt ? '，' + cutTxt : ''}。每次平均差：2023 年以前 ${i.n_trig} 次 ${pc1(i.mean_d)}、2024 年起 ${o.n_trig} 次 ${o.mean_d == null ? '—' : pc1(o.mean_d)}。`;
}

function table(D) {
  const G = HEAD(D);
  const row = (lab, g) => `<tr><th>${lab}</th><td>${g.n}</td><td>${g.n_trig}</td><td>${g.better}／${g.worse}</td><td>${g.n_trig ? pc1(g.total_d) : '—'}</td></tr>`;
  const rows = [['2023 年以前', 'is_'], ['2024 年起', 'oos']].flatMap(([p, k]) => ['BTC', 'ETH'].map(c => row(`${p}<div class="muted small">${c}</div>`, G[k][c]))).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>時期</th><th>趟數</th><th>會提早賣</th><th>比較好／比較差</th><th>合起來多賺（少賺）</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function robustLine(D) {
  const out = [];
  for (const u of D.u_fixed || []) {
    const g = D.grid?.[`U${Math.round(u * 100)}`]; if (!g) continue;
    const a = g.all.both;
    out.push(`漲 ${Math.round(u * 100)}% 才賣：會提早賣 ${a.n_trig} 次${a.n_trig ? `，平均 ${pc1(a.mean_d)}（2023 年以前 ${pc1(g.is_.both.mean_d)}、2024 年起 ${g.oos.both.n_trig ? pc1(g.oos.both.mean_d) : '沒發生'}）` : ''}`);
  }
  return out.length ? `換個門檻（只供對照，事先沒選）：${out.join('；')}。` : '';
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c];
    return C.open_trip ? `${c} 這一趟 ${md(C.open_trip.start)} 進場，現在比買進價 ${pc1(C.open_trip.gain_now)}` : `${c} 建議是 0（沒有進行中的一趟）`;
  }).join('；') + '。';
}

export function you(D) {
  const G = HEAD(D);
  const base = `這個方法的錢主要來自少數幾趟大漲，大部分趟是小賺小賠；賺一點就先賣，常常是對的（少賠一點），但只要錯過一次大行情，就把很多次的小好處全部吐回去。全部合起來 BTC ${pc1(G.all.BTC.total_d)}、ETH ${pc1(G.all.ETH.total_d)}。`;
  if (D.verdict === 'hold') return base + '照規則等它自己出場比較好；真的想落袋，賣掉的部分就當作不再參與這一趟。';
  if (D.verdict === 'take') return base + '過去兩段自己先賣比較好，但次數與時期有限，不代表以後也一樣。';
  return base + '好壞沒有證明，不需要為了停利改變做法。';
}

/** Advanced card. */
export function takeProfitCard(D) {
  const id = 'takeprofit', h2 = '加碼之後已經賺了，要不要自己先賣掉落袋？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const G = HEAD(D), P = upct(D);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">照建議轉成加碼後價格漲上去，很想先賣掉把賺的收進口袋（停利）。這張卡用過去每一趟（同「每一次進場的結果」）試算：<strong>只要收盤比買進那天收盤高 ${P}% 以上，就自己全部賣掉</strong>，那一趟剩下的時間都不再買，跟「照規則等它自己變 0 再賣」比。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${compareLine(D)}</p>
    ${table(D)}
    <p class="small">${robustLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}2024 年以後會提早賣的有 ${G.oos.both.n_trig} 次，這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/take_profit.py</code> → <code>data/takeprofit.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0，結果含第一次買進、中間每天調整、最後賣出（買賣 0.15%、買進加台幣溢價 0.27%）。自己先賣＝買進後（不含規則自己賣的那天）第一次收盤 ≥ 買進那天收盤 × (1 + ${P}%) 時，那天收盤全部賣掉（0.15%），之後那一趟留現金（不計利息），下一趟照常。只用當天以前的價格。門檻 ${P}%＝2023 年以前各趟「最多比買進價高多少」的中間值（只用那些趟算出、之後固定；一半的趟連 ${P + 1}% 都沒漲到）。分段：2023 年以前＝整趟在 2023 年底以前結束；2024 年起＝在 2024 年以後開始。判斷標準事先固定（commit d61f77b）：兩段平均（取對數）都比照規則差、每段至少 ${D.nmin} 次＝「照規則」，都比較好＝「自己先賣」，其他＝「說不準」。「合起來」＝那段時間所有提早賣的趟合計，對那個幣的錢多賺或少賺多少。</p>
  </section>`;
}
