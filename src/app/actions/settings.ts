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

export async function updateWorkspaceTurnoverDay(workspaceId: string, day: number) {
  const supabase = await createClient()

  if (day < 1 || day > 31) {
    return { error: 'O dia de virada deve ser entre 1 e 31.' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ month_turnover_day: day })
    .eq('id', workspaceId)

  if (error) {
    console.error('Erro ao atualizar dia de virada:', error)
    return { error: 'Ocorreu um erro ao salvar o dia de virada.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Dia de virada atualizado com sucesso!' }
}

