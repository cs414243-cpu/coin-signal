// App-shell cache. Market API calls are never cached here (always live; app keeps its own last-good copy).
const VERSION = 'v65-2026-11-17';
const SHELL = ['./', './index.html', './css/style.css', './js/app.js', './js/signals.js', './js/data.js', './js/decision.js', './js/events.js', './js/reliability.js', './js/flips.js', './js/outcomes.js', './js/trust.js', './js/fresh.js', './js/pup.js', './js/journal.js', './js/intraday.js', './js/tested.js', './js/weekrisk.js', './js/tradeband.js', './js/robust.js', './js/guard.js', './js/overfit.js', './js/xsrc.js', './js/spells.js', './js/nextmove.js', './js/scorenoise.js', './js/paperlog.js', './js/preclose.js', './js/flipdrift.js', './js/trips.js', './js/underwater.js', './js/costsens.js', './js/ladder.js', './js/offline.js', './js/answers.js', './js/moveweeks.js', './js/dipbuy.js', './js/fullpath.js', './js/cashyield.js', './js/startany.js', './js/advgroups.js', './js/pupcal.js', './js/usdtpark.js', './js/review.js', './js/years.js', './js/blend.js', './js/splitexit.js', './js/coinsplit.js', './js/sameavg.js', './js/quitcost.js', './js/lateentry.js', './js/dipstop.js', './js/quickexit.js', './js/scoretalk.js', './js/bigclues.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './data/backtest.json', './data/decision.json', './data/dca.json', './data/live.json', './data/events.json', './data/flips.json', './data/outcomes.json', './data/trust.json', './data/intraday.json', './data/tested_signals.json', './data/weekrisk.json', './data/tradeband.json', './data/xsrc.json', './data/spells.json', './data/nextmove.json', './data/scorenoise.json', './data/flipdrift.json', './data/trips.json', './data/underwater.json', './data/costsens.json', './data/ladder.json', './data/bandnoise.json', './data/moveweeks.json', './data/dipbuy.json', './data/fullpath.json', './data/cashyield.json', './data/startany.json', './data/pupcal.json', './data/usdtpark.json', './data/review.json', './data/years.json', './data/blend.json', './data/splitexit.json', './data/coinsplit.json', './data/sameavg.json', './data/quitcost.json', './data/lateentry.json', './data/dipstop.json', './data/quickexit.json', './data/bigclues.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return; // live APIs: network only
  // network-first (so a new version shows on the next open), cache fallback when offline / slow (4 s)
  e.respondWith(caches.open(VERSION).then(async c => {
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    net.catch(() => {});
    const timeout = new Promise(res => setTimeout(res, 4000));
    try {
      const r = await Promise.race([net, timeout]);
      if (r) return r;
    } catch {}
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (!hit) return net;
    // v41: mark answers from the saved copy so the page can say 「這是手機存的資料」 (the copy keeps the server's `date` header)
    const h = new Headers(hit.headers); h.set('x-saved-copy', '1');
    return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers: h });
  }));
});
