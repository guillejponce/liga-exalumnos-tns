import { createAdminClient } from '@/lib/supabase/admin'
import { getLeague } from '@/lib/league'
import TeamsManager from './TeamsManager'

export const metadata = { title: 'Equipos' }

export default async function EquiposAdminPage() {
  const league = await getLeague()

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500">No se encontró la liga. Creá una liga primero en Supabase.</p>
      </div>
    )
  }

  const supabase = createAdminClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('*, team_players(count)')
    .eq('league_id', league.id)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
          <p className="mt-1 text-sm text-gray-500">{teams?.length ?? 0} equipos registrados</p>
        </div>
      </div>
      <TeamsManager teams={teams ?? []} leagueId={league.id} />
    </div>
  )
}
