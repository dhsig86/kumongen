// KumonGen Service Worker
const CACHE_NAME = 'kumongen-v3.5';

const APP_SHELL = [
  './index.html',
  './matematica.html',
  './portugues.html',
  './ingles.html',
  './tablet.html',
  './tablet-player.js',
  './kumon.css',
  './gerador.js',
  './matematica.js',
  './portugues.js',
  './ingles.js',
  './favicon.svg',
  './offline.html'
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
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

  // Strategy: cache-first for app shell / static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        // If navigation request fails, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });
    })
  );
});
