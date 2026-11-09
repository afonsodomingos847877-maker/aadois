// ADOIS Service Worker for PWA
const CACHE_NAME = 'adois-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass-through for real-time and API requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('socket.io') ||
    event.request.method !== 'GET'
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

