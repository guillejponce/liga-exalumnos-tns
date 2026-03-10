'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getSeasons(leagueId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('year', { ascending: false })
    .order('semester', { ascending: false })

  if (error) throw error
  return data
}

export async function getActiveSeason(leagueId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createSeason(formData: FormData) {
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  return { success: true }
}

export async function getTeamSeasons(seasonId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_seasons')
    .select('*, team:teams(*)')
    .eq('season_id', seasonId)

  if (error) throw error
  return data
}

export async function registerTeamToSeason(formData: FormData) {
  const supabase = await createClient()

  const team_id = formData.get('team_id') as string
  const season_id = formData.get('season_id') as string

  if (!team_id || !season_id) {
    return { error: 'Equipo y temporada son requeridos' }
  }

  const { error } = await supabase
    .from('team_seasons')
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
  const supabase = await createClient()
  const { error } = await supabase.from('team_seasons').delete().eq('id', teamSeasonId)

  if (error) return { error: error.message }

  revalidatePath('/admin/temporadas')
  return { success: true }
}
