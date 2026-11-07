/* fw-sw.js — service worker FAMILI WATER (landing page)
   - Tanpa cache: semua request langsung ke jaringan, jadi pengunjung selalu dapat versi terbaru.
   - Menerima push (data-only dari Cloud Functions) dan menampilkan notifikasi.
   Letakkan di root hosting, sejajar index.html. */
var IKON = '/icon-192.png';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function (e) { e.respondWith(fetch(e.request)); });

self.addEventListener('push', function (e) {
  var d = {};
  try { var p = e.data ? e.data.json() : {}; d = p.data || p; } catch (err) { d = {}; }
  var judul = d.judul || 'FAMILI WATER';
  var opsi = {
    body: d.isi || '',
    icon: IKON,
    tag: d.tag || 'fw-chat',
    renotify: true,
    data: { url: d.url || '/' }
  };
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      // Halaman sedang terlihat: chat sudah tampil langsung di layar, tidak perlu notifikasi
      var tampak = cs.some(function (c) { return c.visibilityState === 'visible' && c.focused; });
      if (tampak) return;
      return self.registration.showNotification(judul, opsi);
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].url.indexOf(self.location.origin) === 0 && 'focus' in cs[i]) {
          cs[i].postMessage({ aksi: 'buka-chat' });
          return cs[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
