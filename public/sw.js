const CACHE_NAME = 'fluxoae-pwa-v11'
const STATIC_ASSETS = [
  '/login',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
]

// Install event: cache basic app shell safely
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset)
        } catch (err) {
          console.warn('Failed to cache asset:', asset, err)
        }
      }
    })
  )
})

// Activate event: clean up old caches and claim clients
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

// Fetch event: Stale-While-Revalidate for ultra-fast HTML navigation (0ms launch), Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests or external origins (e.g. Supabase API calls)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Navigation / HTML requests -> Stale-While-Revalidate with redirect sanitization
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = (await cache.match(request)) || (await cache.match('/login'))

        // Background network refresh
        const networkPromise = fetch(request)
          .then((response) => {
            // ONLY cache 200 OK non-redirected responses to prevent ERR_FAILED
            if (response && response.status === 200 && !response.redirected) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => null)

        // If we have a valid, non-redirected cached response, serve INSTANTLY (0ms)
        if (cachedResponse && cachedResponse.status === 200 && !cachedResponse.redirected) {
          event.waitUntil(networkPromise)
          return cachedResponse
        }

        // Otherwise wait for network response
        const networkResponse = await networkPromise
        if (networkResponse) return networkResponse

        // Offline fallback
        return (
          cachedResponse ||
          new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>FluxoAÊ Offline</title></head><body><h1>FluxoAÊ Offline</h1><p>Sem conexão no momento.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      })()
    )
    return
  }

  // Next.js RSC (React Server Components) Payloads for Client Navigation
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request)
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        }).catch(async () => {
          if (cachedResponse) return cachedResponse
          return Response.error()
        })
        
        return cachedResponse || fetchPromise
      })()
    )
    return
  }

  // Static Next.js assets (_next/static, fonts, icons) -> Cache First
  if (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
      })
    )
    return
  }
})
