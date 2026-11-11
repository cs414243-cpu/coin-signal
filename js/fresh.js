// v10: 回測資料日期 — every backtest card in 進階 says how recent its data is, and gets a mild note when the numbers
// are more than 10 days behind the latest closed daily bar. Pure functions (no DOM, no fetch). Top card is never touched.
import { expectedAsof } from './trust.js';
export const STALE_DAYS = 10;
const DAY = 86400000;
const dnum = s => Date.parse(s + 'T00:00:00Z') / DAY;
const minDate = xs => xs.filter(Boolean).sort()[0] || null;
const coinsMin = (d, k) => d?.coins ? minDate(Object.values(d.coins).map(c => c?.[k])) : null;

/** Last daily bar (YYYY-MM-DD, UTC candle date) behind a data file. Uses the v10 `as_of` field, else the file's own dates. */
export function asofOf(kind, d) {
  if (!d) return null;
  switch (kind) {
    case 'outcomes': case 'flips': return d.as_of || coinsMin(d, 'last_bar');
    case 'backtest': case 'decision': return d.as_of || coinsMin(d, 'last_date');
    case 'weekly': return d.as_of_parts?.weekly || d.weekly?.data_end || asofOf('decision', d);
    case 'dca': return d.as_of || d.conventions?.end || null;
    case 'walkforward': return d.walkforward?.models?.[d.champion?.key]?.end || null;
    default: return d.as_of || null;
  }
}
/** Days between the backtest's last bar and the latest closed bar the app should know about at `now` (ms). */
export function lagDays(asof, now) { return asof ? Math.round(dnum(expectedAsof(now)) - dnum(asof)) : null; }
export const isStale = (asof, now) => !asof || lagDays(asof, now) > STALE_DAYS;
export const ymdSlash = s => s ? s.replace(/-/g, '/') : '—';

/** Small plain line(s) for a backtest card. */
export function asofLine(asof, now) {
  const stale = isStale(asof, now);
  return `<p class="small muted bt-asof" data-asof="${asof || ''}" data-stale="${stale ? 1 : 0}">回測資料到 ${ymdSlash(asof)}</p>` +
    (stale ? `<p class="small bt-stale">回測數字超過 ${STALE_DAYS} 天沒更新，先當參考就好。</p>` : '');
}
/** Insert the line right after the card's first </h2>, else right after its opening tag. '' stays ''. */
export function withAsof(html, asof, now) {
  if (!html) return html;
  const line = asofLine(asof, now);
  const i = html.indexOf('</h2>');
  if (i >= 0) return html.slice(0, i + 5) + line + html.slice(i + 5);
  const j = html.indexOf('>');
  return j >= 0 ? html.slice(0, j + 1) + line + html.slice(j + 1) : line + html;
}
