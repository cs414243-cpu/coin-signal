// Pure signal maths. Mirrors backtest/backtest.py exactly (parity-tested in tests/parity.test.mjs).
export const DAY = 86400000;
export const FEATURES = ['d200', 'd50', 'mom30', 'volpct', 'rsi14', 'fng', 'fund7'];

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

/** candles: [{t(open ms UTC), c}] ascending, COMPLETED only. Returns per-index series. */
export function series(candles) {
  const c = candles.map(k => k.c), n = c.length;
  const ma = (i, w) => i + 1 >= w ? mean(c.slice(i + 1 - w, i + 1)) : NaN;
  const lr = c.map((x, i) => i ? Math.log(x / c[i - 1]) : NaN);
  const vol30 = c.map((_, i) => i >= 30 ? std(lr.slice(i - 29, i + 1)) * Math.sqrt(365) : NaN);
  const out = [];
  for (let i = 0; i < n; i++) {
    const ma50 = ma(i, 50), ma200 = ma(i, 200);
    let volpct = NaN;
    if (i >= 30 + 364) {
      const w = vol30.slice(i - 364, i + 1);
      volpct = w.filter(v => v <= vol30[i]).length / w.length;
    }
    let rsi14 = NaN;
    if (i >= 14) {
      let up = 0, dn = 0;
      for (let j = i - 13; j <= i; j++) { const d = c[j] - c[j - 1]; if (d > 0) up += d; else dn -= d; }
      up /= 14; dn /= 14;
      rsi14 = dn === 0 ? NaN : 100 - 100 / (1 + up / dn);
    }
    out.push({ t: candles[i].t, c: c[i], ma50, ma200, d50: c[i] / ma50 - 1, d200: c[i] / ma200 - 1,
      mom30: i >= 30 ? c[i] / c[i - 30] - 1 : NaN, vol30: vol30[i], volpct, rsi14 });
  }
  return out;
}

/** funding: [{t, rate}] ascending. Mean of last 21 prints with time <= close of day, annualised. */
export function fund7At(funding, dayOpen) {
  const close = dayOpen + DAY;
  const f = funding.filter(x => x.t <= close);
  if (f.length < 21 || f[f.length - 1].t <= close - 3 * DAY) return NaN;
  return mean(f.slice(-21).map(x => x.rate)) * 3 * 365;
}

/** fng: [{t (00:00 UTC ms), v}] — value stamped at the day's open, ffill up to 3 days. */
export function fngAt(fng, dayOpen) {
  for (let back = 0; back <= 3; back++) {
    const hit = fng.find(x => x.t === dayOpen - back * DAY);
    if (hit) return hit.v;
  }
  return NaN;
}

export function hysteresis(vals, enter, exit) {
  let pos = 0; const out = [];
  for (const v of vals) {
    if (Number.isNaN(v)) { out.push(NaN); continue; }
    if (pos === 0 && enter(v)) pos = 1; else if (pos === 1 && exit(v)) pos = 0;
    out.push(pos);
  }
  return out;
}

export const STATE = {
  ma200: r => Number.isNaN(r.d200) ? null : r.d200 > 0 ? 'above' : 'below',
  ma50: r => Number.isNaN(r.d50) ? null : r.d50 > 0 ? 'above' : 'below',
  mom30: r => Number.isNaN(r.mom30) ? null : r.mom30 > 0 ? 'pos' : 'neg',
  fund7: r => Number.isNaN(r.fund7) ? null : r.fund7 < 0 ? 'neg' : r.fund7 <= 0.12 ? 'base' : r.fund7 <= 0.30 ? 'hot' : 'vhot',
  fng: r => Number.isNaN(r.fng) ? null : r.fng < 25 ? 'xfear' : r.fng < 45 ? 'fear' : r.fng <= 55 ? 'neutral' : r.fng <= 75 ? 'greed' : 'xgreed',
  vol: r => Number.isNaN(r.volpct) ? null : r.volpct < 1 / 3 ? 'low' : r.volpct <= 2 / 3 ? 'mid' : 'high',
  rsi: r => Number.isNaN(r.rsi14) ? null : r.rsi14 < 30 ? 'os' : r.rsi14 > 70 ? 'ob' : 'mid',
};

/** Rule position (1 = 持有, 0 = 空手) at the latest completed day. */
export function rulePositions(rows) {
  const last = rows[rows.length - 1];
  const fngPos = hysteresis(rows.map(r => r.fng), v => v < 25, v => v > 75);
  const rsiPos = hysteresis(rows.map(r => r.rsi14), v => v < 30, v => v > 70);
  const b = (x, f) => Number.isNaN(x) ? null : f(x) ? 1 : 0;
  const lastOf = a => { const v = a[a.length - 1]; return Number.isNaN(v) ? null : v; };
  return {
    ma200: b(last.d200, x => x > 0), ma50: b(last.d50, x => x > 0), mom30: b(last.mom30, x => x > 0),
    fund7: b(last.fund7, x => x <= 0.12), vol: b(last.volpct, x => x <= 2 / 3),
    fng: lastOf(fngPos), rsi: lastOf(rsiPos),
  };
}

/** Build feature rows: completed candles + funding + fng. */
export function buildRows(candles, funding, fng) {
  return series(candles).map(r => ({ ...r, fund7: funding ? fund7At(funding, r.t) : NaN, fng: fng ? fngAt(fng, r.t) : NaN }));
}

/** k-nearest-neighbour analogs on standardised features (equal weights). */
export function analog(history, x, k = 150) {
  const X = history.X, n = X.length, p = FEATURES.length;
  const use = FEATURES.map((_, j) => !Number.isNaN(x[j]) && x[j] !== null && x[j] !== undefined);
  const mu = [], sd = [];
  for (let j = 0; j < p; j++) {
    const col = X.map(r => r[j]); mu.push(mean(col)); sd.push(std(col) || 1);
  }
  const d = X.map((r, i) => {
    let s = 0;
    for (let j = 0; j < p; j++) if (use[j]) s += ((r[j] - mu[j]) / sd[j] - (x[j] - mu[j]) / sd[j]) ** 2;
    return [Math.sqrt(s), i];
  }).sort((a, b) => a[0] - b[0]).slice(0, k);
  const f = d.map(([, i]) => history.fwd7[i]).sort((a, b) => a - b);
  const q = p => f[Math.min(f.length - 1, Math.max(0, Math.round(p * (f.length - 1))))];
  const all = history.fwd7;
  return { k: f.length, up: f.filter(v => v > 0).length / f.length, median: q(0.5), p10: q(0.1), p90: q(0.9),
    baseUp: all.filter(v => v > 0).length / all.length, usedFeatures: FEATURES.filter((_, j) => use[j]),
    dates: d.slice(0, 5).map(([, i]) => history.dates[i]) };
}

/** Drop the in-progress daily candle. */
export function completedOnly(candles, now = Date.now()) {
  return candles.filter(k => k.t + DAY <= now);
}
