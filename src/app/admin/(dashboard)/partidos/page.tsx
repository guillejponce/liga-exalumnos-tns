import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import MatchesManager from './MatchesManager'
import SeasonPicker from './SeasonPicker'

export const metadata = { title: 'Partidos' }

export default async function PartidosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>
}) {
  const league = await getLeague()

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500">No se encontró la liga.</p>
      </div>
    )
  }

  const supabase = createAdminClient()

  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, name, year, semester, is_active')
    .eq('league_id', league.id)
    .order('year', { ascending: false })
    .order('semester', { ascending: false })

  const seasons = allSeasons ?? []

  if (seasons.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">No hay temporadas registradas.</p>
          <p className="mt-1 text-sm text-gray-400">Crea una temporada en la sección Temporadas para gestionar partidos.</p>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const activeSeason = await getActiveSeasonForLeague(league.id)
  const selectedId = params.seasonId ?? activeSeason?.id ?? seasons[0].id
  const currentSeason = seasons.find((s) => s.id === selectedId) ?? seasons[0]

  const [competitionsRes, { data: teamSeasons }] = await Promise.all([
    supabase
      .from('competitions')
      .select('*, stages(*)')
      .eq('season_id', currentSeason.id)
      .order('created_at'),
    supabase
      .from('team_season')
      .select('*, team:teams(*)')
      .eq('season_id', currentSeason.id),
  ])

  const competitions = competitionsRes.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageIds = competitions.flatMap((c: any) =>
    (c.stages ?? []).map((s: { id: string }) => s.id)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stageGroupsMap: Record<string, any[]> = {}
  if (stageIds.length > 0) {
    const sgRes = await supabase
      .from('stage_groups')
      .select('*')
      .in('stage_id', stageIds)

    if (!sgRes.error && sgRes.data) {
      for (const g of sgRes.data) {
        const sid = g.stage_id as string
        if (!stageGroupsMap[sid]) stageGroupsMap[sid] = []
        stageGroupsMap[sid].push(g)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitionsWithGroups = competitions.map((c: any) => ({
    ...c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stages: (c.stages ?? []).map((st: any) => ({
      ...st,
      stage_groups: stageGroupsMap[st.id] ?? [],
    })),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let matches: any[] = []
  if (stageIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        home_team_season:team_season!matches_home_team_season_id_fkey(*, team:teams(*)),
        away_team_season:team_season!matches_away_team_season_id_fkey(*, team:teams(*))
      `)
      .in('stage_id', stageIds)
      .order('round')
      .order('kickoff_at')

    matches = data ?? []
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        <SeasonPicker seasons={seasons} currentSeasonId={currentSeason.id} />
      </div>
      <MatchesManager
        seasonId={currentSeason.id}
        competitions={competitionsWithGroups}
        teamSeasons={teamSeasons ?? []}
        matches={matches}
      />
    </div>
  )
}
