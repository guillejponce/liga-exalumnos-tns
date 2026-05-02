'use client'

import { useState, useMemo } from 'react'
import TeamCrest from '@/components/public/TeamCrest'

export interface TeamAllTime {
  teamId: string
  name: string
  short_name: string
  crest_path: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  seasons_played: number
}

export interface H2HMatch {
  seasonName: string
  kickoff_at: string | null
  homeTeamId: string
  awayTeamId: string
  home_score: number
  away_score: number
}

interface AwardItem {
  award_type: string
  teamName: string | null
  teamShortName: string | null
  teamCrestPath: string | null
  playerName: string | null
  notes: string | null
}

export interface SeasonAwardDisplay {
  seasonName: string
  year: number
  semester: number
  awards: AwardItem[]
}

interface Props {
  standings: TeamAllTime[]
  h2hMatches: H2HMatch[]
  awards: SeasonAwardDisplay[]
}

type Tab = 'tabla' | 'h2h' | 'palmares'

const TABLE_HEADERS = ['#', 'Equipo', 'Temp.', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'] as const

const AWARD_LABELS: Record<string, string> = {
  champion_gold: 'Campeón Oro',
  runner_up_gold: 'Subcampeón Oro',
  champion_silver: 'Campeón Plata',
  runner_up_silver: 'Subcampeón Plata',
  top_scorer: 'Goleador',
  best_goalkeeper: 'Mejor Arquero',
  mvp: 'MVP',
  fair_play: 'Fair Play',
}

const AWARD_ICONS: Record<string, string> = {
  champion_gold: '🥇',
  runner_up_gold: '🥈',
  champion_silver: '🥇',
  runner_up_silver: '🥈',
  top_scorer: '⚽',
  best_goalkeeper: '🧤',
  mvp: '⭐',
  fair_play: '🤝',
}

export default function HistoricoClient({ standings, h2hMatches, awards }: Props) {
  const [tab, setTab] = useState<Tab>('tabla')
  const [teamA, setTeamA] = useState<string>('')
  const [teamB, setTeamB] = useState<string>('')

  const teamOptions = useMemo(
    () => standings.map((t) => ({ id: t.teamId, name: t.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [standings],
  )

  const h2hFiltered = useMemo(() => {
    if (!teamA || !teamB || teamA === teamB) return []
    return h2hMatches.filter(
      (m) =>
        (m.homeTeamId === teamA && m.awayTeamId === teamB) ||
        (m.homeTeamId === teamB && m.awayTeamId === teamA),
    )
  }, [h2hMatches, teamA, teamB])

  const h2hSummary = useMemo(() => {
    if (h2hFiltered.length === 0) return null
    let winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0
    for (const m of h2hFiltered) {
      const scoreA = m.homeTeamId === teamA ? m.home_score : m.away_score
      const scoreB = m.homeTeamId === teamA ? m.away_score : m.home_score
      goalsA += scoreA
      goalsB += scoreB
      if (scoreA > scoreB) winsA++
      else if (scoreB > scoreA) winsB++
      else draws++
    }
    return { winsA, winsB, draws, goalsA, goalsB, total: h2hFiltered.length }
  }, [h2hFiltered, teamA, teamB])

  const teamAInfo = standings.find((t) => t.teamId === teamA)
  const teamBInfo = standings.find((t) => t.teamId === teamB)

  return (
    <>
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab('tabla')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'tabla'
              ? 'bg-league-green text-white'
              : 'border border-navy-700 text-navy-300 hover:border-navy-600 hover:text-white'
          }`}
        >
          Tabla histórica
        </button>
        <button
          onClick={() => setTab('h2h')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'h2h'
              ? 'bg-league-green text-white'
              : 'border border-navy-700 text-navy-300 hover:border-navy-600 hover:text-white'
          }`}
        >
          Head to Head
        </button>
        <button
          onClick={() => setTab('palmares')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'palmares'
              ? 'bg-league-green text-white'
              : 'border border-navy-700 text-navy-300 hover:border-navy-600 hover:text-white'
          }`}
        >
          Palmarés
        </button>
      </div>

      {tab === 'tabla' && (
        <div className="mt-8">
          {standings.length === 0 ? (
            <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
              No hay datos históricos aún
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-navy-800">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-navy-900">
                    {TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy-400 ${
                          header === 'Equipo' ? 'text-left' : 'text-center'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {standings.map((row, index) => (
                    <tr key={row.teamId} className="bg-navy-900/50 transition-colors hover:bg-navy-800/50">
                      <td className="px-4 py-3 text-center text-sm font-bold text-navy-300">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest crestPath={row.crest_path} name={row.short_name} size={64} />
                          <span className="text-sm font-medium text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.seasons_played}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.played}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.won}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.drawn}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.lost}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_for}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_against}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">
                        {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-league-green">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'h2h' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[180px] flex-1 max-w-xs">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-navy-500">
                Equipo 1
              </label>
              <select
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full appearance-none rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-white transition-colors focus:border-league-green focus:outline-none focus:ring-1 focus:ring-league-green"
              >
                <option value="">Seleccionar...</option>
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <span className="pb-2 text-sm font-bold text-navy-500">vs</span>

            <div className="min-w-[180px] flex-1 max-w-xs">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-navy-500">
                Equipo 2
              </label>
              <select
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full appearance-none rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-white transition-colors focus:border-league-green focus:outline-none focus:ring-1 focus:ring-league-green"
              >
                <option value="">Seleccionar...</option>
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {teamA && teamB && teamA === teamB && (
            <p className="text-sm text-yellow-500">Selecciona dos equipos distintos</p>
          )}

          {teamA && teamB && teamA !== teamB && h2hFiltered.length === 0 && (
            <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
              No hay enfrentamientos registrados entre estos equipos
            </div>
          )}

          {h2hSummary && teamAInfo && teamBInfo && (
            <>
              {/* Summary card */}
              <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <TeamCrest crestPath={teamAInfo.crest_path} name={teamAInfo.short_name} size={56} />
                    <span className="text-sm font-semibold text-white text-center">{teamAInfo.name}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex items-center gap-3 text-2xl font-bold">
                      <span className="text-league-green">{h2hSummary.winsA}</span>
                      <span className="text-navy-500">-</span>
                      <span className="text-navy-400">{h2hSummary.draws}</span>
                      <span className="text-navy-500">-</span>
                      <span className="text-league-green">{h2hSummary.winsB}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-navy-500">V - E - V</span>
                    <span className="mt-1 text-xs text-navy-400">{h2hSummary.total} partidos · {h2hSummary.goalsA}-{h2hSummary.goalsB} goles</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1">
                    <TeamCrest crestPath={teamBInfo.crest_path} name={teamBInfo.short_name} size={56} />
                    <span className="text-sm font-semibold text-white text-center">{teamBInfo.name}</span>
                  </div>
                </div>
              </div>

              {/* Match list */}
              <div className="space-y-2">
                {h2hFiltered.map((m, i) => {
                  const isHomeA = m.homeTeamId === teamA
                  const scoreA = isHomeA ? m.home_score : m.away_score
                  const scoreB = isHomeA ? m.away_score : m.home_score
                  const dateStr = m.kickoff_at
                    ? new Date(m.kickoff_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null

                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-navy-800 bg-navy-900 px-4 py-3 sm:px-6">
                      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                        <span className="text-right text-sm font-medium text-white">{teamAInfo.name}</span>
                        <TeamCrest crestPath={teamAInfo.crest_path} name={teamAInfo.short_name} size={36} />
                      </div>

                      <div className="mx-3 flex flex-col items-center sm:mx-6">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{scoreA}</span>
                          <span className="text-xs text-navy-600">-</span>
                          <span className="text-lg font-bold text-white">{scoreB}</span>
                        </div>
                        <div className="mt-0.5 flex flex-col items-center">
                          {dateStr && <span className="text-[10px] text-navy-500">{dateStr}</span>}
                          <span className="text-[10px] text-navy-600">{m.seasonName}</span>
                        </div>
                      </div>

                      <div className="flex flex-1 items-center gap-2 sm:gap-3">
                        <TeamCrest crestPath={teamBInfo.crest_path} name={teamBInfo.short_name} size={36} />
                        <span className="text-sm font-medium text-white">{teamBInfo.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!teamA && !teamB && (
            <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
              Selecciona dos equipos para ver su historial de enfrentamientos
            </div>
          )}
        </div>
      )}

      {tab === 'palmares' && (
        <div className="mt-8">
          {awards.length === 0 ? (
            <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
              No hay premios registrados aún
            </div>
          ) : (
            <div className="space-y-6">
              {awards.map((season, idx) => {
                const championGold = season.awards.find((a) => a.award_type === 'champion_gold')

                return (
                  <div key={idx} className="overflow-hidden rounded-xl border border-navy-800">
                    <div className="flex items-center gap-4 bg-navy-900 px-5 py-4">
                      {championGold?.teamCrestPath && (
                        <TeamCrest crestPath={championGold.teamCrestPath} name={championGold.teamShortName ?? ''} size={48} />
                      )}
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-white">{season.seasonName}</h3>
                        <p className="text-xs text-navy-400">{season.year} — Semestre {season.semester}</p>
                      </div>
                      {championGold && (
                        <div className="text-right">
                          <p className="text-xs text-navy-500">Campeón Oro</p>
                          <p className="text-sm font-semibold text-league-green">{championGold.teamName}</p>
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-navy-800/50 bg-navy-900/50">
                      {season.awards.map((award, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-3 px-5 py-2.5">
                          <span className="w-6 text-center text-sm">
                            {AWARD_ICONS[award.award_type] ?? '🏅'}
                          </span>
                          <span className="min-w-[7rem] text-xs font-medium text-navy-400">
                            {AWARD_LABELS[award.award_type] ?? award.award_type}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            {award.teamCrestPath && award.award_type !== 'champion_gold' && (
                              <TeamCrest crestPath={award.teamCrestPath} name={award.teamShortName ?? ''} size={24} />
                            )}
                            <span className="text-sm text-white">
                              {award.teamName ?? award.playerName ?? '—'}
                            </span>
                            {award.notes && (
                              <span className="text-xs text-navy-500">({award.notes})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
