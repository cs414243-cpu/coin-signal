// Public, keyless data sources with fallbacks. Runs on the phone; nothing is sent anywhere else.
import { DAY } from './signals.js';

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
  BTC: { binance: 'BTCUSDT', kraken: 'XBTUSD', okx: 'BTC-USDT', coinbase: 'BTC-USD', swap: 'BTC-USDT-SWAP', gecko: 'bitcoin' },
  ETH: { binance: 'ETHUSDT', kraken: 'ETHUSD', okx: 'ETH-USDT', coinbase: 'ETH-USD', swap: 'ETH-USDT-SWAP', gecko: 'ethereum' },
};

// Each returns ascending [{t, c}] (may include today's unfinished candle)
const CANDLE_SOURCES = [
  ['Binance 現貨', async s => (await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${COIN[s].binance}&interval=1d&limit=600`))
      .map(k => ({ t: k[0], c: +k[4] }))],
  ['Kraken', async s => {
      const j = await getJSON(`https://api.kraken.com/0/public/OHLC?pair=${COIN[s].kraken}&interval=1440`);
      if (j.error && j.error.length) throw new Error(j.error.join(','));
      const key = Object.keys(j.result).find(k => k !== 'last');
      return j.result[key].map(k => ({ t: k[0] * 1000, c: +k[4] }));
    }],
  ['OKX', async s => {
      let rows = [], after = '';
      for (let i = 0; i < 6; i++) {
        const j = await getJSON(`https://www.okx.com/api/v5/market/history-candles?instId=${COIN[s].okx}&bar=1Dutc&limit=100${after ? '&after=' + after : ''}`);
        if (!j.data || !j.data.length) break;
        rows = rows.concat(j.data); after = j.data[j.data.length - 1][0];
      }
      return rows.map(k => ({ t: +k[0], c: +k[4] })).sort((a, b) => a.t - b.t);
    }],
  ['Coinbase', async s => {
      let rows = []; let end = Math.floor(Date.now() / DAY) * DAY + DAY;
      for (let i = 0; i < 2; i++) {
        const start = end - 300 * DAY;
        const j = await getJSON(`https://api.exchange.coinbase.com/products/${COIN[s].coinbase}/candles?granularity=86400&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`);
        rows = rows.concat(j); end = start;
      }
      const m = new Map(rows.map(k => [k[0] * 1000, +k[4]]));
      return [...m.entries()].map(([t, c]) => ({ t, c })).sort((a, b) => a.t - b.t);
    }],
];

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

export async function fetchCandles(sym) { return firstOk(CANDLE_SOURCES, sym, d => d.length >= 420); }
export async function fetchFunding(sym) { return firstOk(FUNDING_SOURCES, sym, d => d.length >= 21); }
export async function fetchFng() {
  try {
    const j = await getJSON('https://api.alternative.me/fng/?limit=600&format=json');
    return { source: 'alternative.me', data: j.data.map(x => ({ t: +x.timestamp * 1000, v: +x.value })).sort((a, b) => a.t - b.t), errors: [] };
  } catch (e) { return { source: null, data: null, errors: [`alternative.me: ${e.message || e}`] }; }
}
export async function fetchSpot(sym) {
  try { const j = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${COIN[sym].gecko}&vs_currencies=usd,twd`); return j[COIN[sym].gecko]; }
  catch { return null; }
}
