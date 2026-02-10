/**
 * Bird City -- Service Worker.
 *
 * Strategies:
 *   - Navigation (HTML): network-first so deploys land immediately.
 *   - Same-origin assets (JS/CSS/images): stale-while-revalidate for
 *     instant offline loading with background refresh.
 *   - External requests: network-only (don't cache analytics, etc.).
 */

const CACHE_NAME = 'bird-city-v6';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/css/style.css',
  '/js/app.js',
  '/js/daily.js',
  '/js/grid.js',
  '/js/scoring.js',
  '/js/share.js',
  '/js/stats.js',
  '/js/tiles.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('bird-city-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache external requests (analytics, CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation (HTML): network-first so updates land on next visit
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkUpdate = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      return cached || networkUpdate.then((resp) => resp || caches.match('/'));
    })
  );
});
