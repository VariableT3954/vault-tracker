// Offline support: the whole app is cached on first load and served from the cache.
// Bump CACHE on every release so phones pick up the new files on their next open.
const CACHE = 'vt-shell-v1';

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
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
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
