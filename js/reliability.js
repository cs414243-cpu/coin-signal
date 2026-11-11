// v6: 資料可靠度與接近翻轉價 — pure functions (no DOM, no network). Thresholds from
// research CRYPTO-20261111-1403-data-reliability-cross-source.md §7.
export const DAY = 86400000;
export const STALE_WARN_H = 1;     // 00:00 UTC + 1 h = 台北 09:00 still missing yesterday's bar -> yellow
export const STALE_BAD_H = 4;      // + 4 h = 台北 12:00 -> red
export const TOL_GREEN = 0.005;    // cross-source close diff <= 0.5% -> green
export const TOL_RED = 0.02;       // > 2% -> red
export const NEAR_FLIP = 0.01;     // |distance to flip price| < 1% -> 接近翻轉
export const NEAR_FLIP_TIGHT = 0.0025;
export const ACTION_EDGE = 0.02;   // exposure within 0.67 ± 0.02 -> 持有／減碼邊界
export const ACTION_CUT = 0.67;    // forecast/run_daily.py action_for (frozen; display only)
export const USDT_DEPEG = 0.005;
export const FALLBACK_ORDER = ['Binance', 'OKX', 'Kraken', 'Coinbase'];

/** Keep only bars whose close time (open + 1 day) is <= now. Bars: [{t (open ms UTC), c}] ascending. */
export function closedBars(bars, now = Date.now()) { return bars.filter(k => k.t + DAY <= now); }

/** Open time of the bar that should be the latest closed one at `now` (= yesterday 00:00 UTC). */
export function expectedLastOpen(now = Date.now()) { return Math.floor(now / DAY) * DAY - DAY; }

/** Completeness of the last n closed bars: all 00:00 UTC aligned, no gaps, no duplicates, positive closes. */
export function integrity(bars, n = 200) {
  const s = bars.slice(-n);
  if (s.length < n) return { ok: false, why: `只有 ${s.length} 根` };
  for (let i = 0; i < s.length; i++) {
    if (s[i].t % DAY !== 0) return { ok: false, why: '日K不是從 00:00 UTC 開始' };
    if (!(s[i].c > 0)) return { ok: false, why: '收盤價異常' };
    if (i && s[i].t - s[i - 1].t !== DAY) return { ok: false, why: s[i].t === s[i - 1].t ? '日K重複' : '日K缺日' };
  }
  return { ok: true, why: '' };
}

/** Staleness of the latest closed bar. */
export function staleness(lastOpen, now = Date.now()) {
  const exp = expectedLastOpen(now);
  if (lastOpen >= exp) return { level: 'green', hoursLate: 0, behind: 0 };
  const behind = Math.round((exp - lastOpen) / DAY);
  const hoursLate = (now - (exp + DAY)) / 3600000 + (behind - 1) * 24; // hours since the missing bar closed
  const level = hoursLate >= STALE_BAD_H ? 'red' : hoursLate >= STALE_WARN_H ? 'yellow' : 'pending';
  return { level, hoursLate, behind };
}

/** trend3 = 0.5·[c>MA50] + 0.5·[c>MA200] on the last closed bar (same as decision.js / trend_vt@1). */
export function trend3(closes) {
  const n = closes.length; if (n < 200) return null;
  const ma = w => closes.slice(n - w).reduce((a, b) => a + b, 0) / w;
  const c = closes[n - 1];
  return 0.5 * (c > ma(50)) + 0.5 * (c > ma(200));
}

/** Flip prices for the NEXT close: the close X at which X equals the MA that includes X.
 *  MA50 flip = sum(last 49)/49, MA200 flip = sum(last 199)/199. */
export function flipLevels(closes) {
  const n = closes.length; if (n < 200) return null;
  const sum = k => closes.slice(n - k).reduce((a, b) => a + b, 0);
  const c = closes[n - 1], f50 = sum(49) / 49, f200 = sum(199) / 199;
  const t = trend3(closes);
  const ma = w => sum(w) / w;
  // above = the current close is above this MA today; crossing the flip price on the next close changes trend3 by 0.5
  const mk = (name, f) => { const above = c > ma(name); return { ma: name, price: f, dist: f / c - 1, above, next: above ? t - 0.5 : t + 0.5 }; };
  return { close: c, trend: t, levels: [mk(50, f50), mk(200, f200)] };
}

/** Nearest flip level within NEAR_FLIP, or null. */
export function nearFlip(closes) {
  const F = flipLevels(closes); if (!F) return null;
  const near = F.levels.filter(l => Math.abs(l.dist) < NEAR_FLIP).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist));
  if (!near.length) return null;
  return { ...near[0], close: F.close, trend: F.trend, tight: Math.abs(near[0].dist) < NEAR_FLIP_TIGHT };
}

/** Action name after a flip, same mapping as action_for() in direction: up -> 加碼, down to 0 -> 空手, down to 0.5 -> 減碼. */
export function flipAction(from, to) { return to > from ? '加碼' : to === 0 ? '空手' : '減碼'; }

/** Cross-source comparison of the same closed bar. a, b: {t, c}. tA, tB: trend3 of each source. */
export function crossCheck(a, b, tA, tB) {
  if (!a || !b || a.t !== b.t) return null;
  const diff = Math.abs(a.c / b.c - 1);
  const sameTrend = tA === null || tB === null ? null : tA === tB;
  const level = sameTrend === false || diff > TOL_RED ? 'red' : diff > TOL_GREEN ? 'yellow' : 'green';
  return { diff, bps: diff * 1e4, sameTrend, level };
}

const RANK = { green: 0, pending: 0, yellow: 1, red: 2 };
/** Overall status (worst of staleness, cross-check, USDT peg) with a plain zh-TW label. */
export function reliability({ lastOpen, now = Date.now(), cross = null, usdt = null, ok = true }) {
  if (!ok || lastOpen === null || lastOpen === undefined) return { level: 'red', label: '抓不到資料，今天先不要依此動作', reasons: ['所有來源都抓不到日K'] };
  const st = staleness(lastOpen, now);
  const reasons = []; let level = 'green', label = '資料正常';
  const bump = (l, lab, why) => { reasons.push(why); if (RANK[l] > RANK[level]) { level = l; label = lab; } };
  if (st.level === 'pending') reasons.push('今早 8 點的收盤剛過，資料更新中');
  if (st.level === 'yellow') bump('yellow', '資料尚未更新', `還沒拿到昨天的收盤（已過 ${st.hoursLate.toFixed(1)} 小時）`);
  if (st.level === 'red') bump('red', '資料過期，今天先不要依此動作', `最新收盤落後 ${st.behind} 天（已過 ${st.hoursLate.toFixed(1)} 小時）`);
  if (cross) {
    if (cross.sameTrend === false) bump('red', '各交易所資料不一致，今天先不要依此動作', '兩個來源算出的趨勢狀態不同');
    else if (cross.level === 'red') bump('red', '各交易所資料不一致，今天先不要依此動作', `兩個來源收盤差 ${(cross.diff * 100).toFixed(2)}%`);
    else if (cross.level === 'yellow') bump('yellow', '各交易所價格略有差異', `兩個來源收盤差 ${(cross.diff * 100).toFixed(2)}%`);
  }
  if (usdt !== null && usdt !== undefined && Math.abs(usdt - 1) > USDT_DEPEG) bump('yellow', 'USDT 價格偏離 1 美元', `USDT ${usdt} 美元`);
  return { level, label, reasons, stale: st };
}

/** Is the champion exposure near the 0.67 hold/reduce cut-off of action_for? */
export function nearActionEdge(expo) { return Number.isFinite(expo) && expo > 0.005 && Math.abs(expo - ACTION_CUT) <= ACTION_EDGE; }
