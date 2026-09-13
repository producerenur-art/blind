/* SiriusFM service worker.
   Strategi:
   - KODE (HTML/JS/CSS) + navigasjon: NETTVERK FØRST → brukarar køyrer ALLTID
     ferskaste kode når dei er online; cache er berre offline-fallback. Dette hindrar
     at gammal kode blir hengande hos brukarar (gammal service worker/gammal cache).
   - Andre statiske filer (bilde/ikon/font): stale-while-revalidate (raskt, endrar seg sjeldan).
   - Live-data (Gun.js-relays, Supabase, /api/, alt cross-origin): rett til nettverket, aldri cache.
   skipWaiting + clients.claim gjer at ein ny SW tar over med ein gong, utan å vente på
   at alle faner er lukka. Bump CACHE ved behov. */
const CACHE = 'siriusfm-v259';
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

// Lar sida be SW-en om å ta over umiddelbart (brukast av oppdaterings-prompten i appen).
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});

// Er dette ei kode-fil som ALLTID skal hentast ferskt frå nett når vi er online?
function isCodeAsset(url) {
  return /\.(?:js|css|html)$/i.test(url.pathname) || url.pathname === '/';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // POST/PUT → nett

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // CDN/Supabase/Gun → nett
  if (url.pathname.startsWith('/api/')) return;     // serverless API → nett

  // ── NETTVERK FØRST: navigasjon + all kode (HTML/JS/CSS) ──────────────────────
  // Online → alltid ferskaste versjon (og oppdater cache). Offline → cachet kopi,
  // og for navigasjon til slutt det cachede skallet.
  if (req.mode === 'navigate' || isCodeAsset(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('/') : undefined)))
    );
    return;
  }

  // ── Andre statiske same-origin GET (bilde/ikon/font): stale-while-revalidate ──
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
