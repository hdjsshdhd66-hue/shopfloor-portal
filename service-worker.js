// ============================================================
// Shop Floor Digital Portal — Service Worker
// ============================================================
// IMPORTANT: Bump CACHE_VERSION every time you upload a new version
// of index.html. This forces every phone/browser to fetch the fresh
// copy instead of serving an old cached one.
const CACHE_VERSION = 'v5';
const CACHE_NAME = 'shopfloor-portal-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

// Install: pre-cache the app shell, then activate immediately (don't wait for old tabs to close)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: delete any old-versioned caches, take control of open pages immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: NETWORK FIRST for the app itself, so you always get the latest
// version when online, with an offline fallback to the last cached copy.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
