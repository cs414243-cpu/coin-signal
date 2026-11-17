// v74: 台幣買幣成本（MAX）的資料有多新 — the MAX order-book snapshot and the USDT/TWD premium used to be frozen at
// 2026-11-11 / 2026-11-10; backtest/refresh_twcost.py now refreshes both every Monday (weekly.sh → refresh_all.py).
// Pure functions (no DOM, no fetch). Numbers come straight from data/decision.json.
export const STALE_DAYS = 10;
const DAY = 86400000;
const pct2 = x => `${(x * 100).toFixed(2)}%`;
const md = s => s ? s.replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1/$2') : '—';
const ymd = s => s ? s.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/, '$1/$2/$3') : '—';
const tpe = ms => {   // 'YYYY/M/D HH:mm' in Taipei (UTC+8, no DST)
  const d = new Date(ms + 8 * 3600000);
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** Freshness + "is the premium unusually high" facts for the cost card. */
export function costFresh(dec, now) {
  const bookMs = Date.parse(dec?.max?.fetched_at_utc ?? '');
  const p = dec?.premium ?? {};
  const y26 = p.by_year?.['2026'] ?? {};
  const bookAge = Number.isFinite(bookMs) ? Math.floor((now - bookMs) / DAY) : null;
  const premAge = p.last_date ? Math.floor((now - Date.parse(p.last_date + 'T08:00:00Z')) / DAY) : null;
  return {
    bookTpe: Number.isFinite(bookMs) ? tpe(bookMs) : null, bookAge,
    premDate: p.last_date ?? null, premAge, premLast: p.last ?? null, p95: y26.p95 ?? null, p5: y26.p5 ?? null,
    high: p.last != null && y26.p95 != null && p.last > y26.p95,
    stale: bookAge === null || bookAge > STALE_DAYS || premAge === null || premAge > STALE_DAYS,
  };
}

/** Plain lines shown under the cost table (inside 進階). */
export function costFreshLine(f) {
  let h = `<p class="small" id="cost-fresh">成本資料：MAX 掛單簿 ${f.bookTpe ?? '—'}（台北）、USDT 溢價到 ${ymd(f.premDate)}；每週一自動更新。</p>`;
  if (f.stale) h += '<p class="warn small">成本資料超過 10 天沒更新，價差和溢價先當參考就好。</p>';
  if (f.high) h += `<p class="small" id="cost-high">最近一天（${md(f.premDate)}）溢價 ${pct2(f.premLast)}，比 2026 年 95% 的日子都高（平常最高約 ${pct2(f.p95)}）：這時候用台幣買，溢價這部分比平常貴一些；不急的話可以在 MAX 看一下當下的 USDT 價，填進上面「USDT 賣價」重算。</p>`;
  return h;
}
