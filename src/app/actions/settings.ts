'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePrivacyPin(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const pin = formData.get('pin') as string

  if (pin && pin.length !== 4) {
    return { error: 'O PIN deve ter exatamente 4 dígitos numéricos.' }
  }

  const { error } = await supabase.auth.updateUser({
    data: { privacy_pin: pin || null }
  })

  if (error) {
    return { error: 'Ocorreu um erro ao atualizar o PIN.' }
  }

  revalidatePath('/', 'layout')
  return { success: pin ? 'PIN de Privacidade configurado com sucesso.' : 'PIN removido com sucesso.' }
}
