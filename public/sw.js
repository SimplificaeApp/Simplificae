const CACHE_NAME = 'fluxoae-pwa-v12'
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

// Fetch event: Network First with offline fallback for HTML navigation
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
        const cache = await caches.open(CACHE_NAME)
        
        // 1. Try network first when online
        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch (error) {
          console.log('[SW] Rede indisponível, buscando no cache offline:', error)
        }

        // 2. Fallback to cache if offline
        const cachedResponse = (await cache.match(request)) || (await cache.match('/login'))
        if (cachedResponse) {
          return cachedResponse
        }

        // 3. Clean offline screen if no cache available
        return new Response(
          `<!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1"/>
              <title>FluxoAÊ - Offline</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
                .card { background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; padding: 32px; border-radius: 24px; max-width: 360px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h1 { color: #10b981; margin-top: 0; font-size: 20px; font-weight: 700; }
                p { color: #94a3b8; font-size: 14px; margin-bottom: 0; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Sem Conexão</h1>
                <p>O FluxoAÊ precisa de conexão com a internet para sincronizar suas finanças. Reconecte-se para continuar.</p>
              </div>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
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
