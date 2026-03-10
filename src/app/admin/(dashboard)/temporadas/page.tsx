import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()

  const [{ data: seasons }, { data: teams }] = await Promise.all([
    supabase
      .from('seasons')
      .select('*, team_seasons(id, team:teams(id, name, short_name))')
      .eq('league_id', league.id)
      .order('year', { ascending: false })
      .order('semester', { ascending: false }),
    supabase
      .from('teams')
      .select('id, name, short_name')
      .eq('league_id', league.id)
      .order('name'),
  ])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Temporadas</h1>
        <p className="mt-1 text-sm text-gray-500">Gestión de temporadas y equipos inscritos</p>
      </div>
      <SeasonsManager seasons={seasons ?? []} teams={teams ?? []} leagueId={league.id} />
    </div>
  )
}
