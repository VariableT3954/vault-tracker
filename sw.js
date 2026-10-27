// Offline support: the whole app is cached on first load and served from the cache.
// CACHE is a fingerprint of the app files; `node tools/bump-cache.mjs` updates it and
// `npm test` fails if it is stale. A new name is how phones pick up a new version.
const CACHE = 'vt-524840cf97';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/logic.js',
  './js/plan.js',
  './js/store.js',
  './js/backup.js',
  './js/ui/dom.js',
  './js/ui/today.js',
  './js/ui/history.js',
  './js/ui/journal.js',
  './js/ui/notes.js',
  './js/ui/more.js',
  './js/ui/backup-ui.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never saves old copies.
  const fresh = SHELL.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)),
  );
});
