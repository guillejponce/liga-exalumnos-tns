import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: team } = await supabase.from('teams').select('name').eq('id', id).single()
  return { title: team?.name ?? 'Equipo' }
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (!team) notFound()

  const { data: roster } = await supabase
    .from('team_players')
    .select('*, player:players(*)')
    .eq('team_id', id)
    .order('shirt_number')

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/equipos" className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-league-green">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Equipos
      </Link>

      <div className="mt-6 flex items-center gap-5">
        <TeamCrest crestPath={team.crest_path} name={team.short_name} size={80} className="rounded-2xl" />
        <div>
          <h1 className="text-3xl font-bold text-white">{team.name}</h1>
          <p className="text-sm text-navy-400">{team.short_name}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Plantel</h2>

        {(!roster || roster.length === 0) ? (
          <div className="mt-4 rounded-xl border border-navy-800 bg-navy-900 px-4 py-12 text-center text-sm text-navy-500">
            No hay jugadores registrados en este equipo
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-navy-800">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-900 text-xs font-semibold uppercase tracking-wider text-navy-400">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Jugador</th>
                  <th className="px-4 py-3 text-center">Cap.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {roster.map((tp) => (
                  <tr key={tp.id} className="bg-navy-900/50 hover:bg-navy-800/50">
                    <td className="px-4 py-3 text-center text-sm font-bold text-navy-300">
                      {tp.shirt_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {tp.player.first_name} {tp.player.last_name}
                      {tp.player.nickname && (
                        <span className="ml-1 text-navy-400">&quot;{tp.player.nickname}&quot;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {tp.is_captain && <span className="text-league-green font-bold">C</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
