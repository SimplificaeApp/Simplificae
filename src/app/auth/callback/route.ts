import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Se houver redirect configurado no link
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // Tenta primeiro o fluxo PKCE padrão
    let { error } = await supabase.auth.exchangeCodeForSession(code)
    
    // Se falhar, tenta verifyOtp para signup ou recovery
    if (error) {
      const { error: recoveryError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'recovery'
      })
      if (!recoveryError) {
        error = null
      } else {
        const { error: signupError } = await supabase.auth.verifyOtp({
          token_hash: code,
          type: 'signup'
        })
        error = signupError
      }
    }
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se houver erro, retorna para o login com flag de erro
  return NextResponse.redirect(`${origin}/login?error=true`)
}
