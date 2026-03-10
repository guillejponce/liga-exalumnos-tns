'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createSeason(formData: FormData) {
  const supabase = createAdminClient()

  const league_id = formData.get('league_id') as string
  const name = formData.get('name') as string
  const year = parseInt(formData.get('year') as string)
  const semester = parseInt(formData.get('semester') as string) as 1 | 2
  const is_active = formData.get('is_active') === 'on'

  if (!league_id || !name || !year || !semester) {
    return { error: 'Todos los campos son requeridos' }
  }

  if (is_active) {
    await supabase
      .from('seasons')
      .update({ is_active: false })
      .eq('league_id', league_id)
  }

  const { error } = await supabase.from('seasons').insert({
    league_id,
    name,
    year,
    semester,
    is_active,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una temporada para ese año y semestre' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/temporadas')
  return { success: true }
}

export async function setActiveSeason(seasonId: string, leagueId: string) {
  const supabase = createAdminClient()

  await supabase
    .from('seasons')
    .update({ is_active: false })
    .eq('league_id', leagueId)

  const { error } = await supabase
    .from('seasons')
    .update({ is_active: true })
    .eq('id', seasonId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  revalidatePath('/')
  return { success: true }
}

export async function deleteSeason(seasonId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  return { success: true }
}

export async function registerTeamToSeason(formData: FormData) {
  const supabase = createAdminClient()

  const team_id = formData.get('team_id') as string
  const season_id = formData.get('season_id') as string

  if (!team_id || !season_id) {
    return { error: 'Equipo y temporada son requeridos' }
  }

  const { error } = await supabase
    .from('team_season')
    .insert({ team_id, season_id })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este equipo ya está inscrito en esta temporada' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/temporadas')
  return { success: true }
}

export async function removeTeamFromSeason(teamSeasonId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('team_season').delete().eq('id', teamSeasonId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  return { success: true }
}
