/* PARAMPARA ORDERBOOK — service worker
   ============================================================================
   WHAT THIS FILE IS FOR
   HIS 18 Aug, standing in the shop: "iPad per net nahi hone se app kyon nahi chal raha
   hai." His DATA was always on the device; the APP was not — the page came down from the
   host every single time. A shop cannot stop because a tower did. This keeps a copy of
   the page on the device so that after the first open it never needs the network again.

   WHY IT IS BEING WRITTEN AGAIN (v676)
   The original sw.js was deleted along with the old working files. Deleting it does NOT
   remove it from the phones: a service worker that is already installed keeps running and
   keeps serving its own cached copy of the page. index.html calls reg.update() on every
   load, that request 404s, and the catch around it is deliberately silent — so the failure
   never reaches the screen and the old build simply stays for ever.
   That matches exactly what he saw: three copies of the app on one phone, headers reading
   v646, v642 and v666, two of them carrying a "new version ready" bar that never landed.

   THE RULES THIS FILE FOLLOWS
   1. NETWORK-FIRST for the page. index.html holds the whole application, so a new build
      must win the moment the phone has a signal. The cache is the fallback, not the
      source. (index.html's own v369 note depends on this being true.)
   2. The cache name carries a version. On activate, every cache that is not this one is
      deleted, so an old build cannot linger in storage next to the new one.
   3. When a new worker takes over an already-running app, the page is told with
      postMessage({pb:'updated'}) — index.html listens for exactly that and shows the bar.
   4. Nothing here ever touches his data. Orders, measurements, photos and the ledger live
      in IndexedDB, which a service worker cache has no part in. Clearing every cache here
      cannot lose a single naap.
   5. Anything that is not a GET, and anything on another origin, is left entirely alone.
   ============================================================================ */

/* Bump this whenever the app is redeployed. Any cache not named this is removed on
   activate, which is what stops an old copy surviving underneath a new one. */
const PREFIX = 'parampara-';
const CACHE  = PREFIX + 'v731';

/* The app is one file. These are resolved against this worker's own scope, so the same
   file works whether the site sits at the domain root or in a sub-folder. */
const SHELL = ['./', './index.html'];

self.addEventListener('install', event => {
  /* Take over as soon as this worker is ready rather than waiting for every tab to close.
     A shop closes its tabs when the shop closes, which is far too late for a fix that
     matters — and index.html's own stale-build guard (v672) is what protects the book if
     two versions are ever briefly live at once. */
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      /* A shell file that will not download must not stop the worker installing. Without
         this, one bad fetch leaves the phone with no worker at all and no offline app. */
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    /* caches.keys() is per ORIGIN, not per folder. If another app of his lives on the same
       domain - the expense tracker does - a blanket "delete everything that is not mine"
       would wipe ITS offline copy from under it. Only caches this app owns are touched. */
    const keys = await caches.keys();
    await Promise.all(keys.map(k =>
      (k.indexOf(PREFIX) === 0 && k !== CACHE) ? caches.delete(k) : null));
    await self.clients.claim();

    /* Tell any page that was ALREADY open that it is now running behind a newer worker.
       A first-ever install has no previous controller, and saying "updated" then would be
       a lie, so it is only sent to pages that were already being controlled. */
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      try { client.postMessage({ pb: 'updated' }); } catch (e) {}
    });
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;

  /* Leave everything that is not a plain GET alone, and never come between the app and
     another origin. */
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  /* NETWORK-FIRST. The newest build wins whenever there is a signal; the cached copy is
     what keeps the shop open when there is not. */
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      /* Only a real, complete response is worth keeping. A 404 or an opaque redirect
         cached here would be served back for ever, which is the failure this whole file
         exists to prevent. */
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const copy = fresh.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    } catch (e) {
      const hit = await caches.match(req);
      if (hit) return hit;
      /* A navigation with nothing cached for that exact URL still deserves the app rather
         than a browser error page. */
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html') || await caches.match('./');
        if (shell) return shell;
      }
      throw e;
    }
  })());
});

/* index.html's "Get the current version" button clears caches and unregisters this worker
   directly. This message is here so the page can also ask for it without a reload, which
   is the gentler path when he is mid-task. */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.pb === 'skipWaiting') self.skipWaiting();
  if (data.pb === 'clear') {
    event.waitUntil(
      caches.keys()
        .then(ks => Promise.all(ks.filter(k => k.indexOf(PREFIX) === 0).map(k => caches.delete(k))))
        .catch(() => {})
    );
  }
});
