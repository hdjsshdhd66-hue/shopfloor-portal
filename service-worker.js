// CACHE_VERSION still gets bumped on every deploy as a clean break point for
// old caches, but it is no longer the only thing standing between users and
// stale app code: the app shell (index.html) now uses a network-first
// strategy below, so a fresh deploy reaches already-installed PWAs the next
// time they're online, even if this line is forgotten.
const CACHE_VERSION = 'v88';
const CACHE_NAME = 'shopfloor-cache-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  './splash-portal.webp',
  './xlsx.full.min.js',
  './qrcode.min.js',
  './JsBarcode.all.min.js',
  './brand-mcvities.webp',
  './brand-godiva.webp',
  './brand-ulker.webp',
  './brand-carrs.webp',
  './brand-jacobs.webp',
  './brand-bn.webp',
  './brand-verkade.webp'
];

// The app shell — always try the network first so a new deploy is picked up
// on the very next load while online; fall back to cache only when offline
// or the network request fails.
const APP_SHELL_PATHS = ['/', '/index.html'];
function isAppShellRequest(req) {
  if (req.mode === 'navigate') return true;
  try {
    const url = new URL(req.url);
    return APP_SHELL_PATHS.some((p) => url.pathname === p || url.pathname.endsWith('/index.html'));
  } catch (e) {
    return false;
  }
}

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

  if (isAppShellRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Static assets (libraries, images): cache-first with a background refresh,
  // as before — these rarely change and benefit from instant offline loads.
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
