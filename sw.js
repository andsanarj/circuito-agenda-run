const CACHE_NAME = 'circuito-ar-v1';

const SHELL = [
  '/index.html',
  '/login.html',
  '/ranking.html',
  '/eventos.html',
  '/perfil.html',
  '/assinantes.html',
  '/agenda-assinantes.html',
  '/circuito-assinantes.html',
  '/offline.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Instala e faz cache do shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Supabase → sempre rede | resto → rede primeiro, cache como fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase e fontes externas: só rede
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic') || url.hostname.includes('jsdelivr')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Páginas e assets locais: rede primeiro, cache como fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // Se for navegação, mostra página offline
        if (e.request.mode === 'navigate') return caches.match('/offline.html');
        return new Response('', { status: 503 });
      })
  );
});
