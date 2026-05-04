import Navbar from '@/components/public/Navbar'
import PushSubscribeButton from '@/components/public/PushSubscribeButton'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import { createAdminClient } from '@/lib/supabase/admin'

async function getTeamsForActiveSeason() {
  const league = await getLeague()
  if (!league) return []

  const season = await getActiveSeasonForLeague(league.id)
  if (!season) return []

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('team_season')
    .select('team:teams(id, name)')
    .eq('season_id', season.id)

  if (!data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((ts: any) => {
    const team = Array.isArray(ts.team) ? ts.team[0] : ts.team
    return { id: team?.id ?? '', name: team?.name ?? '?' }
  }).filter((t: { id: string }) => t.id)
}

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const teams = await getTeamsForActiveSeason()

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <Navbar />
      <main className="flex-1">{children}</main>
      <div className="sticky bottom-0 z-40 border-t border-navy-800 bg-navy-900/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-sm">
          <PushSubscribeButton teams={teams} />
        </div>
      </div>
      <footer className="border-t border-navy-800 bg-navy-900 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-navy-400">
          © {new Date().getFullYear()} Liga Nico Sabag — Exalumnos Newland
        </div>
      </footer>
    </div>
  )
}
