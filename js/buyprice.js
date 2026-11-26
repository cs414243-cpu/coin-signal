// v101: 首頁寫翻轉價還差 +19%：真的等到建議轉成要放那天，價格會比今天貴多少？要等多久？ — pure functions (no DOM, no network).
// backtest/buy_price.py → data/buyprice.json: closed Binance daily bars from 2018, the frozen champion trend_vt@1 formula
// (checked against the frozen walk-forward file). For every 空手 spell, the first day the homepage gap (nearest flip price ÷
// that day's close − 1, the same number as 「什麼時候會變」) fell in a fixed bucket (< 5%, 5–10%, 10–20%, ≥ 20%), and the
// close on the morning the suggestion actually turned to 要放: vs that day's close, vs that day's flip price, days waited.
// Definitions + answer key committed before the first run (632ddf3), IS-only results before any 2024+ number (f160116).
// Moving-average windows: Brock, Lakonishok & LeBaron 1992 JF 47(5):1731–1764 (doi 10.1111/j.1540-6261.1992.tb04681.x);
// anchoring on the first number shown: Tversky & Kahneman 1974 Science 185(4157):1124–1131 (doi 10.1126/science.185.4157.1124).
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
export const EPS = 0.005;
export const BUCKETS = ['lt5', '5to10', '10to20', 'ge20'];   // = backtest/buy_price.py EDGES (fixed before the first run)
export const BUCKET_ZH = { lt5: '不到 5%', '5to10': '5%～10%', '10to20': '10%～20%', ge20: '20% 以上' };
export const VERDICTS = ['cheaper', 'dearer', 'unclear', 'too_few'];
const F = ['n', 'rise_med', 'vs_flip_med', 'wait_med', 'cheaper', 'dip_med', 'dip10', 'paid_more'];
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const ab1 = x => Number.isFinite(x) ? `${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const dd = x => Number.isFinite(x) ? (Number.isInteger(x) ? String(x) : x.toFixed(1)) : '—';
const px = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x < 100 ? 2 : 0 }) : '—';
const md = s => { const [, m, d] = String(s).split('-'); return `${+m}/${+d}`; };

export function bucketOf(g) {
  if (!Number.isFinite(g)) return null;
  return g < 0.05 ? 'lt5' : g < 0.10 ? '5to10' : g < 0.20 ? '10to20' : 'ge20';
}

export function valid(D) {
  if (!D || D.is_only || D.model !== 'trend_vt@1' || D.oos_start !== '2024-01-01' || D.n_min !== 3 || !D.verdict) return false;
  if (JSON.stringify(D.buckets) !== JSON.stringify(BUCKETS)) return false;
  return BUCKETS.every(b => VERDICTS.includes(D.verdict[b]) && ['is_', 'oos'].every(p => { const s = D.pooled?.[b]?.[p]; return s && s.n > 0 && F.every(f => Number.isFinite(s[f])); }))
    && ['BTC', 'ETH'].every(c => D.coins?.[c]?.current && Array.isArray(D.coins[c].events));
}

/** Today's gap for one coin from v47 fullpath's phone path (first = nearest line not yet above), else the file's current. */
export function nowGap(D, coin, path) {
  if (path && path.trend === 0 && path.first && Number.isFinite(path.first.dist)) return { flat: true, g: path.first.dist, flip: path.first.price, close: path.close, date: path.date, src: 'phone' };
  if (path && Number.isFinite(path.trend) && path.trend > 0) return { flat: false };
  const c = D?.coins?.[coin]?.current; if (!c) return null;
  return c.flat ? { flat: true, g: c.g, flip: c.flip, close: c.close, date: c.date, src: 'file' } : { flat: false };
}

const P = (D, b, p) => D.pooled[b][p];

/** One line for 「看 BTC 的細節」: only when 空手 and the gap is ≥ 10% (the case where the homepage number looks scary). */
export function detailLine(coin, D, now) {
  if (!valid(D) || !now?.flat || !(now.g >= 0.10)) return '';
  const b = bucketOf(now.g), i = P(D, b, 'is_'), o = P(D, b, 'oos');
  return `首頁寫還要 ${pc1(now.g)}，但翻轉價每天會跟著平均價往下移：過去空手時差 ${BUCKET_ZH[b]}（2018–23 年 ${i.n} 次／2024 年起 ${o.n} 次），真正轉成要放那天的價格，一般比當天看到的翻轉價低 ${ab1(i.vs_flip_med)}／${ab1(o.vs_flip_med)}、比當天收盤 ${pc1(i.rise_med)}／${pc1(o.rise_med)}，一般要等 ${dd(i.wait_med)}／${dd(o.wait_med)} 天。`;
}

export function answerLine(D, b, withHead = true) {
  const i = P(D, b, 'is_'), o = P(D, b, 'oos'), v = D.verdict[b];
  const head = v === 'cheaper' ? '<strong>不用真的漲那麼多：過去兩段時間，真正轉買的價格一般都比當天看到的翻轉價便宜。</strong>'
    : v === 'dearer' ? '<strong>差得很近時，真正轉買的價格一般比翻轉價再高一點點（收盤要站上才算）。</strong>'
    : v === 'too_few' ? '<strong>次數太少，說不準。</strong>' : '<strong>說不準：兩段時間結果不一致。</strong>';
  return `${withHead ? head : ''}空手時首頁差 ${BUCKET_ZH[b]} 的那天，到建議真的轉成要放那天：價格比當天收盤 ${pc1(i.rise_med)}（2018–23 年，一般）／${pc1(o.rise_med)}（2024 年起），`
    + `比當天寫的翻轉價 ${pc1(i.vs_flip_med)}／${pc1(o.vs_flip_med)}（比翻轉價便宜的 ${pc0(i.cheaper)}／${pc0(o.cheaper)}）；一般等 ${dd(i.wait_med)}／${dd(o.wait_med)} 天。`;
}

export function dipLine(D, b) {
  const i = P(D, b, 'is_'), o = P(D, b, 'oos');
  return `<strong>等的時候常常還會再跌一段</strong>：轉買之前，價格比那天收盤再低 10% 以上的有 ${pc0(i.dip10)}（2018–23）／${pc0(o.dip10)}（2024 起），一般最多再跌 ${ab1(i.dip_med)}／${ab1(o.dip_med)}。`
    + '<strong>便宜的是「比首頁寫的翻轉價」，不一定比當天收盤便宜</strong>（上面「比當天收盤」那個數字）。';
}

function tableHtml(D) {
  const row = (b, p) => { const s = P(D, b, p); return `<td>${s.n}</td><td>${pc1(s.rise_med)}</td><td>${pc1(s.vs_flip_med)}</td><td>${pc0(s.cheaper)}</td><td>${dd(s.wait_med)}</td>`; };
  return BUCKETS.map(b => `<tr><td>${BUCKET_ZH[b]}</td><td>2018–23</td>${row(b, 'is_')}</tr><tr><td></td><td>2024 起</td>${row(b, 'oos')}</tr>`).join('');
}

function eventsHtml(D) {
  const L = ['BTC', 'ETH'].flatMap(c => D.coins[c].events.filter(e => e.g >= 0.10).map(e => ({ c, ...e })));
  L.sort((a, b) => a.date < b.date ? 1 : -1);
  return L.map(e => `<tr><td>${e.date}</td><td>${e.c}</td><td>${pc1(e.g)}</td><td>${e.buy_date}</td><td>${e.wait}</td><td>${pc1(e.rise)}</td><td>${pc1(e.vs_flip)}</td></tr>`).join('');
}

export function nowLine(D, nows) {
  const parts = ['BTC', 'ETH'].map(c => {
    const n = nows?.[c];
    if (!n) return `${c} 資料讀不到`;
    if (!n.flat) return `${c} 現在不是空手，這張卡不適用`;
    const b = bucketOf(n.g);
    return `${c} 翻轉價 ${px(n.flip)}（比 ${n.date ? md(n.date) + ' ' : ''}收盤 ${pc1(n.g)}，屬於上面「差 ${BUCKET_ZH[b]}」那一級）`;
  });
  return `現在：${parts.join('；')}。翻轉價明天早上會重算，這裡不估計將來的價格。`;
}

export function you() {
  return '首頁「什麼時候會變」寫的是<strong>明天早上</strong>的翻轉價，不是「一定要漲這麼多才會買」。價格停在低檔時，平均價每天往下移，翻轉價也跟著降；所以差很多時，常常是等一個月上下、翻轉價降下來，價格只要回到附近就轉買。'
    + '實際用法：① 在交易所設到價提醒的話，不要設在今天看到的翻轉價、一直不改——每天早上看一下首頁新的翻轉價就好；② 不用因為「還要漲 20% 太遠」就覺得一定錯過，也不代表要自己先買（看「反彈一段了要自己先買嗎」那張卡）；③ 等的期間價格常常再跌一段，空手的話這段不用承受。'
    + '次數不多、相鄰兩段可能很像，數字會有誤差；過去不保證未來。建議本身不會因為這張卡改變。';
}

/** Advanced card. nows = { BTC: nowGap(...), ETH: nowGap(...) } */
export function buyPriceCard(D, nows) {
  const id = 'buyprice', h2 = '翻轉價還差很多（例：+19%）：等到建議真的轉成要放那天，價格會比今天貴多少？要等多久？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const cur = ['BTC', 'ETH'].map(c => nows?.[c]).filter(n => n?.flat && Number.isFinite(n.g)).map(n => bucketOf(n.g));
  const show = [...new Set(cur.length ? cur : ['10to20', 'ge20'])].sort((a, b) => BUCKETS.indexOf(a) - BUCKETS.indexOf(b));
  const nI = BUCKETS.reduce((s, b) => s + P(D, b, 'is_').n, 0), nO = BUCKETS.reduce((s, b) => s + P(D, b, 'oos').n, 0);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">找出過去每一次「建議空手」時，首頁翻轉價比當天收盤高多少（分 4 級，每段空手每一級只算第一天：2018–23 年共 ${nI} 次、2024 年起 ${nO} 次，BTC、ETH 合起來），再看建議<strong>真的</strong>轉成要放的那天早上 8 點收盤是多少。</p>
    ${show.map((b, k) => `<p>${answerLine(D, b, k === 0 || D.verdict[b] !== D.verdict[show[k - 1]])}</p>`).join('')}
    <p class="small">${dipLine(D, show[show.length - 1])}</p>
    <p class="small">${nowLine(D, nows)}</p>
    <details><summary class="small">4 級全部（一般值＝中間那一次）</summary>
      <div class="scroll"><table class="bt"><thead><tr><th>首頁差</th><th>期間</th><th>次數</th><th>轉買價 vs 當天收盤</th><th>vs 當天翻轉價</th><th>比翻轉價便宜</th><th>等幾天</th></tr></thead><tbody>${tableHtml(D)}</tbody></table></div>
      <p class="small muted">差不到 5% 時，轉買價一般比翻轉價高一點點（${pc1(P(D, 'lt5', 'is_').vs_flip_med)}／${pc1(P(D, 'lt5', 'oos').vs_flip_med)}），因為收盤要站上翻轉價才算。把每一個空手日都算進去（彼此重疊很多）結果方向一樣：差 20% 以上比翻轉價便宜 ${pc0(D.pooled_days.ge20.is_.cheaper)}／${pc0(D.pooled_days.ge20.oos.cheaper)}。</p>
    </details>
    <details><summary class="small">每一次（首頁差 10% 以上那天）</summary>
      <div class="scroll"><table class="bt"><thead><tr><th>那天</th><th>幣</th><th>首頁差</th><th>轉買那天</th><th>等幾天</th><th>vs 那天收盤</th><th>vs 那天翻轉價</th></tr></thead><tbody>${eventsHtml(D)}</tbody></table></div>
    </details>
    <p class="small"><strong>對你來說</strong>：${you()}</p>
    <p class="small muted">算法：<code>backtest/buy_price.py</code> → <code>data/buyprice.json</code>（Binance 已收完日K、2018 年起；冠軍 trend_vt@1 凍結公式，和凍結的逐日重做檔核對相同；翻轉價＝首頁同一算法；那天只用當天以前的價格，轉買那天之後的價格只用來對答案；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。「現在」用手機抓到的已收完日K。只看價格、沒有買賣，不涉及手續費。2018–23 年只算轉買也在 2023 年底前的次數；還在空手、還沒轉買的不算。判定事先固定（commit 632ddf3）：兩段的「vs 翻轉價」一般值都小於 0＝比較便宜、都大於 0＝比較貴、其他＝說不準，每段至少 3 次。研究用途，不是投資建議。</p>
  </section>`;
}
