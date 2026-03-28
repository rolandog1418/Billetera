const CACHE_NAME = 'billetera-rapida-v2'; // Cambiamos la versión para forzar actualización
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación - Cacheamos todo inmediatamente
self.addEventListener('install', event => {
  // Forzamos la activación inmediata sin esperar a que terminen las pestañas
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cacheando recursos...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación - Tomamos control de todas las pestañas inmediatamente
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Limpiamos cachés antiguas
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomamos control de todas las páginas/clients inmediatamente
      self.clients.claim()
    ])
  );
});

// Estrategia de caché: PRIMERO CACHÉ, si no, RED
self.addEventListener('fetch', event => {
  // Solo interceptamos peticiones del mismo origen (nuestra app)
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Devolvemos del caché inmediatamente (INSTANTÁNEO)
            return cachedResponse;
          }
          
          // Si no está en caché, vamos a la red
          return fetch(event.request)
            .then(response => {
              // Cacheamos la respuesta para la próxima vez
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Si falla la red y no está en caché, mostramos fallback
              if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
              }
            });
        })
    );
  }
});