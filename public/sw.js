// Minimal offline-shell service worker (PWA packaging, D54). Caches the app
// shell on install; network-first with cache fallback for navigation.
const CACHE = 'cactai-shell-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/'])));
});
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/')));
});
