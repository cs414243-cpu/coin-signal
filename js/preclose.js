// v34: 早上 8 點收盤已出、正式建議還沒更新時，手機先照同一套規則算一次（預覽，不是新訊號）。
// daily.sh runs 08:20 Taipei and the site updates ~08:30 (git log 2026-11-12..14: 08:28–08:33). Between the 08:00 close and that
// update the top card still shows yesterday's recommendation. The phone already has the just-closed bar, and flips.js recoRows
// is the frozen trend_vt@1 rule (parity-tested vs the ledger), so it can say whether the new close changes the recommendation.
// Guard: the phone must first reproduce the ledger's own exposure for the ledger's date; otherwise nothing is previewed.
// Pure functions (no DOM, no network).
import { recoRows, actionFor, ACTION_ZH } from './flips.js';

export const MATCH_TOL = 0.005;   // phone vs ledger exposure on the ledger's date (ledger rounds to 6 decimals)
export const BIG_STEP = 0.10;     // same step as action_for 加碼／減碼
// Reproducible with tests/preclose.test.mjs (backtest/data Binance closed daily bars, recoRows): share of mornings on which the
// new close changed the trend state or the hold/reduce/out level of at least one of BTC/ETH.
export const HIST = { start: '2018-03-05', end: '2026-11-13', n: 3176, full: 0.145, oosStart: '2023-01-01', nOos: 1413, oos: 0.164 };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const pc = e => `${Math.round(e * 100)}%`;

/** f: data/live.json coin (asof, exposure, action, state.trend3); bars: CLOSED daily bars [{t, c}] ascending.
 *  → null (phone not ahead of the ledger / no data) | { ok:false, why } | { ok:true, date, behind, exposure, level, action, changed } */
export function preview(f, bars) {
  if (!f?.asof || !Number.isFinite(f.exposure) || !bars?.length) return null;
  const R = recoRows(bars), last = R[R.length - 1];
  if (!last || last.date <= f.asof) return null;
  const i = R.findIndex(r => r.date === f.asof);
  if (i < 0) return { ok: false, why: 'no-base' };
  const base = R[i], t3 = f.state?.trend3;
  if (Math.abs(base.exposure - f.exposure) > MATCH_TOL || (Number.isFinite(t3) && t3 !== base.trend3)) return { ok: false, why: 'mismatch' };
  const changed = last.trend3 !== base.trend3 || last.level !== base.level || Math.abs(last.exposure - f.exposure) >= BIG_STEP;
  return { ok: true, date: last.date, behind: R.length - 1 - i, exposure: last.exposure, level: last.level,
    action: changed ? actionFor(last.exposure, f.exposure) : last.level, changed };
}

const what = (lv, e) => lv === 'out' || e < 0.005 ? '先不要放（0%）' : `${ACTION_ZH[lv]}（放約 ${pc(e)}）`;

/** One plain block for the top card. P: {BTC: preview, ETH: preview}; asof: ledger date the card shows; late: daily run is late. */
export function homeLine(P, asof, late = false) {
  const cs = Object.entries(P || {}).filter(([, p]) => p);
  if (!cs.length) return '';
  const ok = cs.filter(([, p]) => p.ok), date = ok[0]?.[1].date;
  const head = late ? '' : `今天早上 8 點的收盤已經出來，正式建議通常 8:30 左右更新（下面還是 ${asof ? closeMD(asof) : '上次'} 早上的建議）。`;
  if (!ok.length) return `<div class="pre" id="fc-pre" data-state="wait"><p>🕗 ${head || '正式建議還沒更新。'}手機這次無法照規則重算，請等正式更新再動手。</p></div>`;
  const anyChg = ok.some(([, p]) => p.changed);
  const parts = ok.map(([c, p]) => p.changed
    ? `<strong>${c} 可能改成「${esc(ACTION_ZH[p.action])}」</strong>${p.action === 'out' ? '（0%）' : `（放約 ${pc(p.exposure)}）`}`
    : `${c} 還是${what(p.level, p.exposure)}`).join('；');
  const tail = anyChg ? '有變的幣，等正式更新確認後再動手；當天做完就好。' : late ? '跟下面一樣，但正式紀錄晚了，仍以正式更新為準。' : '跟下面一樣，不用等。';
  return `<div class="pre${anyChg ? ' pre-chg' : ''}" id="fc-pre" data-state="${anyChg ? 'change' : 'same'}" data-date="${esc(date)}">
    <p>🕗 ${head}手機先用剛收完的 ${closeMD(date)} 早上 8 點收盤、照同一套規則算過：${parts}。${tail}</p>
    <p class="small muted">過去（${HIST.start.slice(0, 4)} 年起）大約每 ${Math.round(1 / HIST.full)} 個早上有 1 個，新的收盤會讓至少一個幣的建議改變（${HIST.oosStart.slice(0, 4)} 年起 ${pc(HIST.oos)}）。這只是提早算，以正式更新為準。</p></div>`;
}
