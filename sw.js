// =============================================
// Subjects Online — Service Worker (PWA)
// =============================================

// ⚠️ زودنا الإصدار عشان أي Service Worker قديم يتحدث
const CACHE_NAME = 'subjects-online-v3';
const DYNAMIC_CACHE = 'subjects-online-dynamic-v3';

// =============================================
// STATIC ASSETS
// الملفات الأساسية اللي تتحفظ في الـ cache من أول مرة
// =============================================

const STATIC_ASSETS = [
  'welcome.html',
  'index.html',
  'login.html',
  'dashboard.html',
  'browse.html',
  'profile.html',
  'favorites.html',
  'player.html',
  'quizzes.html',
  'chapters.html',
  'sections.html',
  'subject.html',
  'essays.html',
  'manifest.json',

  'images/icon-192.png',
  'images/icon-512.png',

  'js/page-transition.js',
  'js/auth.js',
  'js/shared-nav.js',
  'js/firebase-config.js',
  'js/premium-effects.js',
  'js/splash.js',
  'js/pwa.js',

  'library.html',
  'js/library.js',
];


// =============================================
// INSTALL — تحميل الـ cache
// =============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');

      // نحفظ كل ملف بشكل منفصل
      // عشان لو ملف فشل ما يوقفش باقي الملفات
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err);
          })
        )
      );
    })
  );

  // تفعيل الـ Service Worker الجديد فورًا
  self.skipWaiting();
});


// =============================================
// ACTIVATE — مسح الـ caches القديمة
// =============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // نحذف أي Cache قديم
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);

            return caches.delete(cacheName);
          }

          return null;
        })
      );
    })
  );

  // السيطرة على الصفحات المفتوحة فورًا
  self.clients.claim();
});


// =============================================
// FETCH
//
// HTML + data.js = Network First
// باقي الملفات = Cache First
// =============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;

  const url = new URL(request.url);

  // ===========================================
  // تجاهل أي request مش HTTP / HTTPS
  // ===========================================

  if (!request.url.startsWith('http')) {
    return;
  }


  // ===========================================
  // External domains
  // ===========================================

  const isExternalToIgnore =
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('tailwindcss') ||
    url.hostname.includes('fonts');


  // ===========================================
  // DATA.JS
  //
  // أهم جزء في الحل:
  //
  // data.js فيها المحاضرات الجديدة
  // لذلك لازم Network First
  // ===========================================

  const isDataFile =
    url.pathname.endsWith('/data.js');


  // ===========================================
  // HTML PAGES
  //
  // صفحات الموقع نفسها ممكن تتحدث،
  // لذلك نجيبها من Network أولًا.
  // ===========================================

  const isHTML =
    request.destination === 'document' ||
    url.pathname.endsWith('.html');


  // ===========================================
  // NETWORK FIRST
  //
  // يستخدم للـ:
  // - data.js
  // - HTML
  //
  // لو النت شغال:
  //    يجيب أحدث نسخة من السيرفر
  //
  // لو النت مش شغال:
  //    يستخدم النسخة القديمة من الـ cache
  // ===========================================

  if (isDataFile || isHTML) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {

          // لو response صحيح
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque'
          ) {
            const responseClone = networkResponse.clone();

            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              })
              .catch((err) => {
                console.warn(
                  '[SW] Failed to update dynamic cache:',
                  err
                );
              });
          }

          // أهم حاجة:
          // رجّع النسخة الجديدة من السيرفر
          return networkResponse;
        })

        .catch(() => {
          console.warn(
            '[SW] Network failed, trying cache:',
            request.url
          );

          // لو مفيش إنترنت
          // استخدم النسخة المحفوظة
          return caches.match(request);
        })
    );

    return;
  }


  // ===========================================
  // EXTERNAL REQUESTS
  //
  // Firebase / Google / Fonts ...
  // لا نقوم بتخزينها ديناميكيًا
  // ===========================================

  if (isExternalToIgnore) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );

    return;
  }


  // ===========================================
  // CACHE FIRST
  //
  // باقي الملفات:
  // - الصور
  // - CSS
  // - JS الثابت
  // - الملفات الأخرى
  //
  // لو موجودة في Cache:
  //    استخدمها فورًا
  //
  // لو مش موجودة:
  //    هاتها من Network وخزنها
  // ===========================================

  event.respondWith(
    caches.match(request).then((cachedResponse) => {

      // موجود في الـ cache
      if (cachedResponse) {
        return cachedResponse;
      }


      // مش موجود:
      // هاته من الإنترنت
      return fetch(request)
        .then((networkResponse) => {

          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque'
          ) {
            const responseClone =
              networkResponse.clone();

            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              })
              .catch((err) => {
                console.warn(
                  '[SW] Failed to cache response:',
                  err
                );
              });
          }

          return networkResponse;
        })

        .catch(() => {

          // =====================================
          // OFFLINE FALLBACK
          // =====================================

          if (request.destination === 'document') {
            return caches.match('welcome.html');
          }

          // لو مفيش fallback مناسب
          return new Response('', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});


// =============================================
// BACKGROUND SYNC (optional)
// =============================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
});


// =============================================
// PUSH NOTIFICATIONS
// =============================================

self.addEventListener('push', (event) => {

  const data = event.data
    ? event.data.json()
    : {};

  const title =
    data.title || 'Subjects Online';

  const options = {
    body:
      data.body || 'لديك إشعار جديد',

    icon: '/images/icon-192.png',

    badge: '/images/icon-192.png',

    vibrate: [100, 50, 100],

    data: {
      url:
        data.url || '/welcome.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


// =============================================
// NOTIFICATION CLICK
// =============================================

self.addEventListener(
  'notificationclick',
  (event) => {

    event.notification.close();

    const url =
      event.notification.data.url ||
      '/welcome.html';

    event.waitUntil(
      clients.openWindow(url)
    );
  }
);
