const CACHE_NAME = 'fluxoae-pwa-v18'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/planned',
  '/transactions',
  '/accounts',
  '/settings',
  '/credit-cards',
  '/assistant',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
]

// Install event: pre-cache all routes safely
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const response = await fetch(asset, { credentials: 'same-origin' })
          if (response && response.status === 200 && !response.redirected) {
            await cache.put(asset, response)
          }
        } catch (err) {
          // ignore individual pre-cache failures
        }
      }
    })
  )
})

// Activate event: claim clients and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      })
    ])
  )
})

// Fetch event: Cache First for instant offline page switching (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Handle all GET requests (HTML navigation, RSC payloads, static JS/CSS assets)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cachedResponse = await cache.match(request)

      // 1. If we have a valid cached response, serve it immediately!
      if (cachedResponse && !cachedResponse.redirected) {
        // Asynchronously update cache in background if online
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            cache.put(request, networkResponse)
          }
        }).catch(() => {})
        return cachedResponse
      }

      // 2. If not in cache, try network
      try {
        const networkResponse = await fetch(request)
        if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
          cache.put(request, networkResponse.clone())
        }
        return networkResponse
      } catch (err) {
        // 3. Offline fallbacks if network fails and no exact cache match
        if (cachedResponse) return cachedResponse

        const rootFallback = await cache.match('/')
        if (rootFallback && !rootFallback.redirected) return rootFallback

        return new Response('', { status: 200 })
      }
    })()
  )
})
