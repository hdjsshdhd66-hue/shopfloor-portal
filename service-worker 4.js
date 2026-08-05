// IMPORTANT: bump CACHE_VERSION every time you re-upload index.html (or any cached file),
// otherwise browsers keep serving the old cached portal.
const CACHE_VERSION = 'v68';
const CACHE_NAME = 'shopfloor-cache-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        try {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        } catch (e) {}
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
