const CACHE = 'ruqi-v4';

// ملفات التطبيق (نفس الأصل). كل ملف يُخزَّن على حدة حتى لا يفشل التثبيت لو غاب أحدها.
const ASSETS = [
  './',
  './mobile.html',
  './index.html',
  './print-order.html',
  './firebase-config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// مكتبات Firebase (طرف ثالث) — تُخزَّن ليعمل التطبيق بدون إنترنت
const SDK = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await Promise.allSettled(ASSETS.map(u => c.add(u)));
      // no-cors => استجابة opaque، ويقبلها cache.put
      await Promise.allSettled(SDK.map(u =>
        fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r))
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // بيانات Firebase المباشرة — دائماً من الشبكة (بحسب اسم النطاق وليس اسم الملف)
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('googleapis.com')) return;

  // مكتبات Firebase على gstatic — الكاش أولاً
  if (url.hostname === 'www.gstatic.com') {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }))
    );
    return;
  }

  // أي نطاق آخر — لا نتدخل
  if (url.origin !== location.origin) return;

  // صفحات HTML — الشبكة أولاً، والكاش عند الفشل
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(r => r || caches.match('./mobile.html'))
        )
    );
    return;
  }

  // JS / CSS / صور — الكاش أولاً مع تحديث في الخلفية
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
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
