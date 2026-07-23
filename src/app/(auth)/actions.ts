'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/getAppUrl'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'E-mail ou senha incorretos. Tente novamente.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: {
        first_name: formData.get('first_name') as string,
      }
    }
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    const errorMsg = error.message && error.message !== '{}' 
      ? error.message 
      : (JSON.stringify(error) !== '{}' ? JSON.stringify(error) : 'Erro desconhecido ao cadastrar (verifique as configurações de SMTP do Supabase).')
    return { error: errorMsg }
  }

  if (authData.user && !authData.session) {
    return { success: 'Conta criada! Verifique sua caixa de entrada para confirmar o e-mail.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const email = formData.get('email') as string
  if (!email) {
    return { error: 'Por favor, informe seu e-mail.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`
  })

  if (error) {
    return { error: error.message || 'Erro ao enviar e-mail de recuperação.' }
  }

  return { success: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' }
}

export async function updatePassword(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 6) {
    return { error: 'A senha deve conter no mínimo 6 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'As senhas digitadas não coincidem.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message || 'Erro ao atualizar a senha.' }
  }

  revalidatePath('/', 'layout')
  redirect('/login?reset=success')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
