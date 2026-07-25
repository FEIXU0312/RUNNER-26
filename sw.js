/* Service Worker — cache-first, offline-proof. Bump CACHE version to force refresh. */
const CACHE = 'runner26-v1';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // optional icons — don't fail install if they're missing
    await Promise.allSettled(
      ['./icon-180.png', './icon-192.png', './icon-512.png'].map((u) => c.add(u))
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    // Serve from cache immediately, refresh in background
    if (cached) { e.waitUntil(network); return cached; }
    const net = await network;
    if (net) return net;
    // Offline & not cached: fall back to the app shell for navigations
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return new Response('', { status: 504, statusText: 'offline' });
  })());
});
