// v45: 大跌／大漲的那一週，照建議 vs 一直抱著 — pure functions (no DOM, no network).
// History: backtest/move_weeks.py → data/moveweeks.json (champion trend_vt@1, closed Binance daily bars 2018→, daily
// resize with the virtual portfolios' costs; non-overlapping 7-day blocks anchored at the last close; big = ±10%).
// The latest 7 days are recomputed on the phone from the closed daily bars (flips.recoRows = same frozen rule) with the
// same sleeve arithmetic (parity-tested against the Python file). Descriptive past record only, not a signal.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
import { closeMD } from './trips.js';

export const COST = { per_side: 0.0015, twd_premium: 0.0027 };   // = forecast/common.py (tested)
export const BIG = 0.10, IN_EPS = 0.005;
const p1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const a1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)}%`;
const pts = x => `${Math.round(Math.abs(x * 100))} 個百分點`;
const twd = x => `NT$${Math.round(Math.abs(x)).toLocaleString('en-US')}`;
const perZh = n => n % 10000 === 0 ? `NT$${n / 10000} 萬` : twd(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Sleeve value ratio V[e]/V[s] over rows[s..e] (each {c, exposure}); identical arithmetic to backtest/trips.sleeve:
 *  at close t the money is resized to exposure_t of the post-cost value (0.15%/side + 0.27% on buys). Starts right after
 *  the close-s resize (coin share = exposure_s). */
export function sleeveRatio(rows, cost = COST) {
  let coin = rows[0].exposure, cash = 1 - coin;
  for (let t = 1; t < rows.length; t++) {
    coin *= rows[t].c / rows[t - 1].c;
    const v = cash + coin, e = rows[t].exposure; let k = 0;
    for (let i = 0; i < 4; i++) { const tr = e * (v - k) - coin; k = Math.abs(tr) * cost.per_side + Math.max(tr, 0) * cost.twd_premium; }
    const tgt = e * (v - k); cash = v - tgt - k; coin = tgt;
  }
  return cash + coin;
}
export const classOf = h => h <= -BIG ? 'drop' : h >= BIG ? 'rise' : 'normal';

/** The last 7 days from recoRows-style rows ({date, c, exposure}, ascending, closed bars only). */
export function weekRecap(rows) {
  if (!rows || rows.length < 8) return null;
  const w = rows.slice(-8), hold = w[7].c / w[0].c - 1, rule = sleeveRatio(w) - 1;
  return { start: w[0].date, end: w[7].date, hold, rule, e_in: w[0].exposure, cls: classOf(hold), days: w.map(r => ({ date: r.date, close: r.c, exposure: r.exposure })) };
}

/** Plain description of what the rule held during the week (exposures at closes s..e−1 are what was held). */
export function pathText(R) {
  const held = R.days.slice(0, 7), e0 = held[0].exposure;
  const out = i => held[i].exposure < IN_EPS;
  if (held.every((_, i) => out(i))) return '整週都是空手（一開始就沒放）';
  const k = held.findIndex((_, i) => i > 0 && out(i));
  if (e0 >= IN_EPS && k > 0 && held.slice(k).every((_, i) => out(k + i)))
    return `一開始放 ${pc0(e0)}，${closeMD(held[k].date)} 早上 8 點收盤後轉成空手`;
  const ex = held.map(d => d.exposure), lo = Math.min(...ex), hi = Math.max(...ex);
  return e0 < IN_EPS ? `一開始空手，期間最多放到 ${pc0(hi)}` : `一開始放 ${pc0(e0)}，期間在 ${pc0(lo)}～${pc0(hi)} 之間調整`;
}

const WORD = { drop: '大跌週', rise: '大漲週', normal: '' };
/** One coin's line about the latest 7 days. */
export function recapLine(coin, R, per = 100000) {
  if (!R) return '';
  const mv = R.hold < 0 ? `跌了 ${a1(R.hold)}` : `漲了 ${a1(R.hold)}`;
  const tag = WORD[R.cls] ? `（${WORD[R.cls]}）` : '';
  const verb = x => x < 0 ? `少 ${a1(x)}` : x > 0 ? `多 ${a1(x)}` : '不變';
  const nt = x => x < 0 ? `約少 ${twd(x * per)}` : x > 0 ? `約多 ${twd(x * per)}` : '不變';
  return `<strong>${coin}</strong>：${closeMD(R.start)} → ${closeMD(R.end)} 早上 8 點收盤，${coin} ${mv}${tag}。照建議：${pathText(R)} → 打算放在 ${coin} 的錢${verb(R.rule)}；一直抱著${verb(R.hold)}。`
    + `以打算放 ${perZh(per)}算：照建議${nt(R.rule)}，一直抱著${nt(R.hold)}。`;
}

function row(lab, s) {
  if (!s?.n) return `<tr><th>${lab}</th><td colspan="3">這段期間沒有</td></tr>`;
  return `<tr><th>${lab}<div class="muted small">${s.n} 週</div></th><td>${p1(s.hold_mean)}<div class="muted small">一般 ${p1(s.hold_median)}</div></td>`
    + `<td><strong>${p1(s.rule_mean)}</strong><div class="muted small">一般 ${p1(s.rule_median)}</div></td>`
    + `<td>${pc0(s.out_in)}</td></tr>`;
}
function table(c, S) {
  const t = (lab, P) => `<tr class="sub"><th colspan="4">${lab}</th></tr>${row('大跌週（跌 10% 以上）', P.drop)}${row('大漲週（漲 10% 以上）', P.rise)}${row('其他週', P.normal)}`;
  return `<div class="scroll"><table class="bt"><thead><tr><th>${c}<div class="muted small">每 7 天一段</div></th><th>一直抱著<div class="muted small">平均</div></th><th>照建議<div class="muted small">平均，含成本</div></th><th>那週開始前已空手</th></tr></thead><tbody>
    ${t('2023 年起（較能代表實際）', S.oos)}${t('2018～2022（規則設定時看過）', S.is)}</tbody></table></div>`;
}
function balance(c, S) {
  const d = S.oos.drop, r = S.oos.rise;
  if (!d?.n || !r?.n) return '';
  const more = Math.abs(r.sum_diff) > Math.abs(d.sum_diff) * 1.1 ? '少賺的比少虧的多' : Math.abs(d.sum_diff) > Math.abs(r.sum_diff) * 1.1 ? '少虧的比少賺的多' : '兩邊差不多';
  return `${c}：${d.n} 個大跌週照建議全部加起來少虧 ${pts(d.sum_diff)}，${r.n} 個大漲週少賺 ${pts(r.sum_diff)}（${more}）`;
}

const why = (a, b) => { const cs = [a?.cls, b?.cls]; const w = cs.includes('drop') ? '跌' : cs.includes('rise') ? '漲' : '';
  return w ? `<p class="small">這週為什麼${w}：見下面「<a href="#events">最近大漲大跌的原因</a>」（新聞多半是當天或事後才出來，不能拿來事先預測）。</p>` : ''; };
/** Advanced card. recaps = {BTC, ETH} from weekRecap on the phone's closed bars (null → file's `current`). */
export function moveCard(MW, recaps = {}) {
  const H = '<h2>大跌／大漲的那一週：照建議 vs 一直抱著</h2>';
  if (!MW?.coins?.BTC || !MW?.coins?.ETH) return `<section class="card" id="moveweeks">${H}<p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const R = c => recaps?.[c] || MW.coins[c].current;
  const src = ['BTC', 'ETH'].every(c => recaps?.[c]) ? '用手機抓到的已收完日K即時算' : `用回測檔（${asofInline(MW.as_of)}）`;
  const b = MW.coins.BTC.stats.oos, e = MW.coins.ETH.stats.oos;
  return `<section class="card" id="moveweeks">${H}
    <p class="small"><strong>最近 7 天</strong>（${src}，同一條規則、含手續費）：</p>
    <ul class="small"><li>${recapLine('BTC', R('BTC'))}</li><li>${recapLine('ETH', R('ETH'))}</li></ul>
    <p class="small">過去每一段 7 天（不重疊）都這樣比一次。2023 年起：BTC ${b.drop.n} 個大跌週，一直抱著平均 ${p1(b.drop.hold_mean)}、照建議 ${p1(b.drop.rule_mean)}；ETH ${e.drop.n} 個，${p1(e.drop.hold_mean)} vs ${p1(e.drop.rule_mean)}。但大漲週也少賺：BTC ${b.rise.n} 週 ${p1(b.rise.hold_mean)} vs ${p1(b.rise.rule_mean)}、ETH ${e.rise.n} 週 ${p1(e.rise.hold_mean)} vs ${p1(e.rise.rule_mean)}。</p>
    ${table('BTC', MW.coins.BTC.stats)}${table('ETH', MW.coins.ETH.stats)}
    <p class="small"><strong>白話重點</strong>：① 大跌週照建議幾乎每次都少虧很多——這是設計本來就會這樣：它最多只放 100%，而且大跌常接在之前已經在跌的時候，那時多半已減碼或空手（2023 年起大跌週有 ${pc0(b.drop.out_in)}（BTC）／${pc0(e.drop.out_in)}（ETH）在那週開始前就已空手）。② 代價是大漲週只拿到一部分。2023 年起 ${balance('BTC', MW.coins.BTC.stats)}；${balance('ETH', MW.coins.ETH.stats)}。③ 所以它的用處是<strong>大跌時讓你少受傷、比較抱得住</strong>，不是多賺；照建議<strong>還沒有證明能贏過一直抱著</strong>。「大跌週」是事後才知道的分類，規則事前並不知道那週會大跌。</p>
    ${why(R('BTC'), R('ETH'))}
    <p class="small muted">算法：<code>backtest/move_weeks.py</code> → <code>data/moveweeks.json</code>（Binance 已收完日K，${asofInline(MW.as_of)}，${WEEKLY_NOTE}；定義事先固定在程式說明）。從最新一根收盤往回每 7 天切一段；一直抱著＝那段的漲跌（本來就在幣裡，不用買賣）；照建議＝每天早上 8 點收盤照冠軍建議比例調整，買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同）。大跌／大漲＝那段漲跌超過 10%（和「大漲跌原因」的 7 天門檻相同）。週數不多（2023 年起大跌週 BTC ${b.drop.n}、ETH ${e.drop.n} 週），平均值誤差大；切點往前移 1～6 天結果相近。這是過去紀錄，不是預測。</p>
  </section>`;
}
