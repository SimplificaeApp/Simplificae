const CACHE_NAME = 'fluxoae-pwa-v17'
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

// Install event: pre-cache basic static assets safely
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

// Fetch event: Network-First with Cache Fallback for HTML navigation
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
        const cachedResponse = await cache.match(request)

        // Try network first when online
        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            cache.put(request, networkResponse.clone())
            return networkResponse
          }
          if (networkResponse && networkResponse.redirected) {
            return networkResponse
          }
        } catch (error) {
          console.log('[SW] Offline navigation fallback:', error)
        }

        // If offline: ONLY return cached response if it wasn't a redirect to /login
        if (cachedResponse && !cachedResponse.redirected && !cachedResponse.url.includes('/login')) {
          return cachedResponse
        }

        // Try root fallback (dashboard) if offline and not a redirect
        const rootFallback = await cache.match('/')
        if (rootFallback && !rootFallback.redirected && !rootFallback.url.includes('/login')) {
          return rootFallback
        }

        // Clean dark offline page fallback
        return new Response(
          `<!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
              <title>FluxoAÊ - Offline</title>
              <style>
                * { box-sizing: border-box; }
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); padding: 32px 24px; border-radius: 24px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                .icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; box-shadow: 0 10px 20px -5px rgba(16,185,129,0.3); }
                h1 { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 8px; }
                p { font-size: 14px; color: #94a3b8; margin: 0 0 24px; line-height: 1.5; }
                .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 20px; background: #10b981; color: #022c22; font-weight: 700; font-size: 14px; border-radius: 12px; border: none; cursor: pointer; text-decoration: none; transition: all 0.2s; }
                .btn:hover { background: #34d399; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon-box">🐷</div>
                <h1>Modo Offline Ativado</h1>
                <p>Navegação offline ativa. Abra o app online para atualizar os módulos.</p>
                <button onclick="window.history.back()" class="btn">Voltar para a tela anterior</button>
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
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)

        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            cache.put(request, networkResponse.clone())
            return networkResponse
          }
        } catch (err) {
          if (cachedResponse) return cachedResponse
          return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/x-component' }
          })
        }
        return cachedResponse || new Response('', { status: 200, headers: { 'Content-Type': 'text/x-component' } })
      })()
    )
    return
  }

  // Static Next.js assets (_next/static, fonts, icons) -> Cache First
  if (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|css|js)$/)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) return cachedResponse

        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch (err) {
          return new Response('', { status: 404 })
        }
      })()
    )
    return
  }
})
