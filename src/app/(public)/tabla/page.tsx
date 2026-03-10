import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
interface StandingRow {
  team: { id: string; name: string; short_name: string; crest_path: string | null }
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}
import TeamCrest from '@/components/public/TeamCrest'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tabla de posiciones' }

const TABLE_HEADERS = ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'] as const

interface StageSection {
  stageName: string
  competitionName: string
  type: string
  groupName?: string
  standings: StandingRow[]
}

export default async function TablaPage() {
  const league = await getLeague()
  const sections: StageSection[] = []

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const supabase = createAdminClient()

      const { data: teamSeasonsRaw } = await supabase
        .from('team_season')
        .select('id, team:teams(*)')
        .eq('season_id', activeSeason.id)

      const teamSeasons = normalizeTeamSeasons(teamSeasonsRaw ?? [])
      const tsMap = new Map(teamSeasons.map((ts) => [ts.id, ts]))

      // Fetch all stages with their competition
      const { data: stagesRaw } = await supabase
        .from('stages')
        .select('id, name, type, stage_order, competition:competitions!inner(id, name, season_id)')
        .eq('competition.season_id', activeSeason.id)
        .order('stage_order')

      if (stagesRaw && stagesRaw.length > 0) {
        const stageIds = stagesRaw.map((s) => s.id)

        const { data: allMatches } = await supabase
          .from('matches')
          .select('stage_id, group_id, home_team_season_id, away_team_season_id, home_score, away_score, status')
          .in('stage_id', stageIds)
          .eq('status', 'played')

        // 1) Fetch stage_groups
        const stageGroupsMap: Record<string, { id: string; name: string }[]> = {}
        const groupStageIds = stagesRaw.filter((s) => s.type === 'groups').map((s) => s.id)
        if (groupStageIds.length > 0) {
          const sgRes = await supabase
            .from('stage_groups')
            .select('id, name, stage_id')
            .in('stage_id', groupStageIds)

          if (!sgRes.error && sgRes.data) {
            for (const g of sgRes.data) {
              const sid = g.stage_id as string
              if (!stageGroupsMap[sid]) stageGroupsMap[sid] = []
              stageGroupsMap[sid].push({ id: g.id, name: g.name })
            }
          }
        }

        // 2) Fetch stage_group_teams separately
        const groupTeamMap: Record<string, string[]> = {}
        const allGroupIds = Object.values(stageGroupsMap).flat().map((g) => g.id)
        if (allGroupIds.length > 0) {
          const gtRes = await supabase
            .from('stage_group_teams')
            .select('group_id, team_season_id')
            .in('group_id', allGroupIds)

          if (!gtRes.error && gtRes.data) {
            for (const gt of gtRes.data) {
              const gid = gt.group_id as string
              const tsid = gt.team_season_id as string
              if (!groupTeamMap[gid]) groupTeamMap[gid] = []
              groupTeamMap[gid].push(tsid)
            }
          }
        }

        const matches = allMatches ?? []

        for (const stage of stagesRaw) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comp = stage.competition as any
          const compName = comp?.name ?? ''
          const stageMatches = matches.filter((m) => m.stage_id === stage.id)

          if (stage.type === 'league_table') {
            // All teams in the stage (by match participation or all season teams)
            const participatingIds = new Set<string>()
            stageMatches.forEach((m) => { participatingIds.add(m.home_team_season_id); participatingIds.add(m.away_team_season_id) })
            const stageTeams = participatingIds.size > 0
              ? teamSeasons.filter((ts) => participatingIds.has(ts.id))
              : teamSeasons

            sections.push({
              stageName: stage.name,
              competitionName: compName,
              type: 'league_table',
              standings: calculateStandings(stageTeams, stageMatches),
            })
          } else if (stage.type === 'groups') {
            const groups = stageGroupsMap[stage.id] ?? []
            if (groups.length > 0) {
              for (const group of groups) {
                const groupTsIds = groupTeamMap[group.id] ?? []
                const groupTeams = groupTsIds.map((id) => tsMap.get(id)).filter(Boolean) as TeamSeasonData[]
                const groupMatches = stageMatches.filter((m) => m.group_id === group.id)

                // Equipos del grupo: asignaciones en stage_group_teams o participantes de partidos
                let teamsForStandings = groupTeams
                if (teamsForStandings.length === 0) {
                  const ids = new Set<string>()
                  groupMatches.forEach((m) => { ids.add(m.home_team_season_id); ids.add(m.away_team_season_id) })
                  teamsForStandings = Array.from(ids).map((id) => tsMap.get(id)).filter(Boolean) as TeamSeasonData[]
                }

                sections.push({
                  stageName: stage.name,
                  competitionName: compName,
                  type: 'groups',
                  groupName: group.name,
                  standings: calculateStandings(teamsForStandings, groupMatches),
                })
              }
            } else {
              // No groups defined yet, show all participants
              const participatingIds = new Set<string>()
              stageMatches.forEach((m) => { participatingIds.add(m.home_team_season_id); participatingIds.add(m.away_team_season_id) })
              const stageTeams = participatingIds.size > 0
                ? teamSeasons.filter((ts) => participatingIds.has(ts.id))
                : teamSeasons

              sections.push({
                stageName: stage.name,
                competitionName: compName,
                type: 'groups',
                standings: calculateStandings(stageTeams, stageMatches),
              })
            }
          }
          // knockout stages don't show standings
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tabla de posiciones</h1>
        <p className="mt-1 text-sm text-navy-400">Temporada activa</p>
      </div>

      {sections.length === 0 && (
        <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
          No hay datos para mostrar aún
        </div>
      )}

      <div className="mt-8 space-y-10">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                {section.groupName ?? section.stageName}
              </h2>
              {section.competitionName && (
                <p className="text-xs text-navy-400">{section.competitionName} — {section.stageName}</p>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-navy-800">
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
                  {section.standings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="bg-navy-900/50 px-4 py-8 text-center text-sm text-navy-500">
                        Sin partidos jugados
                      </td>
                    </tr>
                  )}
                  {section.standings.map((row, index) => (
                    <tr key={row.team.id} className="bg-navy-900/50 transition-colors hover:bg-navy-800/50">
                      <td className="px-4 py-3 text-center text-sm font-bold text-navy-300">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest crestPath={row.team.crest_path} name={row.team.short_name} size={64} />
                          <span className="text-sm font-medium text-white">{row.team.name}</span>
                        </div>
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
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ───

interface MatchData {
  stage_id: string
  group_id: string | null
  home_team_season_id: string
  away_team_season_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

interface TeamSeasonData {
  id: string
  team: { id: string; name: string; short_name: string; crest_path: string | null }
}

function normalizeTeamSeasons(raw: { id: string; team: unknown }[]): TeamSeasonData[] {
  return raw
    .map((ts) => {
      const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
      if (!team || typeof team !== 'object') return null
      return { id: ts.id, team } as TeamSeasonData
    })
    .filter((ts): ts is TeamSeasonData => ts !== null)
}

function calculateStandings(teamSeasons: TeamSeasonData[], matches: MatchData[]): StandingRow[] {
  const map = new Map<string, StandingRow>()

  for (const ts of teamSeasons) {
    map.set(ts.id, {
      team: ts.team as StandingRow['team'],
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
