'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const PATHS_TO_REVALIDATE = ['/admin/partidos', '/admin/temporadas', '/goleadores', '/']

function revalidateAll() {
  PATHS_TO_REVALIDATE.forEach((p) => revalidatePath(p))
}

type EventType = 'goal' | 'assist' | 'yellow' | 'red'

export interface MatchEventDisplay {
  id: string
  type: EventType
  minute: number | null
  player_id: string
  team_season_id: string
  player: { first_name: string; last_name: string | null; nickname: string | null }
  team: { name: string; short_name: string | null }
}

export async function getMatchEvents(matchId: string) {
  const supabase = createAdminClient()

  const { data: events, error: eventsError } = await supabase
    .from('match_events')
    .select('id, type, minute, team_season_id, player_id')
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullsFirst: false })

  if (eventsError) return { error: eventsError.message, data: [] }
  const eventsList = events ?? []
  if (eventsList.length === 0) return { data: [] }

  const playerIds = [...new Set(eventsList.map((e) => e.player_id).filter(Boolean))]
  const teamSeasonIds = [...new Set(eventsList.map((e) => e.team_season_id))]

  const [playersRes, teamSeasonsRes] = await Promise.all([
    supabase.from('players').select('id, first_name, last_name, nickname').in('id', playerIds),
    supabase.from('team_season').select('id, team:teams(id, name, short_name)').in('id', teamSeasonIds),
  ])

  const playerMap = new Map((playersRes.data ?? []).map((p) => [p.id, p]))
  const tsMap = new Map(
    (teamSeasonsRes.data ?? []).map((ts) => {
      const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
      return [ts.id, team]
    })
  )

  const data: MatchEventDisplay[] = eventsList.map((ev) => {
    const player = playerMap.get(ev.player_id)
    const team = tsMap.get(ev.team_season_id) as { name: string; short_name: string | null } | undefined
    return {
      id: ev.id,
      type: ev.type as EventType,
      minute: ev.minute,
      player_id: ev.player_id ?? '',
      team_season_id: ev.team_season_id,
      player: player ?? { first_name: '?', last_name: null, nickname: null },
      team: team ?? { name: '?', short_name: null },
    }
  })
  return { data }
}

export interface PlayerOption {
  player_id: string
  team_season_id: string
  shirt_number: number | null
  first_name: string
  last_name: string | null
  nickname: string | null
  team_short_name: string | null
}

export async function getPlayersForMatch(homeTeamSeasonId: string, awayTeamSeasonId: string) {
  const supabase = createAdminClient()

  const { data: tsData, error: tsError } = await supabase
    .from('team_season')
    .select('id, team_id, team:teams(short_name)')
    .in('id', [homeTeamSeasonId, awayTeamSeasonId])

  if (tsError) return { error: tsError.message, data: [] }
  if (!tsData || tsData.length === 0) return { data: [] }

  const all: PlayerOption[] = []
  for (const ts of tsData) {
    const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
    const shortName = (team as { short_name?: string } | null)?.short_name ?? null

    const { data: roster } = await supabase
      .from('team_players')
      .select('player_id, shirt_number, player:players(first_name, last_name, nickname)')
      .eq('team_id', ts.team_id)
      .order('shirt_number')

    for (const row of roster ?? []) {
      const p = Array.isArray(row.player) ? row.player[0] : row.player
      all.push({
        player_id: row.player_id,
        team_season_id: ts.id,
        shirt_number: row.shirt_number,
        first_name: p?.first_name ?? '',
        last_name: p?.last_name ?? null,
        nickname: p?.nickname ?? null,
        team_short_name: shortName,
      })
    }
  }

  return { data: all }
}

export async function createMatchEvent(
  matchId: string,
  teamSeasonId: string,
  playerId: string,
  eventType: EventType,
  minute: number | null
) {
  const supabase = createAdminClient()

  if (!matchId || !teamSeasonId || !playerId || !eventType) {
    return { error: 'Datos incompletos' }
  }

  const { error } = await supabase.from('match_events').insert({
    match_id: matchId,
    team_season_id: teamSeasonId,
    player_id: playerId,
    type: eventType,
    minute,
  })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function deleteMatchEvent(eventId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('match_events').delete().eq('id', eventId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}
