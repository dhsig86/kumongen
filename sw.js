// KumonGen Service Worker
const CACHE_NAME = 'kumongen-v3.8.2';

const APP_SHELL = [
  './index.html',
  './matematica.html',
  './portugues.html',
  './ingles.html',
  './tablet.html',
  './tablet-player.js',
  './student-profiles.js',
  './kumon.css',
  './tailwind.min.css',
  './gerador.js',
  './content-pool.js',
  './matematica.js',
  './portugues.js',
  './ingles.js',
  './favicon.svg',
  './offline.html',
  './assets/mascotes/jaguar.png',
  './assets/mascotes/jaguar_avatar.png',
  './assets/mascotes/capivara.png',
  './assets/mascotes/capivara_avatar.png',
  './assets/mascotes/calango.png',
  './assets/mascotes/calango_avatar.png',
  './assets/mascotes/golfinho.png',
  './assets/mascotes/golfinho_avatar.png'
];

// CDN patterns — stale-while-revalidate
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'html2canvas.hertzen.com',
  'cdnjs.cloudflare.com',   // jsPDF, font-awesome
  'unpkg.com'
];

function isCDN(url) {
  return CDN_HOSTS.some(host => url.hostname.includes(host));
}

// ── Install: pre-cache app shell ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

// ── Activate: purge old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategies ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Strategy: stale-while-revalidate for CDN resources
  if (isCDN(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Strategy: Network-First for HTML navigation (prevents stale cached index/tablet on updates)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./offline.html')))
    );
    return;
  }

  // Strategy: cache-first for app shell / static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });
    })
  );
});
