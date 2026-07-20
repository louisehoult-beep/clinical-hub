/* The Clinical Hub — service worker
   Strategy matters here: pages must be NETWORK-FIRST, or a cached copy gets served
   forever and updates never reach anyone who has visited before. Static assets stay
   cache-first (with a quiet background refresh) because they're cheap and rarely change.
   Bump CACHE whenever the shipped asset list changes. */
const CACHE = 'clinical-hub-v2';
const ASSETS = [
  'index.html',
  'revalidation.html',
  'care-passport.html',
  'cv-tailor.html',
  'resources.html',
  'hub-cloud.js',
  'manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isPage(request) {
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only same-origin GETs. Supabase, MailerLite and the official NMC/RCN links pass straight through.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (isPage(e.request)) {
    // Network first — so a fresh deploy is picked up immediately. Cache is the offline fallback.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  // Assets: serve fast from cache, but refresh in the background for next time.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
