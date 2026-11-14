/* Fineplay PWA — abre sin internet. Cambia la versión al subir cambios. */
const VERSION = 'fineplay-v5';
const LED = 'fineplay-led';   // publicidad de la LED: no se borra al cambiar de versión
const BASE = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './privacidad.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSION && n !== LED).map(n => caches.delete(n)))).then(() => self.clients.claim())); });

const esVideo = u => /\.(mp4|webm|mov|m4v)$/i.test(u.pathname);
const esImagen = (r, u) => r.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(u.pathname) || (u.hostname === 'lh3.googleusercontent.com' && u.pathname.startsWith('/d/'));

// La app avisa qué imágenes usa la LED: se guardan para verse sin internet (los videos no: pesan mucho)
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo !== 'fp-led-precargar' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(LED).then(async c => {
    const quiero = d.urls.filter(x => /^https?:\/\//i.test(x) && !esVideo(new URL(x))).slice(0, 80);
    for (const x of quiero) {
      if (await c.match(x)) continue;
      try { const res = await fetch(x, { mode: 'no-cors' }); if (res.ok || res.type === 'opaque') await c.put(x, res); } catch (er) { }
    }
    // lo que la LED ya no usa se borra (si hay más de 80 guardadas)
    const claves = await c.keys();
    if (claves.length > 80) for (const k of claves) if (!d.urls.includes(k.url)) await c.delete(k);
  }));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com') && u.pathname.includes('macros')) return;
  if (r.mode === 'navigate' || u.origin === location.origin) {
    // la página: primero internet (siempre la última), si no hay, la guardada
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
    return;
  }
  if (esVideo(u) || r.headers.has('range')) return;
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(y => y.put(r, c)); return res; })));
    return;
  }
  if (esImagen(r, u)) {
    // imágenes (LED, carátulas, foto de Google): primero las guardadas → al instante y sin internet
    e.respondWith(caches.match(r.url).then(x => x || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(LED).then(y => y.put(r.url, c)); }
      return res;
    })));
  }
});
