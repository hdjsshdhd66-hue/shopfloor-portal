// CACHE_VERSION still gets bumped on every deploy as a clean break point for
// old caches, but it is no longer the only thing standing between users and
// stale app code: the app shell (index.html, styles.css, app.js — see
// APP_SHELL_PATHS below) now uses a network-first strategy, so a fresh
// deploy reaches already-installed PWAs the next time they're online, even
// if this line is forgotten.
const CACHE_VERSION = 'v96';
const CACHE_NAME = 'shopfloor-cache-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './training.js',
  './training-data.js',
  './ppe.js',
  './ppe-data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  './xlsx.full.min.js',
  './qrcode.min.js',
  './JsBarcode.all.min.js',
  './brand-mcvities.webp',
  './brand-godiva.webp',
  './brand-ulker.webp',
  './brand-carrs.webp',
  './brand-jacobs.webp',
  './brand-bn.webp',
  './brand-verkade.webp',
  './splash-bg-desktop.webp',
  './splash-bg-mobile.webp',
  './pladis-logo.webp'
];

// The app shell — always try the network first so a new deploy is picked up
// on the very next load while online; fall back to cache only when offline
// or the network request fails. As of the index.html/styles.css/app.js
// separation, styles.css and app.js are just as much "the app" as
// index.html itself — a client that got a fresh index.html over the
// network but then served a stale, cache-first app.js/styles.css would be
// running a broken hybrid of two releases, so both are treated the same as
// index.html here, not as ordinary static assets. training.js (Training &
// TBT module logic) and ppe.js (PPE Management module logic) join the same
// group for the same reason. training-data.js / ppe-data.js are reference
// data extracted from their source workbooks, not application logic — they
// change far less often, so they stay normal cache-first static assets
// (see ASSETS above) like the other vendored libraries.
const APP_SHELL_PATHS = ['/', '/index.html', '/styles.css', '/app.js', '/training.js', '/ppe.js'];
function isAppShellRequest(req) {
  if (req.mode === 'navigate') return true;
  try {
    const url = new URL(req.url);
    return APP_SHELL_PATHS.some((p) =>
      url.pathname === p ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/styles.css') ||
      url.pathname.endsWith('/app.js') ||
      url.pathname.endsWith('/training.js') ||
      url.pathname.endsWith('/ppe.js')
    );
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
