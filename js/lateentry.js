// v61: 轉成加碼時已經漲很多了，還要跟嗎？ — pure functions (no DOM, no network).
// Trend following only puts money in after the price has already risen, so every entry "looks late" (anchoring on the
// recent low: Tversky & Kahneman 1974 Science 185(4157)). backtest/late_entry.py → data/lateentry.json: every past trip
// (same trips as v36) split by how far the price was above its 60-day lowest close on the entry day (ex-ante), late =
// ≥ T (T = median of the 2018–2023 trips, frozen from those trips only); cost of skipping the late ones. Definitions
// committed before the first run (55af2b8), IS-only results before any 2024+ number (429f267).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}%`;
const up1 = x => Number.isFinite(x) ? `${(Math.abs(x) * 100).toFixed(1)}%` : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const md = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };   // candle D closes D+1 08:00 Taipei
export const HEAD = D => D?.grid?.[D?.headline];
export const tpct = D => Math.round(D.T * 100);

export function valid(D) {
  const G = HEAD(D);
  if (!D || D.is_only || !G || !D.verdict || !['follow', 'skip', 'unclear'].includes(D.verdict.skip) || !['better', 'worse', 'unclear'].includes(D.verdict.late_vs_early)) return false;
  return ['is_', 'oos', 'all'].every(p => ['late', 'early'].every(g => Number.isInteger(G[p]?.both?.[g]?.n))) && Number.isFinite(D.T) && D.T > 0
    && ['BTC', 'ETH'].every(c => Number.isFinite(D.coins?.[c]?.up_now)) && Array.isArray(D.trips);
}

/** Plain conclusion (depends only on data + the pre-registered verdicts). */
export function headLine(D) {
  const G = HEAD(D), i = G.is_, o = G.oos, T = tpct(D);
  const per = g => ['BTC', 'ETH'].filter(c => g[c].late.n).map(c => `${c} ${g[c].late.n} 趟 ${pc1(g[c].late.prod)}`).join('、');
  const nums = `2023 年以前 ${i.both.late.n} 趟（${per(i)}）、2024 年起 ${o.both.late.n} 趟（${per(o)}）`;
  if (D.verdict.skip === 'follow') return `<strong>已經漲了 ${T}% 以上才轉成加碼的那幾趟，過去跳過是吃虧的</strong>：這些趟連起來的結果 ${nums}，跳過就等於少賺這些。`;
  if (D.verdict.skip === 'skip') return `<strong>已經漲了 ${T}% 以上才轉成加碼的那幾趟，過去跳過反而比較好</strong>：這些趟連起來的結果 ${nums}。`;
  return `已經漲了 ${T}% 以上才轉成加碼的那幾趟，跳過好不好<strong>說不準</strong>（這些趟連起來的結果 ${nums}）。`;
}

export function compareLine(D) {
  const G = HEAD(D), a = G.is_.both, b = G.oos.both;
  const nums = `每趟平均：2023 年以前 已經漲很多 ${pc1(a.late.mean)} vs 還沒漲多 ${pc1(a.early.mean)}；2024 年起 ${pc1(b.late.mean)} vs ${pc1(b.early.mean)}`;
  const w = { better: '已經漲很多才出現的加碼，兩段都<strong>沒有比較差，反而比較好</strong>', worse: '已經漲很多才出現的加碼，兩段都<strong>比較差</strong>', unclear: '已經漲很多才出現的加碼，好壞<strong>前後不一致</strong>' }[D.verdict.late_vs_early];
  return `${w}（${nums}）。`;
}

function table(D) {
  const G = HEAD(D), T = tpct(D);
  const row = (lab, g) => `<tr><th>${lab}</th><td>${g.n}</td><td>${pc1(g.mean)}</td><td>${pc1(g.median)}</td><td>${pct0(g.win)}</td><td>${pc1(g.best)}</td></tr>`;
  const rows = [['2023 年以前', 'is_'], ['2024 年起', 'oos']].map(([p, k]) => row(`${p}<div class="muted small">已漲 ≥ ${T}%</div>`, G[k].both.late) + row(`${p}<div class="muted small">不到 ${T}%</div>`, G[k].both.early)).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>轉加碼那天<div class="muted small">離 60 天最低</div></th><th>趟數</th><th>平均每趟</th><th>中間那趟</th><th>賺錢的比例</th><th>最好一趟</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** 2024+ late trips, one by one (the out-of-sample evidence is small; show it all). */
export function oosLate(D) { return D.trips.filter(t => t[6] === 'oos' && t[4] >= D.T); }
function oosLine(D) {
  const L = oosLate(D); if (!L.length) return '';
  return `2024 年起每一趟「已經漲很多」：` + L.map(t => `${t[0]} ${md(t[1])}（已漲 ${up1(t[4])}，${t[3]} 天，${pc1(t[5])}）`).join('、') + '。';
}

/** Report-only robustness: other look-back windows at the same T. */
export function robustLine(D) {
  const T = tpct(D), out = [];
  for (const L of (D.ls || []).filter(x => x !== D.L)) {
    const g = D.grid?.[`L${L}_T${T}`]; if (!g) continue;
    const o = g.oos.both; if (!o.late?.n) continue;
    out.push(`看 ${L} 天最低：2024 年起已漲很多 ${o.late.n} 趟平均 ${pc1(o.late.mean)}、還沒漲多 ${pc1(o.early.mean)}`);
  }
  if (!out.length) return '';
  const flips = (D.ls || []).filter(x => x !== D.L).some(L => { const o = D.grid?.[`L${L}_T${T}`]?.oos?.both; return o?.late?.n && o.early?.n && (o.late.g - o.early.g) * (HEAD(D).oos.both.late.g - HEAD(D).oos.both.early.g) < 0; });
  return `換個看法：${out.join('；')}。${flips ? '「漲很多的比較好」換個看法就不一定成立（差距很小），所以只能說過去<strong>沒有明顯比較差</strong>。' : '結論方向一樣。'}`;
}

export function nowLine(D) {
  return '現在：' + ['BTC', 'ETH'].map(c => {
    const C = D.coins[c];
    return `${c} 收盤比最近 60 天最低收盤${C.up_now >= 0 ? '高' : '低'} ${up1(C.up_now)}（${C.open_trip ? '這一趟還沒結束' : '建議是 0'}${C.open_trip ? '' : `，如果現在轉成加碼，${C.late_now ? '算「已經漲很多」' : '還不算「已經漲很多」'}`}）`;
  }).join('；') + '。';
}

/** Advanced card. */
export function lateEntryCard(D) {
  const id = 'lateentry', h2 = '轉成加碼時已經漲很多了，還要跟嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const G = HEAD(D), T = tpct(D), A = G.all.both;
  const you = D.verdict.skip === 'follow'
    ? `建議從空手轉成加碼時，價格通常已經從低點漲了一段，看起來「太晚了」。過去因為這樣跳過，剛好錯過賺最多的幾趟；照樣照建議比較好。但大部分趟還是小賠（中間那趟約 ${pc1(A.late.median)}），賺錢靠少數幾趟，要有心理準備。`
    : D.verdict.skip === 'skip' ? '過去跳過已經漲很多的加碼沒有吃虧，但趟數不多，不代表以後也一樣。' : '跳過或照做沒有明顯的好壞，次數也不多；不要只因為「已經漲很多」就改變做法。';
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">照建議的方法要等價格先漲一段才會從 0 轉成加碼，所以常常一出現就覺得「已經漲很多、太晚了」。這張卡把過去每一趟（同「每一次進場的結果」）依<strong>轉成加碼那天，價格比最近 60 天最低收盤高多少</strong>分兩組：高 ${T}% 以上＝「已經漲很多」，其餘＝「還沒漲多」，看結果有沒有比較差、跳過會怎樣。都含手續費；每個幣用自己打算放的錢算。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${compareLine(D)}</p>
    ${table(D)}
    <p class="small">${oosLine(D)}</p>
    <p class="small">${robustLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you}2024 年以後「已經漲很多」的只有 ${G.oos.both.late.n} 趟，這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/late_entry.py</code> → <code>data/lateentry.json</code>（冠軍 trend_vt@1 公式、Binance 已收完日K 2018 年起，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。一趟＝建議從 0 變成有投入到回到 0，結果含第一次買進、中間每天調整、最後賣出（買賣 0.15%、買進加台幣溢價 0.27%）；跳過一趟＝那段時間留現金（不計利息）。已漲多少＝轉加碼那天收盤 ÷ 那天以前 60 天（含當天）最低收盤 − 1，只用當天以前的價格。門檻 ${T}%＝2023 年以前各趟的中間值（只用那些趟算出、之後固定）。分段：2023 年以前＝整趟在 2023 年底以前結束；2024 年起＝在 2024 年以後開始；跨兩段的只算在全部。判斷標準事先固定（commit 55af2b8）：「已經漲很多」那幾趟兩段平均（取對數）都賺、每段至少 ${D.nmin} 趟＝「跳過吃虧」，兩段都賠＝「跳過比較好」，其他＝「說不準」。只供對照：30／90 天最低、固定門檻 10／20／30%，結果放在 data 檔。</p>
  </section>`;
}
