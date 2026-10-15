/* Expense Manager service worker — v23
   Network-first: online, the newest uploaded files are used and the cache refreshed; offline, the
   last good copy is served. Cloud backup calls (Supabase, another origin) are never cached.
   Bump CACHE on every release so an old index.html can never be kept forever. */
const CACHE='expense-v23';
const FILES=['./','./index.html','./manifest.json','./cloud-config.js','./icon-192.png','./icon-512.png','./icon-maskable-192.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));   // one missing file must not break install
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;                       // never touch other sites (incl. Supabase)
  const key=u.origin+u.pathname;                              // query strings (shared SMS text) are never cache keys
  e.respondWith(
    fetch(r).then(res=>{
      if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(key,cp)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match(key).then(m=>m||caches.match('./index.html')))
  );
});
