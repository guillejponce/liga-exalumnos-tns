import { createClient } from '@/lib/supabase/server'
import { getLeague, getActiveSeasonForLeague } from '@/lib/league'
import Link from 'next/link'
import Image from 'next/image'
import TeamCrest from '@/components/public/TeamCrest'
import HeroCarousel from '@/components/public/HeroCarousel'

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
  let upcomingMatches: MatchDisplay[] = []
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

        const [{ data: playedRaw }, { data: scheduledRaw }, { count: played }] = await Promise.all([
          supabase
            .from('matches')
            .select(`
              id, round, kickoff_at, status, home_score, away_score,
              home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
              away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
            `)
            .in('stage_id', stageIds)
            .eq('status', 'played')
            .order('kickoff_at', { ascending: false, nullsFirst: false })
            .limit(4),
          supabase
            .from('matches')
            .select(`
              id, round, kickoff_at, status, home_score, away_score,
              home_team_season:team_season!matches_home_team_season_id_fkey(team:teams(name, short_name, crest_path)),
              away_team_season:team_season!matches_away_team_season_id_fkey(team:teams(name, short_name, crest_path))
            `)
            .in('stage_id', stageIds)
            .eq('status', 'scheduled')
            .order('kickoff_at', { ascending: true, nullsFirst: true })
            .limit(4),
          supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .in('stage_id', stageIds)
            .eq('status', 'played'),
        ])

        playedCount = played ?? 0

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapMatch = (m: any): MatchDisplay => {
          const ht = Array.isArray(m.home_team_season?.team) ? m.home_team_season.team[0] : m.home_team_season?.team
          const at = Array.isArray(m.away_team_season?.team) ? m.away_team_season.team[0] : m.away_team_season?.team
          return {
            id: m.id, round: m.round, kickoff_at: m.kickoff_at, status: m.status,
            home_score: m.home_score, away_score: m.away_score,
            home_team: ht ?? { name: '?', short_name: '?', crest_path: null },
            away_team: at ?? { name: '?', short_name: '?', crest_path: null },
          }
        }

        recentMatches = (playedRaw ?? []).map(mapMatch)
        upcomingMatches = (scheduledRaw ?? []).map(mapMatch)

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

  const lastResult = recentMatches[0] ?? null
  const nextMatch = upcomingMatches[0] ?? null

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <HeroCarousel />

        <div className="relative z-10 flex flex-col items-center px-4 text-center">
          <Image
            src="/assets/LNS blanco.png"
            alt="Liga Nico Sabag"
            width={240}
            height={240}
            className="h-36 w-auto drop-shadow-2xl sm:h-48 lg:h-56"
            priority
          />
          <p className="mt-6 max-w-md text-lg font-medium tracking-wide text-white/80 sm:text-xl">
            Liga de fútbol de exalumnos Newland
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/fixture"
              className="rounded-full bg-league-green px-8 py-3 text-sm font-bold text-white shadow-lg shadow-league-green/25 transition-all hover:bg-league-green-light hover:shadow-league-green/40"
            >
              Ver Fixture
            </Link>
            <Link
              href="/tabla"
              className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
            >
              Tabla de Posiciones
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="relative z-10 -mt-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-navy-700/50 bg-navy-900/90 p-4 shadow-2xl backdrop-blur-xl sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-navy-700/50 sm:p-0">
            {[
              { label: 'Equipos', value: teamCount, href: '/equipos' },
              { label: 'Jugadores', value: playerCount, href: '/equipos' },
              { label: 'Partidos', value: playedCount, href: '/fixture' },
              { label: 'Goles', value: goalCount, href: '/goleadores' },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="group flex flex-col items-center py-5 transition-colors hover:bg-white/5 sm:rounded-none sm:first:rounded-l-2xl sm:last:rounded-r-2xl"
              >
                <span className="text-3xl font-extrabold text-league-green transition-transform group-hover:scale-110 sm:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-navy-400">
                  {stat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Match (Last Result / Next Match) ── */}
      {(lastResult || nextMatch) && (
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {lastResult && (
                <div className="group relative overflow-hidden rounded-2xl border border-navy-700/50 bg-linear-to-br from-navy-900 to-navy-950 p-8">
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-league-green/5 blur-3xl transition-all group-hover:bg-league-green/10" />
                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-league-green">
                        Último resultado
                      </span>
                      {lastResult.round && (
                        <span className="rounded-full bg-navy-800 px-3 py-1 text-[11px] font-medium text-navy-300">
                          Fecha {lastResult.round}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center">
                        <div className="mx-auto w-fit">
                          <TeamCrest crestPath={lastResult.home_team.crest_path} name={lastResult.home_team.short_name} size={64} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{lastResult.home_team.short_name}</p>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl font-black text-white">{lastResult.home_score}</span>
                          <span className="text-lg text-navy-500">-</span>
                          <span className="text-4xl font-black text-white">{lastResult.away_score}</span>
                        </div>
                        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-league-green">Final</span>
                      </div>

                      <div className="flex-1 text-center">
                        <div className="mx-auto w-fit">
                          <TeamCrest crestPath={lastResult.away_team.crest_path} name={lastResult.away_team.short_name} size={64} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{lastResult.away_team.short_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {nextMatch && (
                <div className="group relative overflow-hidden rounded-2xl border border-navy-700/50 bg-linear-to-br from-navy-900 to-navy-950 p-8">
                  <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-league-green/5 blur-3xl transition-all group-hover:bg-league-green/10" />
                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-league-green">
                        Próximo partido
                      </span>
                      {nextMatch.round && (
                        <span className="rounded-full bg-navy-800 px-3 py-1 text-[11px] font-medium text-navy-300">
                          Fecha {nextMatch.round}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center">
                        <div className="mx-auto w-fit">
                          <TeamCrest crestPath={nextMatch.home_team.crest_path} name={nextMatch.home_team.short_name} size={64} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{nextMatch.home_team.short_name}</p>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-navy-400">vs</span>
                        {nextMatch.kickoff_at && (
                          <p className="mt-2 text-center text-xs text-navy-400">
                            {new Date(nextMatch.kickoff_at).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            <br />
                            <span className="text-sm font-semibold text-white">
                              {new Date(nextMatch.kickoff_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex-1 text-center">
                        <div className="mx-auto w-fit">
                          <TeamCrest crestPath={nextMatch.away_team.crest_path} name={nextMatch.away_team.short_name} size={64} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{nextMatch.away_team.short_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!nextMatch && lastResult && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-700/50 bg-navy-900/30 p-8 text-center">
                  <svg className="h-10 w-10 text-navy-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <p className="mt-3 text-sm text-navy-500">No hay próximos partidos programados</p>
                  <Link href="/fixture" className="mt-3 text-xs font-medium text-league-green hover:underline">Ver fixture</Link>
                </div>
              )}

              {!lastResult && nextMatch && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-700/50 bg-navy-900/30 p-8 text-center">
                  <svg className="h-10 w-10 text-navy-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
                  </svg>
                  <p className="mt-3 text-sm text-navy-500">Aún no hay resultados</p>
                  <Link href="/fixture" className="mt-3 text-xs font-medium text-league-green hover:underline">Ver fixture</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Recent Results ── */}
      {recentMatches.length > 1 && (
        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Resultados recientes</h2>
              <Link href="/fixture" className="text-sm font-medium text-league-green transition-colors hover:text-league-green-light">
                Ver todos →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentMatches.slice(1).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Matches ── */}
      {upcomingMatches.length > 1 && (
        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Próximos partidos</h2>
              <Link href="/fixture" className="text-sm font-medium text-league-green transition-colors hover:text-league-green-light">
                Ver fixture →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.slice(1).map((match) => (
                <UpcomingCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Quick Links ── */}
      <section className="border-t border-navy-800/50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-xl font-bold text-white">Explora la liga</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Tabla', desc: 'Posiciones', href: '/tabla', icon: TableIcon },
              { label: 'Fixture', desc: 'Calendario', href: '/fixture', icon: CalendarIcon },
              { label: 'Goleadores', desc: 'Ranking', href: '/goleadores', icon: TrophyIcon },
              { label: 'Equipos', desc: 'Planteles', href: '/equipos', icon: ShieldIcon },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col items-center rounded-2xl border border-navy-800/50 bg-navy-900/50 p-6 text-center transition-all hover:border-league-green/30 hover:bg-navy-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-league-green/10 text-league-green transition-all group-hover:bg-league-green/20 group-hover:scale-110">
                  <item.icon />
                </div>
                <span className="mt-4 text-sm font-bold text-white">{item.label}</span>
                <span className="mt-0.5 text-xs text-navy-400">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function MatchCard({ match }: { match: MatchDisplay }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-navy-800/50 bg-navy-900/60 px-5 py-4 transition-colors hover:border-navy-700">
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="text-right text-xs font-medium text-navy-200">{match.home_team.short_name}</span>
        <TeamCrest crestPath={match.home_team.crest_path} name={match.home_team.short_name} size={36} />
      </div>

      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className="text-lg font-bold text-white">{match.home_score}</span>
        <span className="text-xs text-navy-600">-</span>
        <span className="text-lg font-bold text-white">{match.away_score}</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <TeamCrest crestPath={match.away_team.crest_path} name={match.away_team.short_name} size={36} />
        <span className="text-xs font-medium text-navy-200">{match.away_team.short_name}</span>
      </div>
    </div>
  )
}

function UpcomingCard({ match }: { match: MatchDisplay }) {
  const dateStr = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Por definir'

  return (
    <div className="flex items-center gap-4 rounded-xl border border-navy-800/50 bg-navy-900/60 px-5 py-4 transition-colors hover:border-navy-700">
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="text-right text-xs font-medium text-navy-200">{match.home_team.short_name}</span>
        <TeamCrest crestPath={match.home_team.crest_path} name={match.home_team.short_name} size={36} />
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs font-bold text-navy-400">vs</span>
        <span className="mt-0.5 text-[10px] text-navy-500">{dateStr}</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <TeamCrest crestPath={match.away_team.crest_path} name={match.away_team.short_name} size={36} />
        <span className="text-xs font-medium text-navy-200">{match.away_team.short_name}</span>
      </div>
    </div>
  )
}

function TableIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
