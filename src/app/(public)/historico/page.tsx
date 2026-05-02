import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague } from '@/lib/league'
import HistoricoClient, { type TeamAllTime, type H2HMatch, type SeasonAwardDisplay } from '@/components/public/HistoricoClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tabla histórica' }

export default async function HistoricoPage() {
  const league = await getLeague()
  let standings: TeamAllTime[] = []
  let h2hMatches: H2HMatch[] = []
  let awards: SeasonAwardDisplay[] = []

  if (league) {
    const supabase = createAdminClient()

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, short_name, crest_path')
      .eq('league_id', league.id)

    const teamMap = new Map(
      (teams ?? []).map((t) => [t.id, t]),
    )

    const { data: allTeamSeasons } = await supabase
      .from('team_season')
      .select('id, team_id, season:seasons!inner(id, name, league_id)')
      .eq('season.league_id', league.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tsRows = (allTeamSeasons ?? []) as any[]
    const tsToTeam = new Map<string, string>()
    const tsToSeason = new Map<string, string>()
    const teamSeasonSets = new Map<string, Set<string>>()

    for (const ts of tsRows) {
      const teamId = ts.team_id as string
      const seasonRow = Array.isArray(ts.season) ? ts.season[0] : ts.season
      const seasonId = seasonRow?.id as string
      const seasonName = seasonRow?.name as string

      tsToTeam.set(ts.id, teamId)
      tsToSeason.set(ts.id, seasonName)

      if (!teamSeasonSets.has(teamId)) teamSeasonSets.set(teamId, new Set())
      teamSeasonSets.get(teamId)!.add(seasonId)
    }

    const { data: allMatches } = await supabase
      .from('matches')
      .select('home_team_season_id, away_team_season_id, home_score, away_score, status, kickoff_at')
      .eq('status', 'played')

    const matches = allMatches ?? []

    const statsMap = new Map<string, Omit<TeamAllTime, 'seasons_played'>>()
    for (const [teamId, team] of teamMap) {
      statsMap.set(teamId, {
        teamId,
        name: team.name,
        short_name: team.short_name ?? team.name,
        crest_path: team.crest_path,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
      })
    }

    for (const m of matches) {
      if (m.home_score === null || m.away_score === null) continue

      const homeTeamId = tsToTeam.get(m.home_team_season_id)
      const awayTeamId = tsToTeam.get(m.away_team_season_id)
      if (!homeTeamId || !awayTeamId) continue

      const home = statsMap.get(homeTeamId)
      const away = statsMap.get(awayTeamId)

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

      // H2H data
      const seasonName = tsToSeason.get(m.home_team_season_id) ?? ''
      h2hMatches.push({
        seasonName,
        kickoff_at: m.kickoff_at,
        homeTeamId,
        awayTeamId,
        home_score: m.home_score,
        away_score: m.away_score,
      })
    }

    standings = Array.from(statsMap.values())
      .filter((t) => t.played > 0)
      .map((t) => ({
        ...t,
        seasons_played: teamSeasonSets.get(t.teamId)?.size ?? 0,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
        return b.goals_for - a.goals_for
      })

    h2hMatches.sort((a, b) => {
      if (a.kickoff_at && b.kickoff_at) return new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
      if (a.kickoff_at) return -1
      if (b.kickoff_at) return 1
      return 0
    })

    // Fetch season awards
    const { data: seasonsRaw } = await supabase
      .from('seasons')
      .select('id, name, year, semester')
      .eq('league_id', league.id)
      .order('year', { ascending: false })
      .order('semester', { ascending: false })

    const { data: awardsRaw } = await supabase
      .from('season_awards')
      .select('id, season_id, award_type, team_id, player_id, notes')

    const { data: playersRaw } = await supabase
      .from('players')
      .select('id, first_name, last_name, nickname')
      .eq('league_id', league.id)

    const playerMap = new Map(
      (playersRaw ?? []).map((p) => [p.id, p]),
    )

    const allSeasons = seasonsRaw ?? []
    const allAwards = awardsRaw ?? []

    awards = allSeasons
      .filter((s) => allAwards.some((a) => a.season_id === s.id))
      .map((s) => {
        const seasonAwards = allAwards
          .filter((a) => a.season_id === s.id)
          .map((a) => {
            const team = a.team_id ? teamMap.get(a.team_id) : null
            const player = a.player_id ? playerMap.get(a.player_id) : null
            let playerName: string | null = null
            if (player) {
              playerName = player.nickname
                ? `${player.first_name} "${player.nickname}" ${player.last_name ?? ''}`.trim()
                : `${player.first_name} ${player.last_name ?? ''}`.trim()
            }
            return {
              award_type: a.award_type,
              teamName: team?.name ?? null,
              teamShortName: team?.short_name ?? null,
              teamCrestPath: team?.crest_path ?? null,
              playerName,
              notes: a.notes,
            }
          })

        return {
          seasonName: s.name,
          year: s.year,
          semester: s.semester,
          awards: seasonAwards,
        }
      })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico</h1>
        <p className="mt-1 text-sm text-navy-400">Estadísticas acumuladas de todas las temporadas</p>
      </div>

      <HistoricoClient standings={standings} h2hMatches={h2hMatches} awards={awards} />
    </div>
  )
}
