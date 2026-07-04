'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
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

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
