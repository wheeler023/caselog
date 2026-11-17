// Makes the Case Log installable and quick to open. Only the app's own screens and icons are cached;
// patient data always comes live from Google and is never stored by this file.
const CACHE = 'caselog-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;   // calls to Google pass straight through
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// 7 pm reminder: the push carries no data (and no patient details); this file supplies the words.
self.addEventListener('push', e => e.waitUntil(self.registration.showNotification('Rate today’s cases', {
  body: 'Some of today’s cases still need a rating.', icon: './icon-192.png', badge: './icon-192.png', tag: 'rate-reminder', renotify: true })));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => new URL(c.url).origin === location.origin);
    return w ? w.focus() : self.clients.openWindow('./');
  }));
});
