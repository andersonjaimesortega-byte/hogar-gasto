const CACHE_NAME = 'hogargasto-cache-v3';
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
  'icons/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// Evento de instalación: cachear recursos estáticos (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell y CDNs...');
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
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para guardarla en caché si corresponde
            // (Solo cacheamos recursos que pertenecen a nuestra app o CDNs autorizadas)
            const shouldCache = ASSETS_TO_CACHE.some(asset => event.request.url.includes(asset)) || 
                                event.request.url.startsWith(self.location.origin);
            
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
