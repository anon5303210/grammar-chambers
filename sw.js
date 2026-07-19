// Minimal service worker: cache-first for app shell + content, network-refresh in background.
const CACHE = 'gc-v2';
const ASSETS = [
  './', './index.html', './styles.css?v=2', './manifest.webmanifest',
  './js/main.js', './js/ui.js', './js/engine.js', './js/content.js', './js/store.js',
  './data/rules.json', './data/quick-fire.json', './data/fix-it.json', './data/proofreading.json',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
