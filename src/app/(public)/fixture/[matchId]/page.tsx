import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMatchEvents } from '@/actions/match-events'
import TeamCrest from '@/components/public/TeamCrest'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Eventos del partido' }

type TeamInfo = {
  name: string
  short_name: string
  crest_path: string | null
}

function formatPlayerName(ev: { player: { first_name: string; last_name: string | null; nickname: string | null } }) {
  if (ev.player.nickname) {
    return `${ev.player.first_name} "${ev.player.nickname}"`
  }
  return `${ev.player.first_name} ${ev.player.last_name ?? ''}`.trim()
}

function extractTeamInfo(teamValue: unknown): TeamInfo | null {
  const t = Array.isArray(teamValue) ? teamValue[0] : teamValue
  if (!t || typeof t !== 'object') return null

  const obj = t as Record<string, unknown>
  const name = typeof obj.name === 'string' ? obj.name : null
  const short_name = typeof obj.short_name === 'string' ? obj.short_name : null
  const crest_path = typeof obj.crest_path === 'string' ? obj.crest_path : null

  if (!name || !short_name) return null
  return { name, short_name, crest_path }
}

export default async function FixtureMatchPage({ params }: { params: { matchId: string } }) {
  const { matchId } = await params

  const supabase = await createClient()

  const { data: matchRaw } = await supabase
    .from('matches')
    .select(`
      id, status, home_score, away_score, kickoff_at,
      home_team_season:team_season!matches_home_team_season_id_fkey(id, team:teams(name, short_name, crest_path)),
      away_team_season:team_season!matches_away_team_season_id_fkey(id, team:teams(name, short_name, crest_path))
    `)
    .eq('id', matchId)
    .single()

  const homeTeamSeasonId: string | null = (() => {
    const idVal = (matchRaw as unknown as { home_team_season?: { id?: unknown } | null } | null)?.home_team_season?.id
    return typeof idVal === 'string' ? idVal : null
  })()

  const awayTeamSeasonId: string | null = (() => {
    const idVal = (matchRaw as unknown as { away_team_season?: { id?: unknown } | null } | null)?.away_team_season?.id
    return typeof idVal === 'string' ? idVal : null
  })()

  const homeTeam: TeamInfo | null = (() => {
    const ht = (matchRaw as unknown as { home_team_season?: { team?: unknown } | null } | null)?.home_team_season?.team
    return extractTeamInfo(ht)
  })()

  const awayTeam: TeamInfo | null = (() => {
    const at = (matchRaw as unknown as { away_team_season?: { team?: unknown } | null } | null)?.away_team_season?.team
    return extractTeamInfo(at)
  })()

  const eventsRes = await getMatchEvents(matchId)
  const goalEvents = (eventsRes.data ?? []).filter((e) => e.type === 'goal')

  const homeGoalCount = homeTeamSeasonId ? goalEvents.filter((e) => e.team_season_id === homeTeamSeasonId).length : 0
  const awayGoalCount = awayTeamSeasonId ? goalEvents.filter((e) => e.team_season_id === awayTeamSeasonId).length : 0

  const isPlayed = matchRaw?.status === 'played'
  const kickoffDate = matchRaw?.kickoff_at
    ? new Date(matchRaw.kickoff_at).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="border-b border-navy-800/50 bg-navy-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/fixture"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-300 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span>
            Volver al fixture
          </Link>
        </div>
      </div>

      {/* Hero scorecard */}
        <div className="relative overflow-hidden border-b border-navy-800 bg-linear-to-b from-navy-900 to-navy-950 py-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          {/* Date */}
          {kickoffDate && (
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-navy-400 sm:text-sm">
              {kickoffDate}
            </p>
          )}

          {/* Teams + score */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
            {/* Home */}
            <div className="flex flex-1 items-center gap-4 sm:flex-row-reverse sm:justify-end">
              <div className="flex shrink-0">
                {homeTeam ? (
                  <TeamCrest crestPath={homeTeam.crest_path} name={homeTeam.short_name} size={64} className="rounded-xl" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-xl bg-navy-800 text-navy-500">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0 text-center sm:text-right">
                <h2 className="truncate text-base font-bold text-white sm:text-lg">{homeTeam?.name ?? 'Equipo local'}</h2>
                <p className="text-xs text-navy-400">{homeTeam?.short_name ?? ''}</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-navy-700/50 bg-navy-900/80 px-6 py-4 backdrop-blur-sm sm:px-8">
              <span className="text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                {matchRaw?.home_score ?? '-'}
              </span>
              <span className="text-navy-500">–</span>
              <span className="text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                {matchRaw?.away_score ?? '-'}
              </span>
            </div>

            {/* Away */}
            <div className="flex flex-1 items-center gap-4 sm:justify-start">
              <div className="flex shrink-0">
                {awayTeam ? (
                  <TeamCrest crestPath={awayTeam.crest_path} name={awayTeam.short_name} size={64} className="rounded-xl" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-xl bg-navy-800 text-navy-500">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <h2 className="truncate text-base font-bold text-white sm:text-lg">{awayTeam?.name ?? 'Equipo visitante'}</h2>
                <p className="text-xs text-navy-400">{awayTeam?.short_name ?? ''}</p>
              </div>
            </div>
          </div>

          {!isPlayed && (
            <p className="mt-4 text-center text-sm font-medium text-league-green">Partido programado</p>
          )}
        </div>
      </div>

      {/* Goals section */}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-400">Goles</h3>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-navy-800/80 px-2.5 py-1 font-medium text-navy-300">
              {homeTeam?.short_name ?? 'Local'}: {homeGoalCount}
            </span>
            <span className="rounded-full bg-navy-800/80 px-2.5 py-1 font-medium text-navy-300">
              {awayTeam?.short_name ?? 'Visita'}: {awayGoalCount}
            </span>
          </div>
        </div>

        {goalEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy-700 bg-navy-900/50 py-12 text-center">
            <span className="text-4xl" aria-hidden>⚽</span>
            <p className="mt-3 text-sm text-navy-500">No hay goles registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goalEvents.map((ev) => {
              const isAwayGoal = awayTeamSeasonId ? ev.team_season_id === awayTeamSeasonId : false
              const minuteLabel = ev.minute !== null ? `${ev.minute}'` : '—'
              return (
                <div
                  key={ev.id}
                  className={`flex w-full ${isAwayGoal ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex w-full max-w-full items-center gap-3 rounded-xl border border-navy-700/50 bg-navy-900/60 px-4 py-3 transition-colors hover:border-navy-600/50 sm:max-w-sm ${
                      isAwayGoal ? 'flex-row-reverse sm:flex-row-reverse' : ''
                    }`}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xl" aria-hidden>⚽</span>
                      <TeamCrest
                        crestPath={ev.team.crest_path}
                        name={ev.team.short_name ?? ev.team.name}
                        size={32}
                        className="rounded-lg"
                      />
                    </div>
                    <div className={`min-w-0 flex-1 ${isAwayGoal ? 'text-right' : ''}`}>
                      <p className="truncate text-sm font-semibold text-white">{formatPlayerName(ev)}</p>
                      <p className="text-xs text-navy-400">{ev.team.short_name ?? ev.team.name}</p>
                    </div>
                    <div className="flex shrink-0">
                      <span className="rounded-lg bg-league-green/20 px-2.5 py-1 text-xs font-bold text-league-green">
                        {minuteLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

