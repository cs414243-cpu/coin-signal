// v63: 剛轉成加碼，會不會很快又變回空手？ — pure functions (no DOM, no network).
// backtest/quick_exit.py → data/quickexit.json: every past trip (same trips as v36); a quick reversal = the rule went
// back to 0 within W days (headline W = 7, fixed before the first run; 14 / 28 report only). Definitions committed
// before the first run (b697fd9), IS-only results before any 2024+ number (132c798). Trend-following = many small
// false starts + a few long trends (Fung & Hsieh 2001 RFS 14(2):313–341, doi 10.1093/rfs/14.2.313).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const ntd = x => `NT$${Math.round(Math.abs(x) * 1e6).toLocaleString('en-US')}`;
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D?.grid?.[D?.headline];
// trip columns: coin, start, end, days, r, period
export const quick = (D, p, W = D.W) => D.trips.filter(t => (!p || t[5] === p) && t[3] <= W);

export function valid(D) {
  const G = HEAD(D), v = D?.verdict;
  if (!D || D.is_only || !G || !v || !['common', 'rare', 'mixed', 'unclear'].includes(v.common) || !['small', 'large', 'unclear'].includes(v.cost)
      || !['carries', 'no', 'unclear'].includes(v.lasting)) return false;
  return ['is_', 'oos', 'all'].every(p => ['BTC', 'ETH', 'both'].every(c => Number.isInteger(G[p]?.[c]?.quick?.n) && Number.isInteger(G[p]?.[c]?.lasting?.n)))
    && Number.isInteger(D.W) && Array.isArray(D.trips) && D.trips.length === G.all.both.n && ['BTC', 'ETH'].every(c => D.coins?.[c]) && D.after_quick?.all;
}

/** Plain conclusion (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const G = HEAD(D), A = G.all.both, i = G.is_.both, o = G.oos.both, v = D.verdict;
  const freq = `過去 ${A.n} 趟裡，有 ${A.quick.n} 趟（${pc0(A.quick.share)}）在 ${D.W} 天內就變回空手（2023 年以前 ${pc0(i.quick.share)}、2024 年起 ${pc0(o.quick.share)}）`;
  const head = v.common === 'common' ? `<strong>會，而且很常見</strong>：${freq}。`
    : v.common === 'rare' ? `<strong>不常發生</strong>：${freq}。` : `<strong>前後兩段不一樣</strong>：${freq}。`;
  const cost = v.cost === 'small' ? `這種很快又賣掉的趟幾乎都小賠，平均每趟 ${pc1(A.quick.mean)}（含手續費），兩段都不超過 3%。`
    : v.cost === 'large' ? `這種很快又賣掉的趟平均每趟 ${pc1(A.quick.mean)}（含手續費），有一段平均賠超過 3%。`
    : `這種很快又賣掉的趟平均每趟 ${pc1(A.quick.mean)}（含手續費），兩段不一致，說不準。`;
  const last = v.lasting === 'carries' ? `撐過 ${D.W} 天的那幾趟，兩段平均都是賺的（不過其中也只有 ${pc0(A.lasting.win)} 賺錢）——賺的錢幾乎都來自這些趟。`
    : v.lasting === 'no' ? `撐過 ${D.W} 天的那幾趟，兩段平均也是賠的。` : `撐過 ${D.W} 天的那幾趟，兩段結果不一致。`;
  return head + cost + last;
}

function table(D) {
  const G = HEAD(D);
  const row = (lab, g) => `<tr><th>${lab}</th><td>${g.n}</td><td>${g.quick.n}（${pc0(g.quick.share)}）</td><td>${g.quick.n ? pc1(g.quick.mean) : '—'}</td><td>${g.quick.n ? pc0(g.quick.win) : '—'}</td><td>${g.lasting.n ? pc1(g.lasting.mean) : '—'}</td><td>${g.lasting.n ? pc1(g.lasting.best) : '—'}</td></tr>`;
  const rows = [['2023 年以前', 'is_'], ['2024 年起', 'oos']].flatMap(([p, k]) => ['BTC', 'ETH'].map(c => row(`${p}<div class="muted small">${c}</div>`, G[k][c]))).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>時期</th><th>趟數</th><th>${D.W} 天內又賣掉</th><th>那些趟平均</th><th>其中賺錢</th><th>撐過 ${D.W} 天的平均</th><th>最好一趟</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function moneyLine(D) {
  const G = HEAD(D), o = G.oos.both;
  return `換成金額：放 NT$100 萬在一個幣，很快又賣掉的一趟，2024 年起平均少 ${ntd(o.quick.mean)}（主要是來回手續費和買進後小跌）；2024 年起這種趟合起來 ${pc1(o.quick.total)}，撐久的趟合起來 ${pc1(o.lasting.total)}。`;
}

export function windowLine(D) {
  const out = [];
  for (const w of D.ws || []) {
    if (w === D.W) continue;
    const g = D.grid?.[`W${w}`]; if (!g) continue;
    out.push(`${w} 天內：2023 年以前 ${pc0(g.is_.both.quick.share)}、2024 年起 ${pc0(g.oos.both.quick.share)}（平均 ${pc1(g.all.both.quick.mean)}）`);
  }
  return out.length ? `看長一點（只供對照）：${out.join('；')}。` : '';
}

export function backLine(D) {
  const a = D.after_quick.all;
  return a.n ? `很快賣掉之後，有 ${pc0(a.back_soon_share)} 在 ${D.back_days} 天內又重新轉成加碼（${a.back_soon}／${a.n} 次）；接下來那一趟平均 ${pc1(a.next_mean)}（2023 年以前 ${pc1(D.after_quick.is_.next_mean)}、2024 年起 ${pc1(D.after_quick.oos.next_mean)}）。` : '';
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c];
    return C.open_trip ? `${c} 這一趟 ${md(C.open_trip.start)} 進場，已經 ${C.open_trip.days_so_far} 天，到現在 ${pc1(C.open_trip.r_so_far)}` : `${c} 建議是 0（下次轉成加碼時，可以先預期它可能幾天內又賣掉）`;
  }).join('；') + '。';
}

export function you(D) {
  const v = D.verdict, A = HEAD(D).all.both;
  let t = `轉成加碼後幾天又變回空手，是這個方法的<strong>正常樣子</strong>，不是出錯：它要先買一點試試，趨勢沒延續就馬上賣、只小賠；少數撐下來的趟才是賺錢的來源。進場那天沒辦法知道這次會不會撐下去，所以不要因為上一次很快就賣掉，下次就不跟；也不要因為剛賣掉就覺得「被洗了」而自己買回。`;
  if (v.cost !== 'small' || v.lasting !== 'carries') t += '這次兩段結果不完全一致，看法要保守。';
  return t + `如果來回幾次的手續費讓你不舒服，就把打算放的錢調少，而不是跳過某幾次（全部 ${A.n} 趟的紀錄，2024 年起只有 ${HEAD(D).oos.both.n} 趟，不保證未來）。`;
}

/** Advanced card. */
export function quickExitCard(D) {
  const id = 'quickexit', h2 = '剛轉成加碼，會不會很快又變回空手？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">現在空手，下次建議變成加碼時，最常見的疑問是「會不會買了馬上又叫我賣」。這張卡用過去每一趟（同「每一次進場的結果」），算從開始買到又變回 0 只隔 ${D.W} 天以內的有多少、結果如何，跟撐得比較久的趟比。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${moneyLine(D)}</p>
    <p class="small">${backLine(D)}</p>
    <p class="small">${windowLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/quick_exit.py</code> → <code>data/quickexit.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0，天數＝最後賣出那天減第一次買進那天；結果含第一次買進、中間每天調整、最後賣出（買賣 0.15%、買進加台幣溢價 0.27%），沒投入的錢不計利息。「很快又賣掉」＝天數 ≤ ${D.W}（事先固定；14、28 天只供對照）。分段：2023 年以前＝整趟在 2023 年底以前結束；2024 年起＝在 2024 年以後開始。判斷標準事先固定（commit b697fd9）：兩段都至少 ${Math.round(D.share_cut * 100)}%＝「很常見」；兩段很快賣掉的趟平均（取對數）都是賠、而且平均都不超過 ${Math.round(-D.big_loss * 100)}%＝「小賠」；撐久的趟兩段平均都是賺＝「賺的錢在這裡」；每段每組至少 ${D.nmin} 趟，否則說不準。</p>
  </section>`;
}
