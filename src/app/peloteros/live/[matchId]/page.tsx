import { createAdminClient } from '@/lib/supabase/admin'
import { getMatchEvents, getPlayersForMatch, type PlayerOption } from '@/actions/match-events'
import LiveScoring from './LiveScoring'

export const dynamic = 'force-dynamic'

interface TeamInfo {
  name: string
  short_name: string
  crest_path: string | null
}

function extractTeamInfo(teamValue: unknown): TeamInfo | null {
  const t = Array.isArray(teamValue) ? teamValue[0] : teamValue
  if (!t || typeof t !== 'object') return null
  const obj = t as Record<string, unknown>
  return {
    name: (obj.name as string) ?? '?',
    short_name: (obj.short_name as string) ?? '?',
    crest_path: (obj.crest_path as string) ?? null,
  }
}

export default async function LiveMatchPage({ params }: { params: { matchId: string } }) {
  const { matchId } = await params
  const supabase = createAdminClient()

  // Try with mvp_player_id first; fall back without it if column doesn't exist yet
  let matchRaw: Record<string, unknown> | null = null
  {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id, status, home_score, away_score, kickoff_at, mvp_player_id,
        home_team_season:team_season!matches_home_team_season_id_fkey(id, team:teams(name, short_name, crest_path)),
        away_team_season:team_season!matches_away_team_season_id_fkey(id, team:teams(name, short_name, crest_path))
      `)
      .eq('id', matchId)
      .single()

    if (!error) {
      matchRaw = data as Record<string, unknown> | null
    } else {
      const fallback = await supabase
        .from('matches')
        .select(`
          id, status, home_score, away_score, kickoff_at,
          home_team_season:team_season!matches_home_team_season_id_fkey(id, team:teams(name, short_name, crest_path)),
          away_team_season:team_season!matches_away_team_season_id_fkey(id, team:teams(name, short_name, crest_path))
        `)
        .eq('id', matchId)
        .single()
      matchRaw = (fallback.data as Record<string, unknown> | null)
    }
  }

  if (!matchRaw) {
    return (
      <div className="py-12 text-center text-sm text-navy-500">
        Partido no encontrado
      </div>
    )
  }

  if ((matchRaw as Record<string, unknown>).status !== 'scheduled') {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-navy-400">Este partido no está programado y no se puede editar desde aquí.</p>
        <a href="/peloteros" className="inline-block rounded-lg bg-navy-800 px-4 py-2 text-xs text-navy-300 transition-colors hover:text-white">
          ← Volver a partidos
        </a>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = matchRaw as any
  const homeTeamSeasonId: string = raw.home_team_season?.id ?? ''
  const awayTeamSeasonId: string = raw.away_team_season?.id ?? ''
  const homeTeam = extractTeamInfo(raw.home_team_season?.team)
  const awayTeam = extractTeamInfo(raw.away_team_season?.team)

  const eventsRes = await getMatchEvents(matchId)
  const events = eventsRes.data ?? []

  let players: PlayerOption[] = []
  if (homeTeamSeasonId && awayTeamSeasonId) {
    const playersRes = await getPlayersForMatch(homeTeamSeasonId, awayTeamSeasonId)
    players = playersRes.data ?? []
  }

  return (
    <LiveScoring
      matchId={matchId}
      status={raw.status}
      homeScore={raw.home_score ?? 0}
      awayScore={raw.away_score ?? 0}
      mvpPlayerId={raw.mvp_player_id ?? null}
      homeTeam={homeTeam ?? { name: 'Local', short_name: 'LOC', crest_path: null }}
      awayTeam={awayTeam ?? { name: 'Visitante', short_name: 'VIS', crest_path: null }}
      homeTeamSeasonId={homeTeamSeasonId}
      awayTeamSeasonId={awayTeamSeasonId}
      initialEvents={events}
      players={players}
    />
  )
}
