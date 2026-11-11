// Public, keyless data sources with fallbacks. Runs on the phone; nothing is sent anywhere else.
import { DAY } from './signals.js';
import { closedBars, integrity } from './reliability.js';

const TIMEOUT = 12000;
async function getJSON(url) {
  const ctl = new AbortController(); const id = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(id); }
}

const COIN = {
  BTC: { binance: 'BTCUSDT', kraken: 'XBTUSDT', okx: 'BTC-USDT', coinbase: 'BTC-USD', swap: 'BTC-USDT-SWAP', gecko: 'bitcoin' },
  ETH: { binance: 'ETHUSDT', kraken: 'ETHUSDT', okx: 'ETH-USDT', coinbase: 'ETH-USD', swap: 'ETH-USDT-SWAP', gecko: 'ethereum' },
};

// Each returns ascending [{t, c}] (may include today's unfinished candle; callers keep closed bars only).
// v6 order = forecast/common.py order: Binance USDT → OKX USDT → Kraken USDT → Coinbase USD (all send CORS headers, checked 2026-11-11).
const kraken = async s => {
  const j = await getJSON(`https://api.kraken.com/0/public/OHLC?pair=${COIN[s].kraken}&interval=1440`);
  if (j.error && j.error.length) throw new Error(j.error.join(','));
  const key = Object.keys(j.result).find(k => k !== 'last');
  return j.result[key].map(k => ({ t: k[0] * 1000, c: +k[4] }));
};
const okxRows = j => (j.data || []).map(k => ({ t: +k[0], c: +k[4] })).sort((a, b) => a.t - b.t);
const coinbase = async (s, pages) => {
  let rows = []; let end = Math.floor(Date.now() / DAY) * DAY + DAY;
  for (let i = 0; i < pages; i++) {
    const start = end - 300 * DAY;
    const j = await getJSON(`https://api.exchange.coinbase.com/products/${COIN[s].coinbase}/candles?granularity=86400&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`);
    rows = rows.concat(j); end = start;
  }
  const m = new Map(rows.map(k => [k[0] * 1000, +k[4]]));
  return [...m.entries()].map(([t, c]) => ({ t, c })).sort((a, b) => a.t - b.t);
};
const CANDLE_SOURCES = [
  ['Binance 現貨', async s => (await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${COIN[s].binance}&interval=1d&limit=600`))
      .map(k => ({ t: k[0], c: +k[4] }))],
  ['OKX', async s => {
      let rows = [], after = '';
      for (let i = 0; i < 6; i++) {
        const j = await getJSON(`https://www.okx.com/api/v5/market/history-candles?instId=${COIN[s].okx}&bar=1Dutc&limit=100${after ? '&after=' + after : ''}`);
        if (!j.data || !j.data.length) break;
        rows = rows.concat(j.data); after = j.data[j.data.length - 1][0];
      }
      return okxRows({ data: rows });
    }],
  ['Kraken', kraken],
  ['Coinbase', s => coinbase(s, 2)],
];
// One-request versions (≥ 300 bars) used only for the cross-source check.
const CHECK_SOURCES = {
  'Binance 現貨': async s => (await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${COIN[s].binance}&interval=1d&limit=300`)).map(k => ({ t: k[0], c: +k[4] })),
  OKX: async s => okxRows(await getJSON(`https://www.okx.com/api/v5/market/candles?instId=${COIN[s].okx}&bar=1Dutc&limit=300`)),
  Kraken: kraken,
  Coinbase: s => coinbase(s, 1),
};
export const CANDLE_ORDER = CANDLE_SOURCES.map(([n]) => n);
export const PAIR = { 'Binance 現貨': 'USDT', OKX: 'USDT', Kraken: 'USDT', Coinbase: 'USD' };

const FUNDING_SOURCES = [
  ['OKX', async s => (await getJSON(`https://www.okx.com/api/v5/public/funding-rate-history?instId=${COIN[s].swap}&limit=100`)).data
      .map(x => ({ t: +x.fundingTime, rate: +(x.realizedRate || x.fundingRate) })).sort((a, b) => a.t - b.t)],
  ['Binance 合約', async s => (await getJSON(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${COIN[s].binance}&limit=60`))
      .map(x => ({ t: +x.fundingTime, rate: +x.fundingRate }))],
  ['Bybit', async s => (await getJSON(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${COIN[s].binance}&limit=60`)).result.list
      .map(x => ({ t: +x.fundingRateTimestamp, rate: +x.fundingRate })).sort((a, b) => a.t - b.t)],
];

async function firstOk(sources, sym, validate) {
  const errors = [];
  for (const [name, fn] of sources) {
    try { const d = await fn(sym); if (validate(d)) return { source: name, data: d, errors }; errors.push(`${name}: 資料不足`); }
    catch (e) { errors.push(`${name}: ${e.message || e}`); }
  }
  return { source: null, data: null, errors };
}

const candlesOk = d => { const c = closedBars(d); return c.length >= 420 && integrity(c, 200).ok; };
export async function fetchCandles(sym) {
  const r = await firstOk(CANDLE_SOURCES, sym, candlesOk);
  return { ...r, fetchedAt: Date.now() };
}
/** Second source (next in the fallback order that is not the primary) for the cross-source check. */
export async function fetchCheck(sym, primary) {
  const errors = [];
  for (const name of CANDLE_ORDER) {
    if (name === primary) continue;
    try {
      const d = closedBars(await CHECK_SOURCES[name](sym));
      if (d.length >= 201 && integrity(d, 200).ok) return { source: name, data: d.slice(-260), fetchedAt: Date.now(), errors };
      errors.push(`${name}: 資料不足`);
    } catch (e) { errors.push(`${name}: ${e.message || e}`); }
  }
  return { source: null, data: null, fetchedAt: Date.now(), errors };
}
export async function fetchFunding(sym) { return firstOk(FUNDING_SOURCES, sym, d => d.length >= 21); }
export async function fetchFng() {
  try {
    const j = await getJSON('https://api.alternative.me/fng/?limit=600&format=json');
    return { source: 'alternative.me', data: j.data.map(x => ({ t: +x.timestamp * 1000, v: +x.value })).sort((a, b) => a.t - b.t), errors: [] };
  } catch (e) { return { source: null, data: null, errors: [`alternative.me: ${e.message || e}`] }; }
}
let pricesP = null;
/** One CoinGecko call for BTC, ETH, USDT in USD and TWD (also gives the USD/TWD rate). Shared per page load. */
export function fetchPrices(force = false) {
  if (force || !pricesP) pricesP = getJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd,twd').catch(() => { pricesP = null; return null; });
  return pricesP;
}
export async function fetchSpot(sym) {
  const j = await fetchPrices();
  return j ? j[COIN[sym].gecko] ?? null : null;
}
