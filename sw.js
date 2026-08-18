/* PARAMPARA Orderbook — offline keeper.
   Ek hi kaam: app ka PAGE iPad/phone ke andar rakhna, taaki net na hone par bhi khule.

   ── v2, 18 Aug — GALTI SUDHAAR ──────────────────────────────────────────────
   Pehli version har same-origin request ko pakadti thi. Backup ek badi file banakar
   use download karta hai, aur uska pata bhi isi origin ka hota hai (blob:https://...).
   To backup ki poori file bhi "app ka hissa" samajh kar copy karke andar rakhi ja rahi
   thi — poori file do baar memory me. iPad ne tab hi band kar diya.

   Ab ye sirf PAGE khulne wali request dekhti hai. Backup, download, photo, awaaz,
   koi bhi file — kuch bhi is se hokar nahi guzarta.

   Data ko ye file kabhi haath nahi lagati. Orders, customers, naap, paise — sab
   pehle se device ke andar IndexedDB aur localStorage me hain aur wahin rehte hain. */

const CACHE = 'parampara-v2';
const PAGE  = './index.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./', PAGE]))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  /* purane naam ka cache poora hata do — v1 ne jo bhi galti se rakha tha, sab saaf */
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  /* SIRF page khulne wali request. Aur kuch nahi. Baaki har cheez —
     backup ki file, download, photo, awaaz, blob — browser khud sambhale,
     hum beech me aate hi nahi. */
  if (req.mode !== 'navigate') return;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(PAGE).then(hit => {
      /* peeche se nayi copy laane ki koshish — mil gayi to agli baar wahi khulegi */
      const fresh = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(PAGE, copy)).catch(() => {});
          if (hit) notifyUpdate();
        }
        return res;
      }).catch(() => null);

      if (hit) return hit;                       // andar copy hai → turant, net ka intezaar nahi
      return fresh.then(res => res || offlineNote());
    })
  );
});

function notifyUpdate() {
  self.clients.matchAll({ type: 'window' }).then(list => {
    list.forEach(c => { try { c.postMessage({ pb: 'updated' }); } catch (e) {} });
  });
}

/* Pehli hi baar net na ho to saaf batao — khaali safed page kabhi nahi. */
function offlineNote() {
  return new Response(
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="background:#16130f;color:#f3ead9;font-family:-apple-system,sans-serif;' +
    'padding:40px 24px;text-align:center;line-height:1.6">' +
    '<div style="font-size:44px">📴</div>' +
    '<h2 style="margin:14px 0 8px">App abhi tak save nahi hui</h2>' +
    '<p style="color:#c9bda6">Ek baar internet se kholiye. Uske baad ye bina net ke bhi chalegi.</p>' +
    '<p style="color:#c9bda6;font-size:13px;margin-top:18px">आपका data सुरक्षित है — वह इसी device में है।</p>' +
    '</body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
