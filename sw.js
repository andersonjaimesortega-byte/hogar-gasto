const CACHE_NAME = 'hogargasto-cache-v10';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'db.js',
  'sync.js',
  'ui.js',
  'utils.js',
  'chart.js',
  'pwa.js',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

// Evento de instalación: cachear recursos estáticos (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Evento de activación: limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Evento de fetch: estrategia Cache-first, con caída en red
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Devolver el recurso en caché
          return cachedResponse;
        }

        // Si no está en caché, intentar traerlo de la red
        return fetch(event.request)
          .then((response) => {
            // Verificar respuesta válida
            if (!response || !response.ok) {
              return response;
            }

            // Clonar la respuesta para guardarla solo si pertenece a la app.
            const shouldCache = event.request.url.startsWith(self.location.origin);
            
            if (shouldCache) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Si falla la red y no está en caché, podemos mostrar una página de error o simplemente fallar
            console.log('Recurso no disponible offline:', event.request.url);
          });
      })
  );
});
