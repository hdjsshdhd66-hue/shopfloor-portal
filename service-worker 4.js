// IMPORTANT: bump CACHE_VERSION every time you re-upload index.html (or any cached file),
// otherwise installed devices may keep showing the old cached version.
const CACHE_VERSION = 'v55';
const CACHE_NAME = 'shopfloor-cache-' + CACHE_VERSION;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './near-miss-poster-bg.png',
  './near-miss-poster-bg.jpg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './brand-mcvities.png',
  './brand-godiva.png',
  './brand-ulker.png'
];

function isCacheableAsset(url){
  try{
    const u = new URL(url, self.location.href);
    if(u.origin !== self.location.origin) return false;
    const path = u.pathname || '';
    // Only cache static app assets — never arbitrary GETs
    if(path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html')) return true;
    if(path.endsWith('manifest.json') || path.endsWith('service-worker.js')) return true;
    return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|json)$/i.test(path);
  }catch(e){ return false; }
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(() => { /* skip files that don't exist yet */ })
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for allowlisted static assets only.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  if (!isCacheableAsset(reqUrl)) return; // let browser handle non-assets normally

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if(response && response.ok){
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
  );
});
