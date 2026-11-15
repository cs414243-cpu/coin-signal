// v47: 要放回最多，要漲到哪裡？ — pure functions (no DOM, no network).
// The top card's 「什麼時候會變」 is only the NEAREST flip (first, partial step). The frozen rule trend_vt@1 goes back to
// its full share only when the close is above BOTH the 50- and the 200-day average. Today's two flip prices come from the
// phone's CLOSED daily bars (reliability.flipLevels, same formula as backtest/full_path.py); the history (how often the
// first partial buy-back went on to both lines, and how often 空手 days this far away got there within 30 / 90 days) comes
// from data/fullpath.json (Binance closed daily bars, 2018→, 2023→ = out of sample). Not a signal, not a forecast.
import { flipLevels } from './reliability.js';
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const EPS = 0.005;
export const EDGES = [0, 0.10, 0.20, 0.30, Infinity];   // = backtest/full_path.py (fixed before the first run)
export const LABELS = ['lt10', '10to20', '20to30', 'ge30'];
export const BUCKET_ZH = { lt10: '不到 10%', '10to20': '10%～20%', '20to30': '20%～30%', ge30: '30% 以上' };
const usd0 = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) : '—';
const p1 = x => Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—';
const sgn = d => Number.isFinite(d) ? `${d >= 0 ? '+' : '−'}${p1(Math.abs(d))}` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const dd = x => Number.isFinite(x) ? (Number.isInteger(x) ? String(x) : x.toFixed(1)) : '—';
export const md = s => { const d = new Date(s + 'T00:00:00Z'); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
/** Taipei 08:00 close date (M/D) of a UTC candle date (the candle of day D closes at D+1 08:00 Taipei). */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export function bucketOf(d) {
  if (!Number.isFinite(d) || d < 0) return null;
  for (let i = 0; i < LABELS.length; i++) if (d >= EDGES[i] && d < EDGES[i + 1]) return LABELS[i];
  return null;
}
/** Today's path from closed closes (ascending). null when both lines are already below the close (nothing to reach).
 *  first = the nearest line the close is not above (first step up); full = the higher of the lines it is not above. */
export function pathFrom(closes, date = null) {
  const F = flipLevels(closes); if (!F) return null;
  if (F.trend >= 1) return { date, close: F.close, trend: F.trend, full: null, src: 'phone' };
  const up = F.levels.filter(l => !l.above);
  if (!up.length) return null;
  const full = up.reduce((a, b) => b.price > a.price ? b : a), first = up.reduce((a, b) => b.price < a.price ? b : a);
  const dist = full.price / F.close - 1;
  return { date, close: F.close, trend: F.trend, full: { ma: full.ma, price: full.price, dist }, first: { ma: first.ma, price: first.price, dist: first.price / F.close - 1 },
    levels: F.levels.map(l => ({ ma: l.ma, price: l.price, dist: l.dist, above: l.above })), bucket: F.trend === 0 ? bucketOf(dist) : null, src: 'phone' };
}
/** Same shape from data/fullpath.json (only used when the phone has no bars and the file is for the forecast's candle date). */
export function filePath(FP, coin) {
  const c = FP?.coins?.[coin]?.current; if (!c) return null;
  if (c.trend3 >= 1) return { date: c.date, close: c.close, trend: c.trend3, full: null, src: 'file' };
  const lv = [{ ma: 50, price: c.f50, dist: c.f50 / c.close - 1, above: c.above50 }, { ma: 200, price: c.f200, dist: c.f200 / c.close - 1, above: c.above200 }];
  const up = lv.filter(l => !l.above); if (!up.length) return null;
  const full = up.reduce((a, b) => b.price > a.price ? b : a), first = up.reduce((a, b) => b.price < a.price ? b : a);
  return { date: c.date, close: c.close, trend: c.trend3, full: { ma: full.ma, price: full.price, dist: full.price / c.close - 1 },
    first: { ma: first.ma, price: first.price, dist: first.price / c.close - 1 }, levels: lv, bucket: c.trend3 === 0 ? bucketOf(full.price / c.close - 1) : null, src: 'file' };
}
export function pickPath(FP, coin, closes, date, asof) {
  if (closes && closes.length >= 200) { const s = pathFrom(closes, date); if (s !== undefined) return s; }
  const f = filePath(FP, coin);
  return f && (!asof || f.date === asof) ? f : undefined;
}
/** One plain line inside 「看 X 的細節」. s from pickPath; FP = data/fullpath.json (or null). '' when nothing to say. */
export function detailLine(c, s, FP) {
  if (!s || !s.full) return '';
  const E = FP?.coins?.[c]?.events?.oos, B = s.bucket ? FP?.coins?.[c]?.flat?.oos?.buckets?.[s.bucket] : null;
  const two = s.first && s.first.ma !== s.full.ma
    ? `最先碰到的 ${usd0(s.first.price)}（${s.first.ma} 日平均價）只會先放回一部分；`
    : '';
  let hist = '';
  if (E?.n_done) {
    const st = E.n_full - E.n_direct;
    hist = `2023 年起 ${c} 從空手重新買回 ${E.n_done} 次，之後走到兩條都站上的只有 ${E.n_full} 次${st > 0 ? `（一般再 ${dd(E.days_to_full_median)} 天、價格再漲 ${p1(E.rise_to_full_median)}）` : ''}，另外 ${E.n_back_out} 次先跌回空手（一般 ${dd(E.days_to_out_median)} 天就又賣掉）。`;
  }
  const far = B?.n ? `過去空手、離兩條都站上還差 ${BUCKET_ZH[s.bucket]}的日子（2023 年起 ${B.n} 天），${B.k30 ? `30 天內做到 ${pc0(B.p30)}` : '30 天內一次都沒做到'}、90 天內 ${pc0(B.p90)}。` : '';
  return `要放回最多（兩條平均價都站上）：${c} 收盤要高於 ${usd0(s.full.price)} 美元（比上次收盤${sgn(s.full.dist)}）；${two}${hist}${far}平均價每天會移動；這是過去紀錄，不是預測。`;
}
function evRows(S) {
  const r = (lab, E) => E?.n_done ? `<tr><th>${lab}</th><td>${E.n_done}</td><td><strong>${E.n_full}</strong>（${pc0(E.share_full)}）</td><td>${E.n_back_out}（${pc0(E.share_back_out)}）<div class="muted small">一般 ${dd(E.days_to_out_median)} 天</div></td><td>${E.n_full - E.n_direct > 0 ? `${dd(E.days_to_full_median)} 天<div class="muted small">價格再漲 ${p1(E.rise_to_full_median)}</div>` : '—'}</td><td>${pc0(E.expo_at_full_median)}</td></tr>` : `<tr><th>${lab}</th><td colspan="5">—</td></tr>`;
  return r('2018–22', S.is) + r('2023 起', S.oos);
}
function flatRows(S) {
  return LABELS.map(L => {
    const a = S.is.buckets[L], b = S.oos.buckets[L];
    const cell = (x, h) => x?.n ? `${x[`k${h}`] ? pc0(x[`p${h}`]) : '0 次'}` : '—';
    return `<tr><th>${BUCKET_ZH[L]}</th><td>${cell(a, 30)}<div class="muted small">${a?.n ?? 0} 天</div></td><td>${cell(a, 90)}</td><td>${cell(b, 30)}<div class="muted small">${b?.n ?? 0} 天</div></td><td>${cell(b, 90)}</td></tr>`;
  }).join('');
}
function nowLine(c, s, FP) {
  if (s === undefined) return '<p class="small muted">手機還沒抓到最新日K，等一下再看。</p>';
  if (!s) return '<p class="small">資料不足，算不出來。</p>';
  if (!s.full) return `<p class="fp-now">${c}：依 ${closeMD(s.date)} 早上 8 點收盤，兩條平均價都已站上，建議已經是最多的那一段。</p>`;
  const lv = s.levels.map(l => `${l.ma} 日 ${usd0(l.price)}（${l.above ? '已站上' : `要漲 ${p1(Math.abs(l.dist))}`}）`).join('、');
  const B = s.bucket ? FP.coins[c].flat.oos.buckets[s.bucket] : null;
  return `<p class="fp-now">${c}：依 ${closeMD(s.date)} 早上 8 點收盤 ${usd0(s.close)} 美元，兩條平均價的翻轉價：${lv}。<strong>要放回最多，收盤要高於 ${usd0(s.full.price)} 美元（${sgn(s.full.dist)}）</strong>${B?.n ? `；過去空手時差這麼多（${BUCKET_ZH[s.bucket]}），2023 年起${B.k30 ? ` 30 天內做到 ${pc0(B.p30)}` : ' 30 天內一次都沒做到'}、90 天內 ${pc0(B.p90)}` : ''}。${s.src === 'file' ? `<span class="muted">（用每週預先算好的資料）</span>` : ''}</p>`;
}
/** Advanced card. st: {BTC, ETH} from pickPath. */
export function fullPathCard(FP, st) {
  if (!FP?.coins) return '';
  const coins = ['BTC', 'ETH'].filter(c => FP.coins[c]);
  const B = FP.coins.BTC?.events?.oos, E = FP.coins.ETH?.events?.oos;
  return `<section class="card" id="fullpath"><h2>要放回最多，要漲到哪裡</h2>
    <p>規則看兩條平均價（50 日、200 日）：兩條都在收盤下面＝空手；站上一條＝先放回一部分（首頁「什麼時候會變」寫的就是這一步）；兩條都站上＝放回最多。這張卡說第二條在哪裡，以及過去從空手重新買回之後，有多少次真的走到兩條都站上。</p>
    ${coins.map(c => nowLine(c, st?.[c], FP)).join('')}
    ${coins.map(c => { const S = FP.coins[c].events; return `<h3 class="sub">${c}：從空手重新買回之後</h3>
    <div class="scroll"><table class="bt"><thead><tr><th></th><th>次數</th><th>接著兩條都站上</th><th>先跌回空手</th><th>站上要多久</th><th>站上那天放多少<div class="muted small">一般</div></th></tr></thead><tbody>${evRows(S)}</tbody></table></div>`; }).join('')}
    ${coins.map(c => { const S = FP.coins[c].flat; return `<h3 class="sub">${c}：空手時離兩條都站上差多少 → 之後做到的比例</h3>
    <div class="scroll"><table class="bt"><thead><tr><th>還差</th><th>30 天內<div class="muted small">2018–22</div></th><th>90 天內<div class="muted small">2018–22</div></th><th>30 天內<div class="muted small">2023 起</div></th><th>90 天內<div class="muted small">2023 起</div></th></tr></thead><tbody>${flatRows(S)}</tbody></table></div>`; }).join('')}
    <p class="small"><strong>重點</strong>：首頁的翻轉價只是第一步。2023 年起從空手重新買回，BTC ${B?.n_done ?? '—'} 次裡 ${B?.n_back_out ?? '—'} 次、ETH ${E?.n_done ?? '—'} 次裡 ${E?.n_back_out ?? '—'} 次是先跌回空手，而不是一路走到兩條都站上；所以第一步之後又賣掉是常見的事，不代表規則壞了。差 20% 以上時，30 天內幾乎沒有做到過。這些比例次數少、相鄰日子重疊，只是過去紀錄，不是預測，也不能拿來猜漲跌。</p>
    <p class="small muted">算法：<code>backtest/full_path.py</code> → <code>data/fullpath.json</code>（Binance 已收完日K，${asofInline(FP.as_of)}，${WEEKLY_NOTE}；定義事先固定在程式說明）。規則＝凍結的冠軍 trend_vt@1（與凍結 walk-forward 每一天相同），不改規則。翻轉價＝讓下一根收盤剛好等於含它的平均價的價格（50 日＝最近 49 根平均、200 日＝最近 199 根平均，和「這週可能要動手嗎」同一個算法）；「放回最多」的價格＝收盤還沒站上的平均價裡比較高的那條。「重新買回」＝前一天空手、這天建議大於 0（大多只站上一條；直接兩條都站上的也算，表格「接著兩條都站上」含這幾次）；之後先發生「兩條都站上」或「又回到空手」。「站上要多久／價格再漲」只算先站上一條、之後才站上第二條的那幾次；「站上那天放多少」是規則當天實際的比例（會被 30 日波動調低）。空手日子的比例需要之後 90 根收盤，最近 90 天不算。2023 年以前是選規則時看過的時期，之後才算樣本外。只看幣價，沒有買賣，所以不涉及手續費。</p>
  </section>`;
}
