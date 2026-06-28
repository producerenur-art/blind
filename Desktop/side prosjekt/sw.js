/* SoundCore service worker.
   Bevisst konservativ: cacher KUN same-origin GET-statiske filer, og lar
   live-data (Gun.js-relays, Supabase, /api/, alle cross-origin-kall) gå rett
   til nettverket. Statiske JS/CSS lastes med ?v=-cache-busters, så nye versjoner
   får ny URL og treffer aldri gammel cache. Bump CACHE ved behov. */
const CACHE = 'soundcore-v1';
const CORE = ['/', '/index.html', '/manifest.json',
  '/assets/icon-192.png', '/assets/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // POST/PUT → nett

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // CDN/Supabase/Gun → nett
  if (url.pathname.startsWith('/api/')) return;     // serverless API → nett

  // Navigasjon: nettverk først, fall tilbake til cachet skall offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Statiske same-origin GET: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
