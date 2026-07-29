const CACHE_NAME = 'fluxoae-pwa-v14'
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

// Install event: pre-cache all pages and static assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const response = await fetch(asset)
          if (response && (response.status === 200 || response.type === 'opaqueredirect')) {
            await cache.put(asset, response)
          }
        } catch (err) {
          console.warn('Pre-cache asset warning for:', asset, err)
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

// Fetch event: Cache-First / Network-First with Fallback (Behavior from commit 0c917d5)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests or external origins (e.g. Supabase API calls)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Navigation / HTML requests
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
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
          const loginFallback = await caches.match('/login')
          if (loginFallback) return loginFallback
          const rootFallback = await caches.match('/')
          if (rootFallback) return rootFallback
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>FluxoAÊ Offline</title></head><body><h1>FluxoAÊ Offline</h1><p>Modo offline ativado.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          )
        })

        return cachedResponse || fetchPromise
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
          return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/x-component' }
          })
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
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }
})
