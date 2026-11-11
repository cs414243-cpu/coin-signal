// v7: 建議變更提醒＋最近建議變化 — pure functions (no DOM, no network).
// Mirrors backtest/flip_stats.py (parity-tested in tests/flips.test.mjs) and forecast/run_daily.py action_for.
import { series } from './signals.js';

export const WIN = 14;
export const SEEN_KEY = 'cs-v7-seen';
export const ACTION_ZH = { add: '加碼', hold: '持有', reduce: '減碼', out: '空手' };

/** Same as forecast/run_daily.py action_for (frozen champion pipeline). */
export function actionFor(expo, prev) {
  if (expo < 0.005) return 'out';
  if (prev !== null && prev !== undefined && expo - prev >= 0.10) return 'add';
  if (prev !== null && prev !== undefined && prev - expo >= 0.10) return 'reduce';
  return expo >= 0.67 ? 'hold' : 'reduce';
}
/** trend_vt@1 exposure: trend3 × min(1, 0.30 / vol30) (forecast/common.py vt_scale). */
export const vtScale = v => Number.isFinite(v) && v ? Math.min(1, 0.30 / v) : 0;

/** Daily recommendation rows from CLOSED bars [{t, c}] ascending. */
export function recoRows(candles) {
  const s = series(candles), out = [];
  let prev = null;
  for (const r of s) {
    if (Number.isNaN(r.d200) || Number.isNaN(r.vol30)) continue;
    const trend3 = 0.5 * (r.d50 > 0) + 0.5 * (r.d200 > 0);
    const exposure = trend3 * vtScale(r.vol30);
    out.push({ t: r.t, date: new Date(r.t).toISOString().slice(0, 10), c: r.c, trend3, exposure, action: actionFor(exposure, prev), level: actionFor(exposure, null) });
    prev = exposure;
  }
  return out;
}

/** Recommendation changes ('trend' = MA state changed; 'vol' = same trend, volatility moved the level) and whether
 *  they reversed within 14 later closed bars (null = not 14 bars yet and not reversed so far). No lookahead beyond the bars given. */
export function recoEvents(rows) {
  const ev = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    let kind, key;
    if (b.trend3 !== a.trend3) { kind = 'trend'; key = 'trend3'; }
    else if (b.level !== a.level) { kind = 'vol'; key = 'level'; }
    else continue;
    const fut = rows.slice(i + 1, i + 1 + WIN);
    const j = fut.findIndex(r => r[key] === a[key]);
    ev.push({ date: b.date, kind, from: a.action, to: b.action, e0: a.exposure, e1: b.exposure, t0: a.trend3, t1: b.trend3, close: b.c,
      rev: j >= 0 ? true : fut.length === WIN ? false : null, revDays: j >= 0 ? j + 1 : null });
  }
  return ev;
}

/** Snapshot of what the top card shows for one coin (from data/live.json). */
export function snap(f) {
  if (!f || !f.action) return null;
  return { action: f.action, exposure: f.exposure, trend3: f.state?.trend3 ?? null, asof: f.asof };
}

/** Compare the last acknowledged recommendation with the current one.
 *  -> { show, store }  show: change object or null; store: snapshot to save now (null = keep the old one until dismissed). */
export function checkChange(prev, cur) {
  if (!cur) return { show: null, store: null };
  if (!prev || !prev.action) return { show: null, store: cur, first: true };
  if (prev.asof && cur.asof && cur.asof < prev.asof) return { show: null, store: null }; // older data than already seen
  if (prev.action === cur.action) return { show: null, store: cur };
  // yesterday's 「加碼」 is a one-day step label; the next day it reads 持有／減碼 with the same amount -> nothing new
  if (prev.action === 'add' && (cur.action === 'hold' || cur.action === 'reduce') && prev.trend3 === cur.trend3
      && Number.isFinite(prev.exposure) && Math.abs(cur.exposure - prev.exposure) < 0.10) return { show: null, store: cur, silent: true };
  const kind = prev.trend3 !== null && cur.trend3 !== null && prev.trend3 !== cur.trend3 ? 'trend' : 'vol';
  return { show: { from: prev.action, to: cur.action, e0: prev.exposure, e1: cur.exposure, asof0: prev.asof, asof1: cur.asof, kind }, store: null };
}

const read = st => { try { return JSON.parse(st.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; } };
const write = (st, o) => { try { st.setItem(SEEN_KEY, JSON.stringify(o)); } catch {} };

/** Run checkChange for every coin against storage; saves first-visit / unchanged snapshots. Returns {coin: change}. */
export function pendingChanges(st, coins) {
  const seen = read(st), out = {};
  let dirty = false;
  for (const [c, f] of Object.entries(coins)) {
    const r = checkChange(seen[c], snap(f));
    if (r.store) { seen[c] = { ...r.store, seenAt: Date.now() }; dirty = true; }
    if (r.show) out[c] = r.show;
  }
  if (dirty) write(st, seen);
  return out;
}

/** Dismiss: acknowledge the current recommendation of these coins. */
export function acknowledge(st, coins) {
  const seen = read(st);
  for (const [c, f] of Object.entries(coins)) { const s = snap(f); if (s) seen[c] = { ...s, seenAt: Date.now() }; }
  write(st, seen);
}

/** Banner-side history figure for a change: share reversed within 14 days for that coin and kind. */
export function revStat(F, coin, kind) {
  const S = F?.coins?.[coin]?.stats; if (!S) return null;
  const f = S.full[kind], o = S.oos[kind];
  if (!f || !f.n_done) return null;
  return { full: f.rev14, oos: o?.rev14 ?? null, n: f.n_done, start: S.full.start, nOos: o?.n_done ?? 0 };
}

/** Feature-detected app badge (no permission prompt is triggered by this call). */
export function setBadge(n, nav = globalThis.navigator) {
  try {
    if (n > 0 && nav && typeof nav.setAppBadge === 'function') nav.setAppBadge(n)?.catch?.(() => {});
    else if (nav && typeof nav.clearAppBadge === 'function') nav.clearAppBadge()?.catch?.(() => {});
  } catch {}
}
