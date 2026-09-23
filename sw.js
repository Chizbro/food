// Makes Chrome install a WebAPK, so the Android home-screen icon is ours
// and not a Chrome shortcut with a browser badge. Nothing is cached.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request));
});
