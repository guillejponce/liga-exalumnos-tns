import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import TeamCrest from '@/components/public/TeamCrest'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Fixture' }

interface TeamInfo {
  name: string
  short_name: string
  crest_path: string | null
}

interface MatchDisplay {
  id: string
  round: number | null
  kickoff_at: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team: TeamInfo
  away_team: TeamInfo
  group_id: string | null
}

interface StageSection {
  competitionName: string
  stageName: string
  stageType: string
  groups: { name: string; id: string | null; matchesByRound: [number, MatchDisplay[]][] }[]
}

export default async function FixturePage() {
  const league = await getLeague()
  const sections: StageSection[] = []

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const supabase = await createClient()

      const { data: stagesRaw } = await supabase
        .from('stages')
        .select('id, name, type, stage_order, competition:competitions!inner(id, name, season_id)')
        .eq('competition.season_id', activeSeason.id)
        .order('stage_order')

      if (stagesRaw && stagesRaw.length > 0) {
        const stageIds = stagesRaw.map((s) => s.id)

        const { data: matchesRaw } = await supabase
          .from('matches')
          .select(`
            id, round, kickoff_at, status, home_score, away_score, stage_id, group_id,
            home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
            away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
          `)
          .in('stage_id', stageIds)
          .order('round')
          .order('kickoff_at')

        // Fetch stage_groups
        const stageGroupsMap: Record<string, { id: string; name: string }[]> = {}
        const groupStageIds = stagesRaw.filter((s) => s.type === 'groups').map((s) => s.id)
        if (groupStageIds.length > 0) {
          const sgRes = await supabase.from('stage_groups').select('id, name, stage_id').in('stage_id', groupStageIds)
          if (!sgRes.error && sgRes.data) {
            for (const g of sgRes.data) {
              const sid = g.stage_id as string
              if (!stageGroupsMap[sid]) stageGroupsMap[sid] = []
              stageGroupsMap[sid].push({ id: g.id, name: g.name })
            }
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matches: MatchDisplay[] = (matchesRaw ?? []).map((m: any) => {
          const ht = Array.isArray(m.home_team_season?.team) ? m.home_team_season.team[0] : m.home_team_season?.team
          const at = Array.isArray(m.away_team_season?.team) ? m.away_team_season.team[0] : m.away_team_season?.team
          return {
            id: m.id,
            round: m.round,
            kickoff_at: m.kickoff_at,
            status: m.status,
            home_score: m.home_score,
            away_score: m.away_score,
            home_team: ht ?? { name: '?', short_name: '?', crest_path: null },
            away_team: at ?? { name: '?', short_name: '?', crest_path: null },
            group_id: m.group_id,
          }
        })

        for (const stage of stagesRaw) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comp = stage.competition as any
          const directMatches = matches.filter((m) => {
            return matchesRaw?.some((mr: { id: string; stage_id: string }) => mr.id === m.id && mr.stage_id === stage.id)
          })

          if (stage.type === 'groups') {
            const groups = stageGroupsMap[stage.id] ?? []
            const groupSections = groups.map((g) => {
              const groupMatches = directMatches.filter((m) => m.group_id === g.id)
              return {
                name: g.name,
                id: g.id,
                matchesByRound: groupMatchesByRound(groupMatches),
              }
            })

            // Unassigned matches
            const assignedGroupIds = new Set(groups.map((g) => g.id))
            const ungrouped = directMatches.filter((m) => !m.group_id || !assignedGroupIds.has(m.group_id))
            if (ungrouped.length > 0) {
              groupSections.push({ name: 'Sin grupo', id: 'ungrouped', matchesByRound: groupMatchesByRound(ungrouped) })
            }

            if (groupSections.some((g) => g.matchesByRound.length > 0)) {
              sections.push({
                competitionName: comp?.name ?? '',
                stageName: stage.name,
                stageType: stage.type,
                groups: groupSections,
              })
            }
          } else {
            if (directMatches.length > 0) {
              sections.push({
                competitionName: comp?.name ?? '',
                stageName: stage.name,
                stageType: stage.type,
                groups: [{ name: '', id: null, matchesByRound: groupMatchesByRound(directMatches) }],
              })
            }
          }
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Fixture</h1>
        <p className="mt-1 text-sm text-navy-400">Calendario de partidos de la temporada</p>
      </div>

      {sections.length === 0 && (
        <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
          No hay partidos cargados aún
        </div>
      )}

      <div className="mt-8 space-y-12">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">{section.stageName}</h2>
              {section.competitionName && (
                <p className="text-xs text-navy-400">{section.competitionName}</p>
              )}
            </div>

            {section.groups.map((group, gIdx) => (
              <div key={gIdx} className="mb-8">
                {group.name && (
                  <h3 className="mb-3 text-sm font-semibold text-league-green">{group.name}</h3>
                )}

                <div className="space-y-8">
                  {group.matchesByRound.map(([round, roundMatches]) => (
                    <div key={round}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-navy-800" />
                        <h4 className="text-xs font-semibold text-navy-400">
                          {section.stageType === 'knockout'
                            ? `Ronda ${round}`
                            : round === 0
                              ? 'Sin fecha asignada'
                              : `Fecha ${round}`}
                        </h4>
                        <div className="h-px flex-1 bg-navy-800" />
                      </div>

                      <div className="space-y-2">
                        {roundMatches.map((match) => (
                          <MatchRow key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function groupMatchesByRound(matches: MatchDisplay[]): [number, MatchDisplay[]][] {
  const map = new Map<number, MatchDisplay[]>()
  for (const m of matches) {
    const r = m.round ?? 0
    if (!map.has(r)) map.set(r, [])
    map.get(r)!.push(m)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b)
}

function MatchRow({ match }: { match: MatchDisplay }) {
  const isPlayed = match.status === 'played'
  const dateStr = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Link
      href={`/fixture/${match.id}`}
      className="flex items-center justify-between rounded-xl border border-navy-800 bg-navy-900 px-4 py-3 sm:px-6 transition-colors hover:bg-navy-800 cursor-pointer"
    >
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <span className="text-right text-sm font-medium text-white">{match.home_team.name}</span>
        <TeamCrest crestPath={match.home_team.crest_path} name={match.home_team.short_name} size={40} />
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
        {dateStr && <span className="mt-0.5 text-[10px] text-navy-500">{dateStr}</span>}
      </div>

      <div className="flex flex-1 items-center gap-2 sm:gap-3">
        <TeamCrest crestPath={match.away_team.crest_path} name={match.away_team.short_name} size={40} />
        <span className="text-sm font-medium text-white">{match.away_team.name}</span>
      </div>
    </Link>
  )
}
