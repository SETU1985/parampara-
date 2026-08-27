/* PARAMPARA Orderbook — offline worker
   v349, 27 Aug 2026.

   Why this file exists at all: the app has been asking the browser to register 'sw.js'
   since the PWA work, and the file was never put on the site. So every load asked for
   something that was not there, the update promise rejected, and — until v339 caught it —
   that rejection surfaced to him as "This screen could not be drawn" across a perfectly
   healthy app.

   What it does is deliberately small. The shop's DATA is not touched here: orders,
   customers, money and photos live in IndexedDB and are the app's business, not the
   worker's. All this does is keep a copy of the app FILE, so that when the shutter is up
   and the internet is not, the app still opens.

   Network-first, cache-second. A shop that has signal should always get the newest build
   the moment it is deployed; the cached copy is the fallback, never the default. Getting
   this the wrong way round is how a PWA serves a stale app for weeks. */

var CACHE = 'parampara-v1';
var SHELL = ['./', './index.html'];

self.addEventListener('install', function (e) {
  /* take over as soon as the download finishes rather than waiting for every tab to close;
     on a shop iPad the tab is never closed. */
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function () { /* a miss here must not fail the install */ });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);   /* older builds go */
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       /* only reads are cacheable */
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;        /* leave other sites alone */

  e.respondWith(
    fetch(req).then(function (res) {
      /* a good response refreshes the copy we keep */
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
      }
      return res;
    }).catch(function () {
      /* offline: hand back whatever we have, and the app itself for a page request */
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});

/* the app listens for this and shows "app updated" when a new build has been taken */
self.addEventListener('message', function (e) {
  if (e.data === 'pb-check') {
    self.clients.matchAll().then(function (cs) {
      cs.forEach(function (c) { c.postMessage({ pb: 'updated' }); });
    });
  }
});
