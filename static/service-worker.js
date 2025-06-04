// Bare-minimum for PoC

self.addEventListener('install', event => {
  self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', event => {
  // Clean up old caches or setup logic here
  clients.claim();
});

self.addEventListener('fetch', event => {
  // Basic pass-through handler
  event.respondWith(fetch(event.request));
});
