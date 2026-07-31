const CACHE_NAME = 'budgetyar-v3'
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => undefined)))),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => {
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
            }
            return response
          })
          .catch(() => cached || caches.match('/offline.html'))

        // Return the local app shell first; refresh the cache in the background.
        return cached || refresh
      }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || fetched
    }),
  )
})
