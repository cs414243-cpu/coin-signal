// v46: 大跌一週之後：現在買進（抄底）vs 照建議 vs 先不動 — pure functions (no DOM, no network).
// History: backtest/dip_buy.py → data/dipbuy.json (closed Binance daily bars 2018→, champion trend_vt@1 = frozen rule,
// virtual-portfolio costs). The "now" line (last 7 days, current recommendation) is recomputed on the phone from the
// closed daily bars with flips.recoRows (same rule). Descriptive past record only — not a signal, not a prediction.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
import { closeMD } from './trips.js';

export const COST = { per_side: 0.0015, twd_premium: 0.0027 };   // = forecast/common.py (tested)
export const TIERS = { d10: -0.10, d20: -0.20 };
export const IN_EPS = 0.005;
const p1 = x => { if (x === null || x === undefined || !Number.isFinite(x)) return '—'; const r = Math.round(x * 1000) / 10; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}%`; };
const a1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)}%`;

/** 100% bought at close i (pays buy cost), marked at close i+h. rows = recoRows-style ({date, c, exposure}). */
export function buyRet(rows, i, h, cost = COST) { return (1 / (1 + cost.per_side + cost.twd_premium)) * rows[i + h].c / rows[i].c - 1; }
/** Start from cash at close i, follow the recommendation at closes i..i+h−1 (trips.sleeve arithmetic), marked at close i+h. */
export function ruleRet(rows, i, h, cost = COST) {
  let cash = 1, coin = 0;
  for (let j = i; j <= i + h; j++) {
    if (j > i) coin *= rows[j].c / rows[j - 1].c;
    if (j === i + h) break;
    const v = cash + coin, e = rows[j].exposure; let k = 0;
    for (let n = 0; n < 4; n++) { const tr = e * (v - k) - coin; k = Math.abs(tr) * cost.per_side + Math.max(tr, 0) * cost.twd_premium; }
    const tgt = e * (v - k); cash = v - tgt - k; coin = tgt;
  }
  return cash + coin - 1;
}
/** Latest closed bar: 7-day change, recommendation, which tiers it triggers. */
export function nowState(rows) {
  if (!rows || rows.length < 8) return null;
  const L = rows.length - 1, r7 = rows[L].c / rows[L - 7].c - 1;
  return { date: rows[L].date, close: rows[L].c, r7, exposure: rows[L].exposure, tiers: Object.keys(TIERS).filter(k => r7 <= TIERS[k]) };
}

export function nowLine(coin, S) {
  if (!S) return '';
  const mv = S.r7 < 0 ? `跌了 ${a1(S.r7)}` : `漲了 ${a1(S.r7)}`;
  const rec = S.exposure < IN_EPS ? '建議空手' : `建議放約 ${pc0(S.exposure)}`;
  const tag = S.tiers.includes('d20') ? '→ 算「跌 20% 以上」的大跌（也算跌 10% 以上）' : S.tiers.includes('d10') ? '→ 算「跌 10% 以上」的大跌' : '→ 不算大跌（沒跌到 10%），下面的紀錄現在用不到';
  return `<strong>${coin}</strong>：到 ${closeMD(S.date)} 早上 8 點收盤，過去 7 天${mv}，${rec} ${tag}。`;
}

const cell = (s, h) => !s?.n ? '—' : `${p1(s.buy_mean)}<div class="muted small">${pc0(s.buy_up)} 賺</div>`;
function rows(lab, P, tier) {
  const A = P?.[tier], r = (sub, name) => {
    const s7 = A?.['7']?.[sub], s30 = A?.['30']?.[sub];
    if (!s30?.n) return `<tr><th>${name}</th><td colspan="4">這段期間沒有</td></tr>`;
    return `<tr><th>${name}<div class="muted small">${s30.n} 次</div></th><td>${cell(s7)}</td><td><strong>${p1(s30.buy_mean)}</strong><div class="muted small">${pc0(s30.buy_up)} 賺</div></td><td>${p1(s30.rule_mean)}</td><td>${p1(s30.base_mean)}<div class="muted small">${pc0(s30.base_up)} 賺</div></td></tr>`;
  };
  return `<tr class="sub"><th colspan="5">${lab}</th></tr>${r('all', '全部')}${r('out', '當時建議空手（像現在）')}`;
}
function table(c, C) {
  return `<div class="scroll"><table class="bt"><thead><tr><th>${c}<div class="muted small">7 天跌 10% 以上</div></th><th>馬上買進<div class="muted small">7 天後</div></th><th>馬上買進<div class="muted small">30 天後</div></th><th>照建議<div class="muted small">30 天後</div></th><th>平常買進<div class="muted small">30 天後</div></th></tr></thead><tbody>
    ${rows('2023 年起（較能代表實際）', C.stats.oos, 'd10')}${rows('2018～2022（規則設定時看過）', C.stats.is, 'd10')}</tbody></table></div>`;
}
const worstOut = (C) => { const s = C.stats.oos.d10['30'].out; return s?.n ? `${p1(s.worst.buy)}（${s.worst.date.slice(0, 7).replace('-', '/')}）` : '—'; };

/** Advanced card. now = {BTC, ETH} from nowState on the phone's closed bars (null → file's `current`). */
export function dipCard(D, now = {}) {
  const H = '<h2>大跌一週之後：現在買進 vs 照建議</h2>';
  if (!D?.coins?.BTC || !D?.coins?.ETH) return `<section class="card" id="dipbuy">${H}<p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const N = c => now?.[c] || D.coins[c].current;
  const src = ['BTC', 'ETH'].every(c => now?.[c]) ? '用手機抓到的已收完日K即時算' : `用回測檔（${asofInline(D.as_of)}）`;
  const B = D.coins.BTC, E = D.coins.ETH, bo = B.stats.oos.d10['30'].out, eo = E.stats.oos.d10['30'].out;
  const bi = B.stats.is.d10['30'].out, ei = E.stats.is.d10['30'].out, b20 = B.stats.oos.d20['30'].all, e20 = E.stats.oos.d20['30'].all;
  return `<section class="card" id="dipbuy">${H}
    <p class="small">跌了一大段之後，很多人會想「便宜了，現在買」。這張卡把過去每一次「7 天內跌 10% 以上」的那天收盤都拿出來，比較三種做法接下來 7 天、30 天的結果：<strong>馬上全部買進</strong>、<strong>照建議</strong>（從現金開始照每天的建議）、<strong>先不動</strong>（0%）。</p>
    <p class="small"><strong>現在</strong>（${src}）：</p>
    <ul class="small"><li>${nowLine('BTC', N('BTC'))}</li><li>${nowLine('ETH', N('ETH'))}</li></ul>
    <p class="small">2023 年起，跌 10% 以上而且<strong>建議是空手的時候（像現在）</strong>馬上全部買進：BTC ${bo.n} 次，30 天後平均 ${p1(bo.buy_mean)}，只有 ${pc0(bo.buy_up)} 的次數賺錢；ETH ${eo.n} 次，平均 ${p1(eo.buy_mean)}，${pc0(eo.buy_up)} 賺錢。對照：平常隨便哪天買進，30 天後平均 BTC ${p1(bo.base_mean)}（${pc0(bo.base_up)} 賺）、ETH ${p1(eo.base_mean)}（${pc0(eo.base_up)} 賺）。最慘一次 BTC ${worstOut(B)}、ETH ${worstOut(E)}。</p>
    ${table('BTC', B)}${table('ETH', E)}
    <p class="small"><strong>白話重點</strong>：① 2023 年起，跌很多又是空手的時候，「便宜了」並沒有帶來反彈——馬上買進一個月後多半還是虧，比平常隨便哪天買更差。② 但 2018～2022 不一樣（同樣情況 30 天後 BTC 平均 ${p1(bi.buy_mean)}、一般 ${p1(bi.buy_median)}；ETH 平均 ${p1(ei.buy_mean)}、一般 ${p1(ei.buy_median)}），而且次數不多、平均常被一兩次大漲大跌拉動，所以<strong>兩個方向都沒有證明</strong>：不能說跌深就該買，也不能說跌深之後一定會再跌。試過的「超跌買回」訊號也沒通過（見「<a href="#tested">試過但沒通過的訊號</a>」）。③ 照建議的做法是等價格站回平均價之上才買（首頁「什麼時候會變」就是那個價），代價是反彈的開頭會錯過、好處是避開「越跌越買」。跌 20% 以上的次數更少（2023 年起 BTC ${b20.n} 次、ETH ${e20.n} 次），不下結論。</p>
    <p class="small muted">算法：<code>backtest/dip_buy.py</code> → <code>data/dipbuy.json</code>（Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}；定義事先固定在程式說明）。「跌 10% 以上」＝那天收盤比 7 天前低 10% 以上（和「大漲跌原因」的 7 天門檻相同），只用那天收盤以前的資料；連續好幾天都符合時只算第一天，下一次至少隔 7 天。馬上買進＝那天收盤全部買進、付 0.15%＋台幣溢價 0.27%；照建議＝從現金開始，每天早上 8 點收盤照建議比例調整，買賣各 0.15%、買進再 0.27%（和虛擬投組相同）；都算到 7／30 天後的收盤、不扣賣出成本。30 天的結果彼此會重疊、次數少，平均誤差大；晚一天才買結論相近。最近一次（BTC ${B.pending.d10.map(closeMD).join('、') || '—'}、ETH ${E.pending.d10.concat(E.pending.d20).filter((x, i, a) => a.indexOf(x) === i).map(closeMD).join('、') || '—'}）30 天還沒到，還沒算進去。這是過去紀錄，不是預測。</p>
  </section>`;
}
