/* Service worker — Relevamiento de Comercios Curuzú Cuatiá
   Offline-first: cachea el shell de la app (incluye los datos embebidos en index.html). */
const CACHE = 'relevar-comercios-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never cache the Apps Script sync calls — always go to network.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return; // default network handling
  }
  // App shell: cache-first, fall back to network, then cache the response.
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (req.method === 'GET' && res && res.status === 200 && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
