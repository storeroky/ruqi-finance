const CACHE = 'ruqi-v1';
const ASSETS = [
  './',
  './mobile.html',
  './index.html',
  './firebase-config.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase requests — always network
  if (e.request.url.includes('firebaseio.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('firebase')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Background sync — إرسال البيانات المخزنة مؤقتاً عند عودة الإنترنت
self.addEventListener('sync', e => {
  if (e.tag === 'sync-ruqi') {
    console.log('🔄 مزامنة البيانات المعلقة...');
  }
});
