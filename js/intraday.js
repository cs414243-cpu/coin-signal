// v13: 盤中離翻轉價多遠 — pure functions (no DOM, no network).
// The rule (trend_vt@1) only looks at the daily close (Taipei 08:00). The flip prices come from the closed daily bars
// (reliability.flipLevels); here we compare a live price fetched on the phone with them. Intraday crossings are NOT signals.
import { flipLevels, flipAction, DAY } from './reliability.js';
export const HOUR = 3600000;
export const MIN_N = 30;          // don't show a historical share with fewer cases than this
export const PERIOD_PREF = ['since2023', 'full'];
const TPE = 8 * HOUR;

/** Hours (1..23) since the open of the bar in progress, or null when the closed bars are not up to date at `now`. */
export function hourK(lastOpen, now) {
  const open = lastOpen + DAY;                 // the bar in progress opened at the last closed bar's close
  if (!(now >= open && now < open + DAY)) return null;
  return Math.min(23, Math.max(1, Math.floor((now - open) / HOUR)));
}
/** Taipei clock hour for k hours after 08:00. */
export const taipeiHour = k => (8 + k) % 24;

/**
 * closes: closed daily closes (ascending). lastOpen: open ms (UTC) of the last closed bar. price: live price. now: ms.
 * Returns null if inputs are unusable; {stale:true} if the closed bars are not the latest (then flips would be wrong).
 */
export function liveCheck({ closes, lastOpen, price, now }) {
  const F = flipLevels(closes || []);
  if (!F || !(price > 0) || !Number.isFinite(lastOpen)) return null;
  const k = hourK(lastOpen, now);
  if (k === null) return { stale: true };
  const levels = F.levels.map(l => {
    const crossed = (price > l.price) !== l.above;   // if the day closed at `price`, this half of trend3 would change
    return { ma: l.ma, price: l.price, above: l.above, crossed, dist: l.price / price - 1, lastDist: l.dist };
  });
  const tNow = levels.reduce((s, l) => s + 0.5 * (l.crossed ? !l.above : l.above), 0);
  const crossed = levels.filter(l => l.crossed).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist));
  const open = levels.filter(l => !l.crossed).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist));
  return {
    stale: false, price, k, trend: F.trend, tNow, lastClose: F.close,
    changed: tNow !== F.trend, action: tNow !== F.trend ? flipAction(F.trend, tNow) : null,
    levels, crossed, nearest: open[0] || null,
    closeAt: lastOpen + 2 * DAY,                  // the close that decides (Taipei 08:00)
  };
}

/** Historical share from data/intraday.json for hour k: crossed → still crossed at the close. */
export function heldStat(intra, k, kind = 'held') {
  if (!intra?.periods || !k) return null;
  for (const p of PERIOD_PREF) {
    const x = intra.periods[p]?.both?.[String(k)];
    if (!x) continue;
    const n = kind === 'held' ? x.n : x.near_n, h = kind === 'held' ? x.held : x.near_cross;
    if (n >= MIN_N) return { period: p, start: intra.periods[p].start, n, hits: h, rate: h / n };
  }
  return null;
}

const fmtUsd = x => x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 });
const hhmm = t => { const d = new Date(t + TPE); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const md = t => { const d = new Date(t + TPE); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const pc = x => `${(Math.abs(x) * 100).toFixed(x !== 0 && Math.abs(x) < 0.01 ? 2 : 1)}%`;
const since = s => s === 'since2023' ? '2023 年起' : '2018 年起';

/** One small plain line for the homepage card. tick: {status, price, at, source} ; L: liveCheck result. */
export function homeLine(coin, tick, L, intra) {
  if (!tick || tick.status === 'loading') return `<p class="live-line small muted">盤中價格：讀取中…</p>`;
  if (tick.status !== 'ok') return `<p class="live-line small muted">盤中價格：抓不到即時價（建議本身不受影響，仍以早上 8 點收盤為準）。</p>`;
  if (!L) return `<p class="live-line small muted">盤中價格：日K還沒載入，暫時算不出離翻轉價多遠。</p>`;
  const head = `盤中 ${hhmm(tick.at)}（台北）${coin} ${fmtUsd(tick.price)} 美元`;
  if (L.stale) return `<p class="live-line small muted">${head}；日K還沒更新到最新，暫時不比較翻轉價。</p>`;
  const when = `${md(L.closeAt)} 早上 8 點`;
  if (L.changed) {
    const cr = L.crossed, side = cr[0].above ? '低於' : '高於';
    const what = cr.length > 1 ? `50 日線和 200 日線的翻轉價（${[...cr].sort((a, b) => a.ma - b.ma).map(l => fmtUsd(l.price)).join('、')}）` : `${cr[0].ma} 日線翻轉價 ${fmtUsd(cr[0].price)}`;
    const H = heldStat(intra, L.k, 'held');
    const hist = H ? `過去（${since(H.period)}）這個時間已穿過的，收盤仍在同一邊約 ${Math.round(H.rate * 100)}%（${H.n} 次）。` : '';
    return `<p class="live-line small" data-crossed="1">${head}，已${side} ${what}。若 ${when}收盤仍${side}，規則會轉為<strong>${L.action}</strong>；盤中穿過不算訊號。${hist}</p>`;
  }
  const n = L.nearest;
  if (!n) return `<p class="live-line small muted" data-crossed="0">${head}；照這個價格收盤，規則不會改變。規則只看 ${when}收盤。</p>`;
  return `<p class="live-line small muted" data-crossed="0">${head}，再${n.dist < 0 ? '跌' : '漲'} ${pc(n.dist)} 會碰到翻轉價 ${fmtUsd(n.price)}（${n.ma} 日線）。規則只看 ${when}收盤，盤中碰到不算數。</p>`;
}

/** 進階 table rows for one coin (both MAs). */
export function advRows(coin, tick, L) {
  if (!tick || tick.status !== 'ok' || !L || L.stale) return '';
  return L.levels.map(l => `<tr><th>${coin} ${l.ma} 日線翻轉價 ${fmtUsd(l.price)}</th><td>${l.crossed ? `<strong>盤中已${l.above ? '低於' : '高於'}</strong>` : `再${l.dist < 0 ? '跌' : '漲'} ${pc(l.dist)}`}<div class="muted small">昨天收盤 ${fmtUsd(L.lastClose)} 時差 ${(l.lastDist * 100).toFixed(2)}%</div></td></tr>`).join('');
}
/** 進階 history table: by Taipei hour, both periods. */
export function histTable(intra, kNow) {
  if (!intra?.periods) return '';
  const ks = [1, 3, 6, 9, 12, 15, 18, 21, 23];
  if (kNow && !ks.includes(kNow)) { ks.push(kNow); ks.sort((a, b) => a - b); }
  const cell = (p, k, kind) => {
    const x = intra.periods[p]?.both?.[String(k)]; if (!x) return '<td>—</td>';
    const n = kind === 'held' ? x.n : x.near_n, h = kind === 'held' ? x.held : x.near_cross;
    return `<td>${n >= MIN_N ? Math.round(h / n * 100) + '%' : '—'}<div class="muted small">${h}／${n}</div></td>`;
  };
  const rows = ks.map(k => `<tr${k === kNow ? ' class="hl"' : ''}><th>${String(taipeiHour(k)).padStart(2, '0')}:00${k === kNow ? '（現在）' : ''}</th>${cell('full', k, 'held')}${cell('since2023', k, 'held')}${cell('full', k, 'near')}${cell('since2023', k, 'near')}</tr>`).join('');
  return `<div class="scroll"><table class="bt"><thead><tr><th>台北時間</th><th>已穿過→收盤仍穿過<div class="muted small">${intra.periods.full.start.slice(0, 4)} 年起</div></th><th>同左<div class="muted small">2023 年起</div></th><th>差不到 ${Math.round(intra.near * 100)}%→收盤穿過<div class="muted small">${intra.periods.full.start.slice(0, 4)} 年起</div></th><th>同左<div class="muted small">2023 年起</div></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
