import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLeague } from '@/lib/league'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'

export const metadata: Metadata = { title: 'Equipos' }

export default async function EquiposPage() {
  const league = await getLeague()
  let teams: TeamDisplay[] = []

  if (league) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('teams')
      .select('*, team_players(count)')
      .eq('league_id', league.id)
      .order('name')

    teams = (data ?? []) as unknown as TeamDisplay[]
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Equipos</h1>
        <p className="mt-1 text-sm text-navy-400">Equipos participantes de la liga</p>
      </div>

      {teams.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/equipos/${team.id}`}
              className="group flex items-center gap-4 rounded-xl border border-navy-800 bg-navy-900 p-6 transition-colors hover:border-league-green/30"
            >
              <TeamCrest crestPath={team.crest_path} name={team.short_name} size={72} className="rounded-xl" />
              <div>
                <h3 className="font-semibold text-white">{team.name}</h3>
                <p className="text-sm text-navy-400">
                  {team.team_players?.[0]?.count ?? 0} jugadores
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
          No hay equipos registrados aún
        </div>
      )}
    </div>
  )
}

interface TeamDisplay {
  id: string
  name: string
  short_name: string
  crest_path: string | null
  team_players: { count: number }[]
}
