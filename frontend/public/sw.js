const CACHE_NAME = 'furry-drama-v3';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const API_TIMEOUT = 5000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('push', (event) => {
  let data = { title: '兽剧聚合平台', body: '您有新的通知', icon: '/icon-192x192.png', data: {} };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.data || {},
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|otf)$/i.test(url.pathname);
}

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Network timeout')), ms);
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (isApiRequest(url)) {
    event.respondWith(
      Promise.race([
        fetch(event.request),
        timeoutPromise(API_TIMEOUT)
      ]).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  if (isImageRequest(url) || isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => {
        if (isNavigationRequest(event.request)) {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408, statusText: 'Request timeout' });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (isNavigationRequest(event.request)) {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408, statusText: 'Request timeout' });
      })
    )
  );
});
