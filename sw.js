const CACHE = 'ruqi-v3';
const ASSETS = [
  './',
  './mobile.html',
  './index.html',
  './firebase-config.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
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
  // Firebase — always network, never cache
  if (
    e.request.url.includes('firebaseio.com') ||
    e.request.url.includes('googleapis.com') ||
    e.request.url.includes('firebase') ||
    e.request.url.includes('gstatic.com')
  ) {
    return;
  }

  // HTML pages — Network First: جلب من الشبكة دائماً، الـ cache فقط عند الفشل
  if (e.request.destination === 'document' ||
      e.request.url.endsWith('.html') ||
      e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS / CSS / Images — Cache First مع تحديث في الخلفية
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background sync
self.addEventListener('sync', e => {
  if (e.tag === 'sync-ruqi') {
    console.log('🔄 مزامنة البيانات المعلقة...');
  }
});
