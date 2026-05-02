'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createAward(formData: FormData) {
  const supabase = createAdminClient()

  const season_id = formData.get('season_id') as string
  const award_type = formData.get('award_type') as string
  const team_id = (formData.get('team_id') as string) || null
  const player_id = (formData.get('player_id') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!season_id || !award_type) {
    return { error: 'Temporada y tipo de premio son requeridos' }
  }

  if (!team_id && !player_id) {
    return { error: 'Debes seleccionar un equipo o un jugador' }
  }

  const { error } = await supabase.from('season_awards').insert({
    season_id,
    award_type,
    team_id,
    player_id,
    notes,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  revalidatePath('/historico')
  return { success: true }
}

export async function deleteAward(awardId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('season_awards').delete().eq('id', awardId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  revalidatePath('/historico')
  return { success: true }
}
