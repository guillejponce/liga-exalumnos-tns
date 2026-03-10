import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import TeamCrest from '@/components/public/TeamCrest'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Goleadores' }

interface ScorerRow {
  playerName: string
  teamName: string
  teamShortName: string
  crestPath: string | null
  goals: number
}

export default async function GoleadoresPage() {
  const league = await getLeague()
  let scorers: ScorerRow[] = []
  let totalGoals = 0

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const supabase = await createClient()

      const { data: stages } = await supabase
        .from('stages')
        .select('id, competitions!inner(season_id)')
        .eq('competitions.season_id', activeSeason.id)

      if (stages && stages.length > 0) {
        const stageIds = stages.map((s) => s.id)

        // Get all played matches in this season
        const { data: matches } = await supabase
          .from('matches')
          .select('id')
          .in('stage_id', stageIds)
          .eq('status', 'played')

        if (matches && matches.length > 0) {
          const matchIds = matches.map((m) => m.id)

          const { data: events } = await supabase
            .from('match_events')
            .select('id, team_season_id, player_id')
            .in('match_id', matchIds)
            .eq('type', 'goal')

          if (events && events.length > 0) {
            const playerIds = [...new Set(events.map((e) => e.player_id).filter(Boolean))]
            const teamSeasonIds = [...new Set(events.map((e) => e.team_season_id))]

            const [playersRes, tsRes] = await Promise.all([
              supabase.from('players').select('id, first_name, last_name, nickname').in('id', playerIds),
              supabase.from('team_season').select('id, team:teams(name, short_name, crest_path)').in('id', teamSeasonIds),
            ])

            const playerMap = new Map((playersRes.data ?? []).map((p) => [p.id, p]))
            const tsMap = new Map(
              (tsRes.data ?? []).map((ts) => {
                const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
                return [ts.id, team]
              })
            )

            const goalMap = new Map<string, ScorerRow>()
            for (const event of events) {
              const player = event.player_id ? playerMap.get(event.player_id) : null
              const team = event.team_season_id ? tsMap.get(event.team_season_id) : null
              if (!player || !team) continue

              const name = player.nickname
                ? `${player.first_name} "${player.nickname}" ${player.last_name ?? ''}`
                : `${player.first_name} ${player.last_name ?? ''}`

              const key = name.trim()
              if (goalMap.has(key)) {
                goalMap.get(key)!.goals++
              } else {
                goalMap.set(key, {
                  playerName: name.trim(),
                  teamName: (team as { name?: string }).name ?? '',
                  teamShortName: (team as { short_name?: string }).short_name ?? '',
                  crestPath: (team as { crest_path?: string | null }).crest_path ?? null,
                  goals: 1,
                })
              }
            }

            scorers = Array.from(goalMap.values()).sort((a, b) => b.goals - a.goals)
            totalGoals = scorers.reduce((sum, s) => sum + s.goals, 0)
          }
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goleadores</h1>
          <p className="mt-1 text-sm text-navy-400">Tabla de goleadores de la temporada activa</p>
        </div>
        {totalGoals > 0 && (
          <div className="rounded-lg border border-navy-800 bg-navy-900 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-league-green">{totalGoals}</p>
            <p className="text-[10px] text-navy-400">Goles totales</p>
          </div>
        )}
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-navy-800">
        <table className="w-full">
          <thead>
            <tr className="bg-navy-900">
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-navy-400 w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-400">Jugador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-400">Equipo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-navy-400 w-20">Goles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {scorers.length === 0 && (
              <tr>
                <td colSpan={4} className="bg-navy-900/50 px-4 py-12 text-center text-sm text-navy-500">
                  No hay goles registrados aún
                </td>
              </tr>
            )}
            {scorers.map((scorer, idx) => (
              <tr key={`${scorer.playerName}-${idx}`} className="bg-navy-900/50 transition-colors hover:bg-navy-800/50">
                <td className="px-4 py-3 text-center">
                  {idx < 3 ? (
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                      'bg-amber-700/20 text-amber-600'
                    }`}>
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="text-sm text-navy-400">{idx + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-white">{scorer.playerName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TeamCrest crestPath={scorer.crestPath} name={scorer.teamShortName} size={28} />
                    <span className="text-sm text-navy-300">{scorer.teamShortName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-lg font-bold text-league-green">{scorer.goals}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
