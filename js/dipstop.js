// v62: 加碼之後價格跌破買進價，要不要自己先全賣（停損）？ — pure functions (no DOM, no network).
// backtest/dip_stop.py → data/dipstop.json: every past trip (same trips as v36); a self-made stop = sell everything at
// the first close that is D% below the entry close (before the rule's own exit day), then stay in cash for the rest of
// that trip. D = median max price dip of the 2018–2023 trips (frozen from those trips only). Definitions committed before
// the first run (667a8c9), IS-only results before any 2024+ number (d8d6bec). Stop-loss literature: Kaminski & Lo 2014
// J. Financial Markets 18:234–254 (doi 10.1016/j.finmar.2013.07.001).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const ab1 = x => Number.isFinite(x) ? `${(Math.abs(x) * 100).toFixed(1)}%` : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D?.grid?.[D?.headline];
export const dpct = D => Math.round(D.D * 100);
// trip columns: coin, start, end, days, maxdip, r, period, stop_date, r_stop
export const breached = (D, p) => D.trips.filter(t => (!p || t[6] === p) && t[4] <= -D.D);
export const triggered = (D, p) => D.trips.filter(t => (!p || t[6] === p) && t[7]);

export function valid(D) {
  const G = HEAD(D);
  if (!D || D.is_only || !G || !['hold', 'stop', 'unclear'].includes(D.verdict)) return false;
  return ['is_', 'oos', 'all'].every(p => ['BTC', 'ETH', 'both'].every(c => Number.isInteger(G[p]?.[c]?.n_trig) && Number.isInteger(G[p]?.[c]?.n)))
    && Number.isFinite(D.D) && D.D > 0 && Array.isArray(D.trips) && D.trips.length === G.all.both.n && ['BTC', 'ETH'].every(c => D.coins?.[c]);
}

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const G = HEAD(D), A = G.all.both, P = dpct(D), nb = breached(D).length, nt = triggered(D).length;
  const rare = `過去 ${A.n} 趟裡，價格曾經跌破買進價 ${P}% 以上的有 ${nb} 趟，但其中 ${nb - nt} 趟是<strong>規則自己在那天就賣了</strong>；真正會比規則早賣的只有 ${nt} 趟。`;
  if (D.verdict === 'hold') return `<strong>自己先停損，過去兩段都比較差</strong>，照規則等它自己出場就好。${rare}`;
  if (D.verdict === 'stop') return `<strong>自己先停損，過去兩段都比較好</strong>，但次數不多。${rare}`;
  return `<strong>自己先停損好不好，說不準</strong>；更重要的是：${rare}`;
}

/** Per triggered trip: d = log(1+R_stop) − log(1+R) (same as the script). */
export const dOf = t => Math.log1p(t[8]) - Math.log1p(t[5]);
const median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN; };
export const savedMedian = D => median(triggered(D).map(dOf).filter(x => x > 0).map(Math.expm1));

export function compareLine(D) {
  const G = HEAD(D), A = G.all.both, i = G.is_.both, o = G.oos.both;
  const cut = triggered(D).filter(t => t[5] > 0);
  const cutTxt = cut.length ? `但有 ${cut.length} 次剛好把後來大賺的那趟砍掉（${cut.map(t => `${t[0]} ${md(t[1])} 進場那趟，照規則 ${pc1(t[5])}，自己先賣 ${pc1(t[8])}`).join('；')}）` : '沒有砍掉任何後來賺錢的趟';
  return `會提早賣的那 ${A.n_trig} 次，有 ${A.better} 次比照規則少賠一點（一般只少賠 ${ab1(savedMedian(D))}），${cutTxt}。每次平均差：2023 年以前 ${i.n_trig} 次 ${pc1(i.mean_d)}、2024 年起 ${o.n_trig} 次 ${o.mean_d == null ? '—' : pc1(o.mean_d)}。`;
}

function table(D) {
  const G = HEAD(D);
  const row = (lab, g) => `<tr><th>${lab}</th><td>${g.n}</td><td>${g.n_trig}</td><td>${g.better}／${g.worse}</td><td>${g.n_trig ? pc1(g.total_d) : '—'}</td></tr>`;
  const rows = [['2023 年以前', 'is_'], ['2024 年起', 'oos']].flatMap(([p, k]) => ['BTC', 'ETH'].map(c => row(`${p}<div class="muted small">${c}</div>`, G[k][c]))).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>時期</th><th>趟數</th><th>會提早賣</th><th>比較好／比較差</th><th>合起來多賺（少賺）</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function normalLine(D) {
  const G = HEAD(D), A = G.all.both, P = dpct(D);
  return `賺錢的趟幾乎都沒有先跌破買進價：${A.n_win} 趟賺錢的，跌到買進價 ${P}% 以下的只有 ${A.win_dipped} 趟，一般最多只跌 ${ab1(A.win_dip_median)}；賠錢的趟一般最多跌 ${ab1(A.loss_dip_median)} 就被規則賣掉了。`;
}

export function robustLine(D) {
  const out = [];
  for (const d of D.d_fixed || []) {
    const g = D.grid?.[`D${Math.round(d * 100)}`]?.all?.both; if (!g) continue;
    out.push(`跌 ${Math.round(d * 100)}% 才賣：會提早賣 ${g.n_trig} 次${g.n_trig ? `，平均 ${pc1(g.mean_d)}` : ''}`);
  }
  return out.length ? `換個門檻（只供對照）：${out.join('；')}。` : '';
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c];
    return C.open_trip ? `${c} 這一趟 ${md(C.open_trip.start)} 進場，現在比買進價 ${pc1(C.open_trip.dip_now)}` : `${c} 建議是 0（沒有進行中的一趟）`;
  }).join('；') + '。';
}

const cutNote = D => { const c = triggered(D).filter(t => t[5] > 0); return c.length ? `（少賺的主要是砍掉 ${c.length} 次後來賺錢的趟：${c.map(t => `${t[0]} ${pc1(t[5])}`).join('、')}）` : ''; };
export function you(D) {
  const A = HEAD(D).all.both;
  const base = `這個方法自己就會在跌的時候賣，等於已經內建停損，所以買進後跌破買進價幾 % 很常見、多半當天規則就賣了。自己再加一道停損，過去一般只少賠 ${ab1(savedMedian(D))}，全部合起來 BTC ${pc1(HEAD(D).all.BTC.total_d)}、ETH ${pc1(HEAD(D).all.ETH.total_d)}${cutNote(D)}。`;
  if (D.verdict === 'hold') return base + '照規則等它自己出場比較好。';
  if (D.verdict === 'stop') return base + '過去兩段自己先賣都比較好，但次數不多，不代表以後也一樣。';
  return base + '好壞沒有證明，不需要為了停損改變做法。';
}

/** Advanced card. */
export function dipStopCard(D) {
  const id = 'dipstop', h2 = '加碼之後價格跌破買進價，要不要自己先全賣？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const G = HEAD(D), P = dpct(D);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">照建議轉成加碼後，價格常常馬上跌到買進價以下，很想自己先全部賣掉（停損）。這張卡用過去每一趟（同「每一次進場的結果」）試算：<strong>只要收盤比買進那天收盤低 ${P}% 以上，就自己全部賣掉</strong>，那一趟剩下的時間都不再買，跟「照規則等它自己變 0 再賣」比。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${compareLine(D)}</p>
    ${table(D)}
    <p class="small">${normalLine(D)}</p>
    <p class="small">${robustLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}2024 年以後會提早賣的只有 ${G.oos.both.n_trig} 次，這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/dip_stop.py</code> → <code>data/dipstop.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0，結果含第一次買進、中間每天調整、最後賣出（買賣 0.15%、買進加台幣溢價 0.27%）。自己先賣＝買進後（不含規則自己賣的那天）第一次收盤 ≤ 買進那天收盤 × (1 − ${P}%) 時，那天收盤全部賣掉（0.15%），之後那一趟留現金（不計利息），下一趟照常。只用當天以前的價格。門檻 ${P}%＝2023 年以前各趟「最多跌破買進價多少」的中間值（只用那些趟算出、之後固定）。分段：2023 年以前＝整趟在 2023 年底以前結束；2024 年起＝在 2024 年以後開始。判斷標準事先固定（commit 667a8c9）：兩段平均（取對數）都比照規則差、每段至少 ${D.nmin} 次＝「照規則」，都比較好＝「自己先賣」，其他＝「說不準」。「合起來」＝那段時間所有提早賣的趟合計，對那個幣的錢多賺或少賺多少。</p>
  </section>`;
}
