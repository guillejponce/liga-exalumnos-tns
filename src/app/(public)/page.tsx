import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'

interface TeamInfo {
  name: string
  short_name: string
  crest_path: string | null
}

interface MatchDisplay {
  id: string
  round: number | null
  kickoff_at: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team: TeamInfo
  away_team: TeamInfo
}

export default async function HomePage() {
  const supabase = await createClient()
  const league = await getLeague()

  let recentMatches: MatchDisplay[] = []
  let teamCount = 0
  let playerCount = 0
  let playedCount = 0
  let goalCount = 0

  if (league) {
    const [{ count: tc }, { count: pc }] = await Promise.all([
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
    ])
    teamCount = tc ?? 0
    playerCount = pc ?? 0

    const activeSeason = await getActiveSeasonForLeague(league.id)

    if (activeSeason) {
      const { data: stages } = await supabase
        .from('stages')
        .select('id, competitions!inner(season_id)')
        .eq('competitions.season_id', activeSeason.id)

      if (stages && stages.length > 0) {
        const stageIds = stages.map((s) => s.id)

        const [{ data: matchesRaw }, { count: played }] = await Promise.all([
          supabase
            .from('matches')
            .select(`
              id, round, kickoff_at, status, home_score, away_score,
              home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
              away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
            `)
            .in('stage_id', stageIds)
            .order('kickoff_at', { ascending: false, nullsFirst: false })
            .limit(6),
          supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .in('stage_id', stageIds)
            .eq('status', 'played'),
        ])

        playedCount = played ?? 0

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recentMatches = (matchesRaw ?? []).map((m: any) => {
          const ht = Array.isArray(m.home_team_season?.team) ? m.home_team_season.team[0] : m.home_team_season?.team
          const at = Array.isArray(m.away_team_season?.team) ? m.away_team_season.team[0] : m.away_team_season?.team
          return {
            id: m.id,
            round: m.round,
            kickoff_at: m.kickoff_at,
            status: m.status,
            home_score: m.home_score,
            away_score: m.away_score,
            home_team: ht ?? { name: '?', short_name: '?', crest_path: null },
            away_team: at ?? { name: '?', short_name: '?', crest_path: null },
          }
        })

        // Count total goals from played matches
        const { data: playedMatches } = await supabase
          .from('matches')
          .select('home_score, away_score')
          .in('stage_id', stageIds)
          .eq('status', 'played')

        if (playedMatches) {
          goalCount = playedMatches.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0)
        }
      }
    }
  }

  return (
    <div>
      <section className="border-b border-navy-800 bg-navy-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Liga <span className="text-league-green">Nico Sabag</span>
            </h1>
            <p className="mt-4 text-lg text-navy-300">
              Liga de fútbol de exalumnos Newland
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Partidos</h2>
              <p className="mt-1 text-sm text-navy-400">Últimos y próximos encuentros</p>
            </div>
            <Link href="/fixture" className="text-sm text-league-green hover:underline">Ver fixture completo</Link>
          </div>

          {recentMatches.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
              <p className="text-sm text-navy-500">No hay partidos cargados aún.</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-navy-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Equipos', value: teamCount, href: '/equipos' },
              { label: 'Jugadores', value: playerCount, href: '/equipos' },
              { label: 'Partidos jugados', value: playedCount, href: '/fixture' },
              { label: 'Goles', value: goalCount, href: '/goleadores' },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="rounded-xl border border-navy-800 bg-navy-900 p-6 text-center transition-colors hover:border-league-green/30">
                <p className="text-3xl font-bold text-league-green">{stat.value}</p>
                <p className="mt-1 text-sm text-navy-400">{stat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function MatchCard({ match }: { match: MatchDisplay }) {
  const isPlayed = match.status === 'played'
  const dateStr = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Por definir'

  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        {match.round && <span className="text-xs text-navy-500">Fecha {match.round}</span>}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isPlayed ? 'bg-league-green/10 text-league-green' : 'bg-navy-800 text-navy-400'}`}>
          {isPlayed ? 'Jugado' : dateStr}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <div className="mx-auto w-fit">
            <TeamCrest crestPath={match.home_team.crest_path} name={match.home_team.short_name} size={40} />
          </div>
          <p className="mt-2 text-xs font-medium text-navy-200">{match.home_team.short_name}</p>
        </div>
        <div className="px-3 text-center">
          {isPlayed ? (
            <p className="text-xl font-bold text-white">{match.home_score} - {match.away_score}</p>
          ) : (
            <p className="text-sm font-medium text-navy-500">vs</p>
          )}
        </div>
        <div className="flex-1 text-center">
          <div className="mx-auto w-fit">
            <TeamCrest crestPath={match.away_team.crest_path} name={match.away_team.short_name} size={40} />
          </div>
          <p className="mt-2 text-xs font-medium text-navy-200">{match.away_team.short_name}</p>
        </div>
      </div>
    </div>
  )
}
