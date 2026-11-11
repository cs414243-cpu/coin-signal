// App-shell cache. Market API calls are never cached here (always live; app keeps its own last-good copy).
const VERSION = 'v10-2026-11-11';
const SHELL = ['./', './index.html', './css/style.css', './js/app.js', './js/signals.js', './js/data.js', './js/decision.js', './js/events.js', './js/reliability.js', './js/flips.js', './js/outcomes.js', './js/trust.js', './js/fresh.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './data/backtest.json', './data/decision.json', './data/dca.json', './data/live.json', './data/events.json', './data/flips.json', './data/outcomes.json', './data/trust.json'];
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
    return hit || net;
  }));
});
