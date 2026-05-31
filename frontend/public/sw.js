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
