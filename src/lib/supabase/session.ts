import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')

  // Quick check if any auth cookie is present
  const cookies = request.cookies.getAll()
  const hasAuthToken = cookies.some(c => c.name.startsWith('sb-') || c.name.includes('auth-token'))

  // Fast-path: if no auth cookie and accessing public auth pages, bypass Supabase Auth API
  if (!hasAuthToken && isAuthPage) {
    return supabaseResponse
  }

  // Fast-path: if no auth cookie and accessing protected routes, redirect immediately without API roundtrip
  if (!hasAuthToken && !isAuthPage && (pathname === '/' || pathname.startsWith('/planned') || pathname.startsWith('/transactions') || pathname.startsWith('/accounts') || pathname.startsWith('/credit-cards') || pathname.startsWith('/settings'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'financeOS' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refresh the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect root/dashboard route
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Se logado e tentando acessar /login ou /register, mandar pro dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
