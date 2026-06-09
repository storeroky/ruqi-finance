const CACHE = 'ruqi-mobile-pwa-v3';
const ASSETS = [
  './',
  './index.html',
  './mobile.html',
  './print-order.html',
  './firebase-config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || url.includes('gstatic.com') || url.includes('firebase')) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('./mobile.html');
      return cached;
    }))
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-ruqi') console.log('مزامنة البيانات المعلقة');
});
