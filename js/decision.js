// Pure decision maths for v2 (no DOM). Numbers come from data/decision.json, produced by backtest/decision.py.
export const WEEK = Math.sqrt(7 / 365);

/** Trend state from the latest completed row: 1 持有 / 0.5 減碼 / 0 空手 (50- and 200-day MA, half weight each). */
export function trendState(r) {
  if (!r || Number.isNaN(r.d50) || Number.isNaN(r.d200)) return null;
  return 0.5 * (r.d50 > 0) + 0.5 * (r.d200 > 0);
}
export const TREND_LABEL = { 1: ['持有', 'st-hold'], 0.5: ['減碼', 'st-reduce'], 0: ['空手', 'st-out'] };

/** Bad-week (historical 5%-worst week) loss of a coin at today's 30-day volatility. Negative number. */
export function badWeek(vol30, z5) { return z5 * vol30 * WEEK; }

/** Max share of total portfolio in one coin so that its bad week costs ≤ budget (both as fractions). */
export function maxWeight(budget, vol30, z5) {
  const bw = Math.abs(badWeek(vol30, z5));
  if (!(bw > 0) || !(budget > 0)) return 0;
  return Math.min(1, budget / bw);
}
export function suggestedWeight(budget, vol30, z5, trend) {
  return trend === null ? null : maxWeight(budget, vol30, z5) * trend;
}

/** Isolated-margin liquidation distance (fraction of entry price). C#19: d = (1/L − mmr)/(1 − mmr) for longs. */
export function liqDistance(L, mmr, side = 'long') {
  return side === 'long' ? (1 / L - mmr) / (1 - mmr) : (1 / L - mmr) / (1 + mmr);
}
export function liqPrice(price, L, mmr, side = 'long') {
  const d = liqDistance(L, mmr, side);
  return side === 'long' ? price * (1 - d) : price * (1 + d);
}

// ---------- portfolio ----------
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export function cov(cols) {
  const k = cols.length, n = cols[0].length, m = cols.map(mean);
  const C = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = i; j < k; j++) {
    let s = 0; for (let t = 0; t < n; t++) s += (cols[i][t] - m[i]) * (cols[j][t] - m[j]);
    C[i][j] = C[j][i] = s / (n - 1);
  }
  return C;
}
export function riskShares(w, C) {
  const s = C.map(row => row.reduce((a, c, j) => a + c * w[j], 0));
  const tot = w.reduce((a, x, i) => a + x * s[i], 0);
  return tot > 0 ? w.map((x, i) => x * s[i] / tot) : w.map(() => 0);
}
export function quantile(a, p) {
  const s = [...a].sort((x, y) => x - y); const h = (s.length - 1) * p, lo = Math.floor(h);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo);
}
export const REST = {
  '6040': { name: '美股 60／債 40（SPY／AGG）', f: W => W.spy.map((x, i) => 0.6 * x + 0.4 * W.agg[i]) },
  tw50: { name: '台股 0050', f: W => W.tw50 },
  cash: { name: '台幣現金／定存', f: W => W.spy.map(() => 0) },
};

/** Portfolio analysis. holdings in TWD; W = decision.weekly. from = 'YYYY-MM-DD' subsample start. */
export function portfolio({ total, btcTwd, ethTwd, rest }, W, from = null) {
  const i0 = from ? W.dates.findIndex(d => d >= from) : 0;
  const cut = a => a.slice(i0);
  const restR = cut(REST[rest].f(W));
  const cols = [cut(W.btc), cut(W.eth), restR];
  const wb = btcTwd / total, we = ethTwd / total, wr = Math.max(0, 1 - wb - we);
  const w = [wb, we, wr];
  const C = cov(cols);
  const rs = riskShares(w, C);
  const port = cols[0].map((_, t) => w[0] * cols[0][t] + w[1] * cols[1][t] + w[2] * cols[2][t]);
  let worst = 0, worstI = 0; port.forEach((x, t) => { if (x < worst) { worst = x; worstI = t; } });
  return { w, C, riskCrypto: rs[0] + rs[1], riskBtc: rs[0], riskEth: rs[1], p5: quantile(port, 0.05), worst, worstDate: W.dates.slice(i0)[worstI], n: port.length,
    start: W.dates[i0], volAnn: Math.sqrt(C.reduce((a, row, i) => a + row.reduce((b, c, j) => b + c * w[i] * w[j], 0), 0) * 52) };
}

/** Bad week of the whole portfolio at TODAY's crypto vol (historical correlations + rest vol). */
export function badWeekNow(w, C, volBtc, volEth, z5) {
  const sd = C.map((r, i) => Math.sqrt(r[i]));
  const now = [volBtc * WEEK, volEth * WEEK, sd[2]];
  let v = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const rho = sd[i] > 0 && sd[j] > 0 ? C[i][j] / (sd[i] * sd[j]) : (i === j ? 1 : 0);
    v += w[i] * w[j] * now[i] * now[j] * rho;
  }
  return z5 * Math.sqrt(v);
}

// ---------- TWD → coin cost ----------
/** Walk asks spending `quote` units; returns { qty, avg, mid, slip, filled }. asks ascending [[price, size]]. */
export function walkBuy(book, quote) {
  const mid = (book.asks[0][0] + book.bids[0][0]) / 2;
  let left = quote, qty = 0;
  for (const [p, s] of book.asks) {
    const cost = p * s;
    if (cost >= left) { qty += left / p; left = 0; break; }
    qty += s; left -= cost;
  }
  const spent = quote - left;
  const avg = qty > 0 ? spent / qty : NaN;
  return { qty, avg, mid, slip: avg / mid - 1, filled: left <= 1e-9 };
}

/** Cost breakdown buying `coin` with `twd`. route: 'usdt' (TWD→USDT→coin) or 'twd' (direct TWD market).
 *  premium: USDT/TWD premium vs fair (fraction). maker: assume resting orders (no spread/slippage; may not fill). */
export function buyCost({ twd, coin, route, fee, premium, maker }, books) {
  const sym = coin.toLowerCase();
  const legs = [];
  if (route === 'usdt') {
    const a = walkBuy(books.usdttwd, twd);
    const usdt = a.qty * (1 - fee);
    const b = walkBuy(books[sym + 'usdt'], usdt);
    legs.push({ name: 'USDT/TWD', slip: maker ? 0 : a.slip, fee, filled: a.filled }, { name: `${coin}/USDT`, slip: maker ? 0 : b.slip, fee, filled: b.filled });
  } else {
    const a = walkBuy(books[sym + 'twd'], twd);
    legs.push({ name: `${coin}/TWD`, slip: maker ? 0 : a.slip, fee, filled: a.filled });
  }
  const keep = legs.reduce((k, l) => k * (1 - l.slip) * (1 - l.fee), 1);
  const slip = 1 - legs.reduce((k, l) => k * (1 - l.slip), 1);
  const fees = 1 - legs.reduce((k, l) => k * (1 - l.fee), 1);
  return { legs, premium, slip, fees, total: 1 - keep / (1 + premium), filled: legs.every(l => l.filled) };
}

/** Live USDT/TWD premium from a quote the user types: quote / (USD/TWD × USDT/USD) − 1. */
export function premiumFromQuote(quote, usdTwd, usdtUsd) {
  return quote > 0 && usdTwd > 0 && usdtUsd > 0 ? quote / (usdTwd * usdtUsd) - 1 : null;
}

/** Sell `qty` coins into bids; returns { quote, avg, mid, slip, filled }. bids descending [[price, size]]. */
export function walkSell(book, qty) {
  const mid = (book.asks[0][0] + book.bids[0][0]) / 2;
  let left = qty, got = 0;
  for (const [p, s] of book.bids) {
    if (s >= left) { got += left * p; left = 0; break; }
    got += s * p; left -= s;
  }
  const sold = qty - left;
  const avg = sold > 0 ? got / sold : NaN;
  return { quote: got, avg, mid, slip: 1 - avg / mid, filled: left <= 1e-12 };
}

/** Cost of selling coin worth `twd` (at mid) back to TWD. Premium not counted: if it is still there you get it back. */
export function sellCost({ twd, coin, route, fee, maker }, books) {
  const sym = coin.toLowerCase();
  const mid = b => (b.asks[0][0] + b.bids[0][0]) / 2;
  const legs = [];
  if (route === 'usdt') {
    const bk = books[sym + 'usdt'], ut = books.usdttwd;
    const a = walkSell(bk, twd / mid(ut) / mid(bk));
    const b = walkSell(ut, a.quote * (1 - fee));
    legs.push({ name: `${coin}/USDT`, slip: maker ? 0 : a.slip, fee, filled: a.filled }, { name: 'USDT/TWD', slip: maker ? 0 : b.slip, fee, filled: b.filled });
  } else {
    const bk = books[sym + 'twd'];
    const a = walkSell(bk, twd / mid(bk));
    legs.push({ name: `${coin}/TWD`, slip: maker ? 0 : a.slip, fee, filled: a.filled });
  }
  const keep = legs.reduce((k, l) => k * (1 - l.slip) * (1 - l.fee), 1);
  const slip = 1 - legs.reduce((k, l) => k * (1 - l.slip), 1);
  const fees = 1 - legs.reduce((k, l) => k * (1 - l.fee), 1);
  return { legs, slip, fees, total: 1 - keep, filled: legs.every(l => l.filled) };
}

// ---------- v3: 定期定額與再平衡計畫 (mirrors plan() in backtest/dca_rebalance.py) ----------
/** Band around the target crypto weight. mode 'rel' = ±band × target (e.g. 25% of 5% → 3.75–6.25%); 'abs' = ±band (percentage points as a fraction). */
export function bandLimits(target, band, mode) {
  return mode === 'rel' ? [Math.max(0, target * (1 - band)), target * (1 + band)] : [Math.max(0, target - band), target + band];
}
/** This month's plan. total = all assets in TWD incl. crypto, before this month's money. Trades in TWD (+ buy, − sell).
 *  Inside the band: put target × monthly into crypto (split by btcShare). Outside: trade each coin back to target × (total + monthly). */
export function plan({ total, btc, eth, monthly, target, band, mode, btcShare }) {
  const C = btc + eth, w = total > 0 ? C / total : 0;
  const [lo, hi] = bandLimits(target, band, mode);
  const status = w < lo ? 'below' : w > hi ? 'above' : 'inside';
  const V = total + monthly, T = target * V;
  let b, e, crypto;
  if (status === 'inside') { crypto = target * monthly; b = crypto * btcShare; e = crypto - b; }
  else { b = T * btcShare - btc; e = T * (1 - btcShare) - eth; crypto = b + e; }
  return { w, lo, hi, status, target_twd: T, crypto, btc: b, eth: e, rest: monthly - crypto, w_after: V > 0 ? (C + crypto) / V : 0 };
}
/** Trend filter on the regular monthly buy only (option B, = backtest variant trend_buys): buys × trend state (1 / 0.5 / 0); the cut goes to other assets. */
export function trendFiltered(p, trBtc, trEth) {
  if (p.status !== 'inside') return { ...p };   // same as the backtest: band rebalances are not filtered
  const f = (x, t) => x > 0 && t !== null && t !== undefined ? x * t : x;
  const b = f(p.btc, trBtc), e = f(p.eth, trEth);
  return { ...p, btc: b, eth: e, crypto: b + e, rest: p.rest + (p.btc - b) + (p.eth - e) };
}
