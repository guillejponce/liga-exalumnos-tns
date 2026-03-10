import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import type { StandingRow } from '@/types'

export const metadata: Metadata = { title: 'Tabla de posiciones' }

const TABLE_HEADERS = ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'] as const

export default async function TablaPage() {
  const league = await getLeague()
  let standings: StandingRow[] = []

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const supabase = await createClient()

      const { data: teamSeasonsRaw } = await supabase
        .from('team_season')
        .select('id, team:teams(*)')
        .eq('season_id', activeSeason.id)

      // Normalizar: Supabase puede devolver team como objeto o array según el schema
      const teamSeasons = normalizeTeamSeasons(teamSeasonsRaw ?? [])

      const { data: stages } = await supabase
        .from('stages')
        .select('id, type, competitions!inner(season_id)')
        .eq('competitions.season_id', activeSeason.id)
        .eq('type', 'league_table')

      if (teamSeasons && stages && stages.length > 0) {
        const { data: matches } = await supabase
          .from('matches')
          .select('home_team_season_id, away_team_season_id, home_score, away_score, status')
          .in('stage_id', stages.map((s) => s.id))
          .eq('status', 'played')

        standings = calculateStandings(teamSeasons, matches ?? [])
      } else if (teamSeasons) {
        standings = teamSeasons.map((ts) => ({
          team: ts.team,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
        }))
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tabla de posiciones</h1>
        <p className="mt-1 text-sm text-navy-400">Temporada activa — Fase de liga</p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-navy-800">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-navy-900">
              {TABLE_HEADERS.map((header) => (
                <th key={header} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy-400 ${header === 'Equipo' ? 'text-left' : 'text-center'}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="bg-navy-900/50 px-4 py-12 text-center text-sm text-navy-500">
                  No hay datos para mostrar aún
                </td>
              </tr>
            )}
            {standings.map((row, index) => (
              <tr key={row.team.id} className="bg-navy-900/50 transition-colors hover:bg-navy-800/50">
                <td className="px-4 py-3 text-center text-sm font-bold text-navy-300">{index + 1}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-white">{row.team.name}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.played}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.won}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.drawn}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.lost}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_for}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_against}</td>
                <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goal_difference > 0 ? '+' : ''}{row.goal_difference}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-league-green">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface MatchData {
  home_team_season_id: string
  away_team_season_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

interface TeamSeasonData {
  id: string
  team: { id: string; name: string; short_name: string; league_id: string; crest_path: string | null; created_at: string }
}

function normalizeTeamSeasons(raw: { id: string; team: unknown }[]): TeamSeasonData[] {
  return raw
    .map((ts) => {
      const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
      if (!team || typeof team !== 'object') return null
      const t = team as Record<string, unknown>
      return { id: ts.id, team: t } as TeamSeasonData
    })
    .filter((ts): ts is TeamSeasonData => ts !== null)
}

function calculateStandings(teamSeasons: TeamSeasonData[], matches: MatchData[]): StandingRow[] {
  const map = new Map<string, StandingRow>()

  for (const ts of teamSeasons) {
    map.set(ts.id, {
      team: ts.team,
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
    })
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue

    const home = map.get(m.home_team_season_id)
    const away = map.get(m.away_team_season_id)

    if (home) {
      home.played++
      home.goals_for += m.home_score
      home.goals_against += m.away_score
      if (m.home_score > m.away_score) { home.won++; home.points += 3 }
      else if (m.home_score === m.away_score) { home.drawn++; home.points += 1 }
      else { home.lost++ }
      home.goal_difference = home.goals_for - home.goals_against
    }

    if (away) {
      away.played++
      away.goals_for += m.away_score
      away.goals_against += m.home_score
      if (m.away_score > m.home_score) { away.won++; away.points += 3 }
      else if (m.away_score === m.home_score) { away.drawn++; away.points += 1 }
      else { away.lost++ }
      away.goal_difference = away.goals_for - away.goals_against
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    return b.goals_for - a.goals_for
  })
}
