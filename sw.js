// Pages and their files come from the network first; the last copy is kept, so a page already opened once
// (the scanning page at an event, above all) still opens when the connection drops. Calls to Google are never cached.
const CACHE = 'shawahid-v3';
const KEEP = ['scan.html', 'ui.css?v=4', 'ui.js?v=5'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(KEEP)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || !(url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net')) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, {ignoreSearch: e.request.mode === 'navigate'})));
});
