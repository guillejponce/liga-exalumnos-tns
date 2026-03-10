'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getMatches(stageId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team_season:team_seasons!matches_home_team_season_id_fkey(*, team:teams(*)),
      away_team_season:team_seasons!matches_away_team_season_id_fkey(*, team:teams(*))
    `)
    .eq('stage_id', stageId)
    .order('round')
    .order('kickoff_at')

  if (error) throw error
  return data
}

export async function getMatchesBySeason(seasonId: string) {
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('stages')
    .select('id, competitions!inner(season_id)')
    .eq('competitions.season_id', seasonId)

  if (!stages || stages.length === 0) return []

  const stageIds = stages.map((s) => s.id)

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team_season:team_seasons!matches_home_team_season_id_fkey(*, team:teams(*)),
      away_team_season:team_seasons!matches_away_team_season_id_fkey(*, team:teams(*))
    `)
    .in('stage_id', stageIds)
    .order('kickoff_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createMatch(formData: FormData) {
  const supabase = await createClient()

  const stage_id = formData.get('stage_id') as string
  const group_id = (formData.get('group_id') as string) || null
  const home_team_season_id = formData.get('home_team_season_id') as string
  const away_team_season_id = formData.get('away_team_season_id') as string
  const round = formData.get('round') as string
  const kickoff_at = (formData.get('kickoff_at') as string) || null

  if (!stage_id || !home_team_season_id || !away_team_season_id) {
    return { error: 'Etapa y equipos son requeridos' }
  }

  const { error } = await supabase.from('matches').insert({
    stage_id,
    group_id,
    home_team_season_id,
    away_team_season_id,
    round: round ? parseInt(round) : null,
    kickoff_at,
    status: 'scheduled' as const,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/partidos')
  revalidatePath('/fixture')
  return { success: true }
}

export async function updateMatchScore(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const home_score = parseInt(formData.get('home_score') as string)
  const away_score = parseInt(formData.get('away_score') as string)
  const status = formData.get('status') as 'scheduled' | 'played'

  if (!id || isNaN(home_score) || isNaN(away_score)) {
    return { error: 'Datos incompletos' }
  }

  const { error } = await supabase
    .from('matches')
    .update({ home_score, away_score, status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/partidos')
  revalidatePath('/fixture')
  revalidatePath('/tabla')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMatch(matchId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('matches').delete().eq('id', matchId)

  if (error) return { error: error.message }

  revalidatePath('/admin/partidos')
  revalidatePath('/fixture')
  revalidatePath('/tabla')
  return { success: true }
}

export async function getCompetitions(seasonId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select('*, stages(*, stage_groups(*))')
    .eq('season_id', seasonId)
    .order('created_at')

  if (error) throw error
  return data
}

export async function createCompetition(formData: FormData) {
  const supabase = await createClient()

  const season_id = formData.get('season_id') as string
  const name = formData.get('name') as string

  if (!season_id || !name) {
    return { error: 'Nombre y temporada son requeridos' }
  }

  const { error } = await supabase
    .from('competitions')
    .insert({ season_id, name })

  if (error) return { error: error.message }

  revalidatePath('/admin/partidos')
  return { success: true }
}

export async function createStage(formData: FormData) {
  const supabase = await createClient()

  const competition_id = formData.get('competition_id') as string
  const name = formData.get('name') as string
  const type = formData.get('type') as 'league_table' | 'groups' | 'knockout'
  const order = parseInt(formData.get('order') as string)

  if (!competition_id || !name || !type) {
    return { error: 'Datos incompletos' }
  }

  const defaultRules = type === 'league_table'
    ? { points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ['points', 'gd', 'gf'] }
    : null

  const { error } = await supabase.from('stages').insert({
    competition_id,
    name,
    type,
    order: isNaN(order) ? 1 : order,
    rules: defaultRules,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/partidos')
  return { success: true }
}
