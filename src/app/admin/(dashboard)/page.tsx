import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'

export default async function AdminDashboard() {
  const league = await getLeague()
  let teamCount = 0
  let playerCount = 0
  let matchCount = 0
  let seasonName = 'Sin temporada activa'

  if (league) {
    const supabase = createAdminClient()

    const [{ count: tc }, { count: pc }] = await Promise.all([
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
    ])

    teamCount = tc ?? 0
    playerCount = pc ?? 0

    const activeSeason = await getActiveSeasonForLeague(league.id)
    if (activeSeason) {
      seasonName = activeSeason.name

      const { data: stages } = await supabase
        .from('stages')
        .select('id, competitions!inner(season_id)')
        .eq('competitions.season_id', activeSeason.id)

      if (stages && stages.length > 0) {
        const { count: mc } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .in('stage_id', stages.map((s) => s.id))
          .eq('status', 'played')

        matchCount = mc ?? 0
      }
    }
  }

  const stats = [
    { label: 'Equipos', value: teamCount.toString() },
    { label: 'Jugadores', value: playerCount.toString() },
    { label: 'Partidos jugados', value: matchCount.toString() },
    { label: 'Temporada', value: seasonName, isText: true },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        {league ? `Liga: ${league.name}` : 'No se encontró la liga'}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className={`mt-2 ${stat.isText ? 'text-lg' : 'text-3xl'} font-bold text-navy-900`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {!league && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800">Configuración inicial</h2>
          <p className="mt-2 text-sm text-amber-700">
            Para empezar, necesitás crear una liga en Supabase. Insertá un registro en la tabla <code className="rounded bg-amber-100 px-1">leagues</code> con nombre y slug.
          </p>
        </div>
      )}
    </div>
  )
}
