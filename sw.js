/**
 * Bird City -- Service Worker (cache-first / stale-while-revalidate).
 *
 * Pre-caches all game assets on install. Serves from cache immediately
 * for instant offline loading. Updates the cache in the background so
 * new deploys arrive on the next page load without blocking the current one.
 */

const CACHE_NAME = 'bird-city-v3';

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

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Background update: fetch from network and refresh cache
      const networkUpdate = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      // Serve from cache immediately if available
      // Otherwise fall back to network, then to cached root page
      return cached || networkUpdate.then((resp) => resp || caches.match('/'));
    })
  );
});
