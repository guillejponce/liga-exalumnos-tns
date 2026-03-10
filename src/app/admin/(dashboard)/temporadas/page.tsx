import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague } from '@/lib/league'
import SeasonsManager from './SeasonsManager'

export const metadata = { title: 'Temporadas' }

export default async function TemporadasAdminPage() {
  const league = await getLeague()

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500">No se encontró la liga.</p>
      </div>
    )
  }

  const supabase = createAdminClient()

  // Core queries that always work
  const [seasonsRes, teamsRes, competitionsRes] = await Promise.all([
    supabase
      .from('seasons')
      .select('*, team_season(id, team:teams(id, name, short_name))')
      .eq('league_id', league.id)
      .order('year', { ascending: false })
      .order('semester', { ascending: false }),
    supabase
      .from('teams')
      .select('id, name, short_name')
      .eq('league_id', league.id)
      .order('name'),
    supabase
      .from('competitions')
      .select('*, stages(*)')
      .order('created_at'),
  ])

  const seasons = seasonsRes.data ?? []
  const teams = teamsRes.data ?? []
  const allCompetitions = competitionsRes.data ?? []

  // Separately try to fetch stage_groups (may not exist yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allStageIds = allCompetitions.flatMap((c: any) =>
    (c.stages ?? []).map((s: { id: string }) => s.id)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stageGroupsMap: Record<string, any[]> = {}
  if (allStageIds.length > 0) {
    let sgRes = await supabase
      .from('stage_groups')
      .select('*, stage_group_teams(*)')
      .in('stage_id', allStageIds)

    if (sgRes.error) {
      sgRes = await supabase
        .from('stage_groups')
        .select('*')
        .in('stage_id', allStageIds)
    }

    if (!sgRes.error && sgRes.data) {
      for (const g of sgRes.data) {
        const sid = g.stage_id as string
        if (!stageGroupsMap[sid]) stageGroupsMap[sid] = []
        stageGroupsMap[sid].push({ ...g, stage_group_teams: g.stage_group_teams ?? [] })
      }
    }
  }

  // Fetch matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allMatches: any[] = []
  if (allStageIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        home_team_season:team_season!matches_home_team_season_id_fkey(*, team:teams(*)),
        away_team_season:team_season!matches_away_team_season_id_fkey(*, team:teams(*))
      `)
      .in('stage_id', allStageIds)
      .order('round')
      .order('kickoff_at')

    allMatches = data ?? []
  }

  // Merge everything
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonsWithComps = seasons.map((s: any) => ({
    ...s,
    team_seasons: s.team_season ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    competitions: allCompetitions.filter((c: any) => c.season_id === s.id).map((c: any) => ({
      ...c,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stages: (c.stages ?? []).map((st: any) => ({
        ...st,
        stage_groups: stageGroupsMap[st.id] ?? [],
      })),
    })),
  }))

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Temporadas</h1>
        <p className="mt-1 text-sm text-gray-500">Gestión de temporadas, equipos inscritos y estructura de competencias</p>
      </div>
      <SeasonsManager
        seasons={seasonsWithComps}
        teams={teams}
        leagueId={league.id}
        allMatches={allMatches}
      />
    </div>
  )
}
