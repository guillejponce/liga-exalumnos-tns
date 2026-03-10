import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'

export const metadata: Metadata = { title: 'Fixture' }

interface MatchDisplay {
  id: string
  round: number | null
  kickoff_at: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team_season: { team: { name: string; short_name: string } }
  away_team_season: { team: { name: string; short_name: string } }
}

export default async function FixturePage() {
  const league = await getLeague()
  let matchesByRound: Map<number, MatchDisplay[]> = new Map()

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const supabase = await createClient()

      const { data: stages } = await supabase
        .from('stages')
        .select('id, competitions!inner(season_id)')
        .eq('competitions.season_id', activeSeason.id)

      if (stages && stages.length > 0) {
        const { data: matches } = await supabase
          .from('matches')
          .select(`
            id, round, kickoff_at, status, home_score, away_score,
            home_team_season:team_seasons!matches_home_team_season_id_fkey(team:teams(name, short_name)),
            away_team_season:team_seasons!matches_away_team_season_id_fkey(team:teams(name, short_name))
          `)
          .in('stage_id', stages.map((s) => s.id))
          .order('round')
          .order('kickoff_at')

        if (matches) {
          for (const match of matches as unknown as MatchDisplay[]) {
            const round = match.round ?? 0
            if (!matchesByRound.has(round)) matchesByRound.set(round, [])
            matchesByRound.get(round)!.push(match)
          }
        }
      }
    }
  }

  const rounds = Array.from(matchesByRound.entries()).sort(([a], [b]) => a - b)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Fixture</h1>
        <p className="mt-1 text-sm text-navy-400">Calendario de partidos de la temporada</p>
      </div>

      <div className="mt-8 space-y-10">
        {rounds.length === 0 && (
          <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
            No hay partidos cargados aún
          </div>
        )}

        {rounds.map(([round, matches]) => (
          <div key={round}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-navy-800" />
              <h3 className="text-sm font-semibold text-league-green">
                {round === 0 ? 'Sin fecha asignada' : `Fecha ${round}`}
              </h3>
              <div className="h-px flex-1 bg-navy-800" />
            </div>

            <div className="mt-4 space-y-3">
              {matches.map((match) => {
                const isPlayed = match.status === 'played'
                const dateStr = match.kickoff_at
                  ? new Date(match.kickoff_at).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : null

                return (
                  <div key={match.id} className="flex items-center justify-between rounded-xl border border-navy-800 bg-navy-900 px-4 py-4 sm:px-6">
                    <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                      <span className="text-right text-sm font-medium text-white">
                        {match.home_team_season.team.short_name}
                      </span>
                      <div className="h-8 w-8 shrink-0 rounded-full bg-navy-700" />
                    </div>

                    <div className="mx-3 flex flex-col items-center sm:mx-6">
                      {isPlayed ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{match.home_score}</span>
                          <span className="text-xs text-navy-600">-</span>
                          <span className="text-lg font-bold text-white">{match.away_score}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-navy-500">vs</span>
                      )}
                      {dateStr && (
                        <span className="mt-0.5 text-[10px] text-navy-500">{dateStr}</span>
                      )}
                    </div>

                    <div className="flex flex-1 items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-navy-700" />
                      <span className="text-sm font-medium text-white">
                        {match.away_team_season.team.short_name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
