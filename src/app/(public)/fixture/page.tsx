import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import FixtureFilters from '@/components/public/FixtureFilters'

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
  mvp_name: string | null
}

interface StageSection {
  competitionId: string
  competitionName: string
  stageId: string
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
        .order('stage_order', { ascending: false })

      if (stagesRaw && stagesRaw.length > 0) {
        const stageIds = stagesRaw.map((s) => s.id)

        // Try with mvp_player_id; fall back without it if column doesn't exist yet
        let matchesRaw: Record<string, unknown>[] | null = null
        {
          const { data, error } = await supabase
            .from('matches')
            .select(`
              id, round, kickoff_at, status, home_score, away_score, stage_id, group_id, mvp_player_id,
              home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
              away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
            `)
            .in('stage_id', stageIds)
            .order('round', { ascending: false })
            .order('kickoff_at', { ascending: false })

          if (!error) {
            matchesRaw = data as unknown as Record<string, unknown>[]
          } else {
            const fb = await supabase
              .from('matches')
              .select(`
                id, round, kickoff_at, status, home_score, away_score, stage_id, group_id,
                home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
                away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
              `)
              .in('stage_id', stageIds)
              .order('round', { ascending: false })
              .order('kickoff_at', { ascending: false })
            matchesRaw = (fb.data as unknown as Record<string, unknown>[]) ?? []
          }
        }

        // Resolve MVP player names
        const mvpPlayerIds = [...new Set(
          (matchesRaw ?? []).map((m) => m.mvp_player_id as string).filter(Boolean)
        )]
        const mvpNameMap = new Map<string, string>()
        if (mvpPlayerIds.length > 0) {
          const { data: mvpPlayers } = await supabase
            .from('players')
            .select('id, first_name, last_name, nickname')
            .in('id', mvpPlayerIds)
          for (const p of mvpPlayers ?? []) {
            const name = p.nickname
              ? `${p.first_name} "${p.nickname}"`
              : `${p.first_name} ${p.last_name ?? ''}`.trim()
            mvpNameMap.set(p.id, name)
          }
        }

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
        const matches: (MatchDisplay & { stage_id: string })[] = (matchesRaw ?? []).map((m: any) => {
          const ht = Array.isArray(m.home_team_season?.team) ? m.home_team_season.team[0] : m.home_team_season?.team
          const at = Array.isArray(m.away_team_season?.team) ? m.away_team_season.team[0] : m.away_team_season?.team
          const mvpId = m.mvp_player_id as string | null
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
            stage_id: m.stage_id,
            mvp_name: mvpId ? mvpNameMap.get(mvpId) ?? null : null,
          }
        })

        for (const stage of stagesRaw) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comp = stage.competition as any
          const directMatches = matches.filter((m) => m.stage_id === stage.id)

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

            const assignedGroupIds = new Set(groups.map((g) => g.id))
            const ungrouped = directMatches.filter((m) => !m.group_id || !assignedGroupIds.has(m.group_id))
            if (ungrouped.length > 0) {
              groupSections.push({ name: 'Sin grupo', id: 'ungrouped', matchesByRound: groupMatchesByRound(ungrouped) })
            }

            if (groupSections.some((g) => g.matchesByRound.length > 0)) {
              sections.push({
                competitionId: comp?.id ?? '',
                competitionName: comp?.name ?? '',
                stageId: stage.id,
                stageName: stage.name,
                stageType: stage.type,
                groups: groupSections,
              })
            }
          } else {
            if (directMatches.length > 0) {
              sections.push({
                competitionId: comp?.id ?? '',
                competitionName: comp?.name ?? '',
                stageId: stage.id,
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

      {sections.length === 0 ? (
        <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
          No hay partidos cargados aún
        </div>
      ) : (
        <FixtureFilters sections={sections} />
      )}
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
  return Array.from(map.entries()).sort(([a], [b]) => b - a)
}
