// v41: 手機沒連上網路時，首頁最上面說清楚「這是手機存的哪一天的資料」.
// The service worker (sw.js) answers from its saved copy when the network is down or slower than 4 s, and marks that
// answer with the header `x-saved-copy: 1`; the server's own `date` header on the saved copy = when this phone last
// downloaded it. Pure functions (no DOM, no fetch). Research: web.dev "Offline UX design guidelines" (2016): tell the user
// whose end the problem is on, and for current-information apps auto-update as soon as the connection is back;
// Nielsen 1994 (CHI, doi 10.1145/191666.191729) "visibility of system status".
import { staleness, closeMD } from './trust.js';
const DAY = 86400000;
const ymd = n => new Date(n * DAY).toISOString().slice(0, 10);
const tpe = t => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
};

/** From the data/live.json response: { saved: answered from the phone's saved copy, at: ms the phone last downloaded it | null }. */
export function savedInfo(headers) {
  const get = k => { try { return headers?.get?.(k) ?? null; } catch { return null; } };
  const saved = get('x-saved-copy') === '1';
  const at = saved ? Date.parse(get('date') || '') : NaN;
  return { saved, at: Number.isFinite(at) ? at : null };
}

/** Is the phone without a usable connection? online = navigator.onLine (false = surely offline). */
export const isOff = (info, online) => online === false || !!info?.saved;

/** Latest candle date that has closed by `now` (Taipei 08:00 = 00:00 UTC). */
export const latestClosed = now => ymd(Math.floor(now / DAY) - 1);

/** One plain line for the top of the card, or '' when the phone is online. asof = the card's candle date (YYYY-MM-DD). */
export function homeLine({ info, online, asof, now }) {
  if (!isOff(info, online)) return '';
  const when = info?.at ? `（這支手機上次下載是 ${tpe(info.at)}）` : '';
  const back = '連上網路後會自動更新，也可以按右上角 ↻。';
  if (!asof) return `<p class="offline offline-red" id="fc-off" data-level="red">📴 這支手機現在沒連上網路，也沒有存到預測資料，先別照做。${back}</p>`;
  const s = staleness(asof, now);
  if (s.level) {
    const n = s.missed ?? '多';
    return `<p class="offline offline-${s.level}" id="fc-off" data-level="${s.level}" data-asof="${asof}">${s.level === 'red' ? '⛔' : '⚠️'} 這支手機現在沒連上網路（或網路太慢），下面是上次存下的 ${closeMD(asof)} 早上的建議，已經舊了 ${n} 天，先別照做${when}。很可能只是這支手機沒拿到新資料，不一定是預測停了；${back}</p>`;
  }
  const newer = asof < latestClosed(now);   // this morning's close is in, but the phone has not downloaded the 08:20 update
  const fresh = newer ? `今天早上 8 點收盤後的新建議（約 8:20～8:35 出來）這支手機還沒拿到，可能已經變了` : `這已經是最新一天的建議，可以照常看`;
  return `<p class="offline offline-${newer ? 'yellow' : 'ok'}" id="fc-off" data-level="${newer ? 'yellow' : 'ok'}" data-asof="${asof}">📴 這支手機現在沒連上網路（或網路太慢），下面是上次存下的 ${closeMD(asof)} 早上 8 點收盤的建議${when}：${fresh}。盤中價要連上網路才看得到；${back}</p>`;
}
/** Small tag after a coin's 「資料正常」 badge when its daily bars came from the phone's saved copy (download failed). */
export const badgeTag = live => live?.fromCache && live?.stale ? '（手機存的資料）' : '';
