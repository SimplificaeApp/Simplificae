const CACHE_NAME = 'financeos-pwa-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon',
  '/apple-icon'
]

// Install event: cache basic app shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to pre-cache some initial assets:', err)
      })
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

// Fetch event: Network-First with Cache Fallback for HTML navigation, Cache-First for static assets
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
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          // If network request fails (Offline), return matching cached route or fallback to root '/'
          const cachedResponse = await caches.match(request)
          if (cachedResponse) return cachedResponse
          const rootFallback = await caches.match('/')
          if (rootFallback) return rootFallback
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>FinanceOS Offline</title></head><body><h1>FinanceOS Offline</h1><p>Modo offline ativado.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          )
        })
    )
    return
  }

  // Next.js RSC (React Server Components) Payloads for Client Navigation
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            // Remove the varying _rsc param to cache the route payload generically
            const cacheUrl = new URL(request.url)
            cacheUrl.searchParams.delete('_rsc')
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheUrl.toString(), copy))
          }
          return response
        })
        .catch(async () => {
          // Se falhar (offline), tenta recuperar o payload RSC sem o parâmetro dinâmico
          const cacheUrl = new URL(request.url)
          cacheUrl.searchParams.delete('_rsc')
          const cachedResponse = await caches.match(cacheUrl.toString())
          if (cachedResponse) return cachedResponse
          
          // Fallback vazio para não travar o Next.js
          return new Response('', { status: 503 })
        })
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
