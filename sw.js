/* Offline support. The app is one page, so the whole thing is cached after the first visit.
   Cached files are shown straight away and refreshed in the background, so an update appears on the next open.
   It only ever touches its own cache and its own folder, so other apps at the same github.io address are left alone. */
const PREFIX = 'morning-routine-';
const CACHE = PREFIX + '202610312033';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  // 'reload' skips the browser's own short-lived copy, so a fresh install always stores the newest files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // remove only this app's older caches; caches that belong to other apps are not ours to delete
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
    const fresh = fetch(req, { cache: 'no-cache' });
    const stored = fresh.then(res => (res.status === 200 ? cache.put(req, res.clone()) : null));
    if (hit) { e.waitUntil(stored.catch(() => { /* offline: keep what we have */ })); return hit; }
    stored.catch(() => { /* the page itself reports a failed load */ });
    return fresh;
  })));
});
