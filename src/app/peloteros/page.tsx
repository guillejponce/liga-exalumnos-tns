import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import PeloterosDashboard from './PeloterosDashboard'

export const dynamic = 'force-dynamic'

export interface PMatchItem {
  id: string
  round: number | null
  status: string
  home_score: number | null
  away_score: number | null
  kickoff_at: string | null
  homeTeam: string
  awayTeam: string
  homeCrest: string | null
  awayCrest: string | null
  groupId: string | null
  stageId: string
}

export interface PStageSection {
  competitionId: string
  competitionName: string
  stageId: string
  stageName: string
  stageType: string
  groups: { name: string; id: string | null }[]
  matches: PMatchItem[]
}

export default async function PeloterosPage() {
  const league = await getLeague()
  const sections: PStageSection[] = []
  let seasonName = ''

  if (league) {
    const activeSeason = await getActiveSeasonForLeague(league.id)
    if (activeSeason) {
      seasonName = activeSeason.name
      const supabase = createAdminClient()

      const { data: stagesRaw } = await supabase
        .from('stages')
        .select('id, name, type, stage_order, competition:competitions!inner(id, name, season_id)')
        .eq('competition.season_id', activeSeason.id)
        .order('stage_order', { ascending: false })

      if (stagesRaw && stagesRaw.length > 0) {
        const stageIds = stagesRaw.map((s) => s.id)

        const { data: matchesRaw } = await supabase
          .from('matches')
          .select(`
            id, round, status, home_score, away_score, kickoff_at, stage_id, group_id,
            home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(short_name, crest_path)),
            away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(short_name, crest_path))
          `)
          .in('stage_id', stageIds)
          .order('round', { ascending: false })
          .order('kickoff_at', { ascending: false })
          .limit(2000)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allMatches = (matchesRaw ?? []).map((m: any) => {
          const ht = Array.isArray(m.home_team_season?.team) ? m.home_team_season.team[0] : m.home_team_season?.team
          const at = Array.isArray(m.away_team_season?.team) ? m.away_team_season.team[0] : m.away_team_season?.team
          return {
            id: m.id,
            round: m.round,
            status: m.status,
            home_score: m.home_score,
            away_score: m.away_score,
            kickoff_at: m.kickoff_at,
            homeTeam: ht?.short_name ?? '?',
            awayTeam: at?.short_name ?? '?',
            homeCrest: ht?.crest_path ?? null,
            awayCrest: at?.crest_path ?? null,
            groupId: m.group_id,
            stageId: m.stage_id as string,
          }
        })

        const stageGroupsMap: Record<string, { id: string; name: string }[]> = {}
        const groupStageIds = stagesRaw.filter((s) => s.type === 'groups').map((s) => s.id)
        if (groupStageIds.length > 0) {
          const { data: sgData } = await supabase.from('stage_groups').select('id, name, stage_id').in('stage_id', groupStageIds)
          for (const g of sgData ?? []) {
            const sid = g.stage_id as string
            if (!stageGroupsMap[sid]) stageGroupsMap[sid] = []
            stageGroupsMap[sid].push({ id: g.id, name: g.name })
          }
        }

        for (const stage of stagesRaw) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comp = stage.competition as any
          const stageMatches = allMatches.filter((m) => m.stageId === stage.id)
          if (stageMatches.length === 0) continue

          const groups = stageGroupsMap[stage.id] ?? []

          sections.push({
            competitionId: comp?.id ?? '',
            competitionName: Array.isArray(comp) ? comp[0]?.name ?? '' : comp?.name ?? '',
            stageId: stage.id,
            stageName: stage.name,
            stageType: stage.type,
            groups: groups.length > 0 ? groups.map((g) => ({ name: g.name, id: g.id })) : [],
            matches: stageMatches,
          })
        }
      }
    }
  }

  return <PeloterosDashboard sections={sections} seasonName={seasonName} />
}
