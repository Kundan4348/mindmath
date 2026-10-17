/* MindMath service worker — offline app shell, cache-first with network refresh */
const CACHE = 'mindmath-v3';
const ASSETS = [
  './',
  './index.html',
  './engine.js',
  './brain.js',
  './app.js',
  './brain-ui.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // stale-while-revalidate: serve cache instantly, refresh the copy in the background
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const cached = await c.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200) c.put(e.request, res.clone()).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
