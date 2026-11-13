/* Fineplay PWA — abre sin internet. Cambia la versión al subir cambios. */
const VERSION = 'fineplay-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './privacidad.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSION).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com') && u.pathname.includes('macros')) return;
  if (r.mode === 'navigate' || u.origin === location.origin) {
    // la página: primero internet (siempre la última), si no hay, la guardada
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com|i\.imgur\.com|lh\d\.googleusercontent\.com/.test(u.hostname)) {
    // letras, imágenes de la LED y foto de Google: guardadas para usar sin internet
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(y => y.put(r, c)); return res; })));
  }
});
