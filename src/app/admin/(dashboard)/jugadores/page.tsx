import { createClient } from '@/lib/supabase/server'
import { getLeague } from '@/lib/league'
import PlayersManager from './PlayersManager'

export const metadata = { title: 'Jugadores' }

export default async function JugadoresAdminPage() {
  const league = await getLeague()

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500">No se encontró la liga.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase
      .from('players')
      .select('*, team_players(team_id, shirt_number, is_captain, team:teams(name, short_name))')
      .eq('league_id', league.id)
      .order('first_name'),
    supabase
      .from('teams')
      .select('id, name, short_name')
      .eq('league_id', league.id)
      .order('name'),
  ])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
        <p className="mt-1 text-sm text-gray-500">{players?.length ?? 0} jugadores registrados</p>
      </div>
      <PlayersManager players={players ?? []} teams={teams ?? []} leagueId={league.id} />
    </div>
  )
}
