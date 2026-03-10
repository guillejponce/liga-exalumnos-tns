'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const PATHS_TO_REVALIDATE = ['/admin/partidos', '/admin/temporadas', '/fixture', '/tabla', '/goleadores', '/']

function revalidateAll() {
  PATHS_TO_REVALIDATE.forEach((p) => revalidatePath(p))
}

// ─── Matches ───

export async function createMatch(formData: FormData) {
  const supabase = createAdminClient()

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
    kickoff_at: kickoff_at || null,
    status: 'scheduled' as const,
  })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function updateMatchScore(formData: FormData) {
  const supabase = createAdminClient()

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

  revalidateAll()
  return { success: true }
}

export async function deleteMatch(matchId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('matches').delete().eq('id', matchId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

// ─── Competitions ───

export async function createCompetition(formData: FormData) {
  const supabase = createAdminClient()

  const season_id = formData.get('season_id') as string
  const name = formData.get('name') as string

  if (!season_id || !name) {
    return { error: 'Nombre y temporada son requeridos' }
  }

  const { error } = await supabase
    .from('competitions')
    .insert({ season_id, name })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function deleteCompetition(competitionId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('competitions').delete().eq('id', competitionId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

// ─── Stages ───

export async function createStage(formData: FormData) {
  const supabase = createAdminClient()

  const competition_id = formData.get('competition_id') as string
  const name = formData.get('name') as string
  const type = formData.get('type') as 'league_table' | 'groups' | 'knockout'
  const stage_order = parseInt(formData.get('stage_order') as string)

  if (!competition_id || !name || !type) {
    return { error: 'Datos incompletos' }
  }

  const rulesMap: Record<string, Record<string, unknown>> = {
    league_table: { points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ['points', 'gd', 'gf'] },
    groups: { points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ['points', 'gd', 'gf'], groups_count: 2, advance_per_group: 2 },
    knockout: { legs: 1, extra_time: false, penalties: true },
  }
  const rules = rulesMap[type] ?? {}

  const { error } = await supabase.from('stages').insert({
    competition_id,
    name,
    type,
    stage_order: isNaN(stage_order) ? 1 : stage_order,
    rules,
  })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function deleteStage(stageId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('stages').delete().eq('id', stageId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

// ─── Stage Groups ───

export async function createStageGroup(stageId: string, name: string) {
  const supabase = createAdminClient()

  if (!stageId || !name) return { error: 'Datos incompletos' }

  const { data, error } = await supabase
    .from('stage_groups')
    .insert({ stage_id: stageId, name })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true, data }
}

export async function deleteStageGroup(groupId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('stage_groups').delete().eq('id', groupId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function assignTeamToGroup(groupId: string, teamSeasonId: string) {
  const supabase = createAdminClient()

  if (!groupId || !teamSeasonId) return { error: 'Datos incompletos' }

  const { error } = await supabase
    .from('stage_group_teams')
    .insert({ group_id: groupId, team_season_id: teamSeasonId })

  if (error) {
    if (error.code === '23505') return { error: 'Este equipo ya está en este grupo' }
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function removeTeamFromGroup(groupId: string, teamSeasonId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('stage_group_teams')
    .delete()
    .eq('group_id', groupId)
    .eq('team_season_id', teamSeasonId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

// ─── Bulk match generation ───

export async function generateRoundRobinMatches(
  stageId: string,
  teamSeasonIds: string[],
  groupId?: string | null
) {
  const supabase = createAdminClient()

  if (teamSeasonIds.length < 2) return { error: 'Se necesitan al menos 2 equipos' }

  const teams = [...teamSeasonIds]
  const useBye = teams.length % 2 !== 0
  if (useBye) teams.push('__BYE__')

  const n = teams.length
  const rounds = n - 1
  const matchesPerRound = n / 2
  const inserts: {
    stage_id: string
    group_id: string | null
    home_team_season_id: string
    away_team_season_id: string
    round: number
    status: 'scheduled'
  }[] = []

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match === 0 ? 0 : ((round + match) % (n - 1)) + 1
      const awayIdx = match === 0 ? ((round) % (n - 1)) + 1 : ((round + n - 1 - match) % (n - 1)) + 1

      const homeTeam = teams[home === 0 ? 0 : home]
      const awayTeam = teams[awayIdx]

      if (homeTeam === '__BYE__' || awayTeam === '__BYE__') continue

      inserts.push({
        stage_id: stageId,
        group_id: groupId ?? null,
        home_team_season_id: round % 2 === 0 ? homeTeam : awayTeam,
        away_team_season_id: round % 2 === 0 ? awayTeam : homeTeam,
        round: round + 1,
        status: 'scheduled',
      })
    }
  }

  if (inserts.length === 0) return { error: 'No se pudieron generar partidos' }

  const { error } = await supabase.from('matches').insert(inserts)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true, count: inserts.length }
}

export async function generateKnockoutMatches(
  stageId: string,
  matchups: { home: string; away: string; round: number }[]
) {
  const supabase = createAdminClient()

  if (matchups.length === 0) return { error: 'No hay llaves definidas' }

  const inserts = matchups.map((m) => ({
    stage_id: stageId,
    group_id: null,
    home_team_season_id: m.home,
    away_team_season_id: m.away,
    round: m.round,
    status: 'scheduled' as const,
  }))

  const { error } = await supabase.from('matches').insert(inserts)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true, count: inserts.length }
}

export async function deleteAllStageMatches(stageId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('matches').delete().eq('stage_id', stageId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}
