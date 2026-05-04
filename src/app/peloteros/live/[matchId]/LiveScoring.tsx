'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'
import { updateMatchScore, updateMatchMvp } from '@/actions/matches'
import {
  createMatchEvent,
  deleteMatchEvent,
  type MatchEventDisplay,
  type PlayerOption,
} from '@/actions/match-events'

type EventType = 'goal' | 'assist' | 'yellow' | 'red'

const EVENT_ICONS: Record<EventType, string> = {
  goal: '⚽',
  assist: '👟',
  yellow: '🟨',
  red: '🟥',
}

interface TeamInfo {
  name: string
  short_name: string
  crest_path: string | null
}

interface Props {
  matchId: string
  status: string
  homeScore: number
  awayScore: number
  mvpPlayerId: string | null
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  homeTeamSeasonId: string
  awayTeamSeasonId: string
  initialEvents: MatchEventDisplay[]
  players: PlayerOption[]
}

type ActivePanel = 'none' | 'event' | 'mvp'

export default function LiveScoring({
  matchId,
  status: initialStatus,
  homeScore: initialHomeScore,
  awayScore: initialAwayScore,
  mvpPlayerId: initialMvpId,
  homeTeam,
  awayTeam,
  homeTeamSeasonId,
  awayTeamSeasonId,
  initialEvents,
  players,
}: Props) {
  const router = useRouter()
  const [hScore, setHScore] = useState(initialHomeScore)
  const [aScore, setAScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [events, setEvents] = useState(initialEvents)
  const [mvpId, setMvpId] = useState(initialMvpId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('none')

  const [eventType, setEventType] = useState<EventType>('goal')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [minute, setMinute] = useState('')
  const [playerSearch, setPlayerSearch] = useState('')
  const [mvpSearch, setMvpSearch] = useState('')

  const homePlayers = useMemo(
    () => players.filter((p) => p.team_season_id === homeTeamSeasonId),
    [players, homeTeamSeasonId]
  )
  const awayPlayers = useMemo(
    () => players.filter((p) => p.team_season_id === awayTeamSeasonId),
    [players, awayTeamSeasonId]
  )
  const allPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers])

  const goalEvents = events.filter((e) => e.type === 'goal')
  const homeGoals = goalEvents.filter((e) => e.team_season_id === homeTeamSeasonId)
  const awayGoals = goalEvents.filter((e) => e.team_season_id === awayTeamSeasonId)
  const otherEvents = events.filter((e) => e.type !== 'goal')

  function getPlayerLabel(p: PlayerOption) {
    const num = p.shirt_number ? `#${p.shirt_number} ` : ''
    const name = p.nickname
      ? `${p.first_name} "${p.nickname}"`
      : `${p.first_name} ${p.last_name ?? ''}`
    return `${num}${name.trim()}`
  }

  function filterPlayers(list: PlayerOption[], query: string) {
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((p) => {
      const label = getPlayerLabel(p).toLowerCase()
      return label.includes(q)
    })
  }

  const saveScore = useCallback(async (h: number, a: number, newStatus?: string, skipPush?: boolean) => {
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('id', matchId)
    fd.set('home_score', String(h))
    fd.set('away_score', String(a))
    fd.set('status', newStatus ?? status)
    if (skipPush) fd.set('skip_push', '1')
    const res = await updateMatchScore(fd)
    if (res.error) setError(res.error)
    else if (newStatus) setStatus(newStatus)
    setSaving(false)
  }, [matchId, status])

  function adjustScore(side: 'home' | 'away', delta: number) {
    if (side === 'home') {
      const next = Math.max(0, hScore + delta)
      setHScore(next)
      saveScore(next, aScore)
    } else {
      const next = Math.max(0, aScore + delta)
      setAScore(next)
      saveScore(hScore, next)
    }
  }

  async function toggleFinalize() {
    const next = status === 'played' ? 'scheduled' : 'played'
    await saveScore(hScore, aScore, next)
    router.refresh()
  }

  async function handleAddEvent() {
    if (!selectedPlayer) return
    const [teamSeasonId, playerId] = selectedPlayer.split(':')
    if (!teamSeasonId || !playerId) return

    setSaving(true)
    setError(null)
    const min = minute ? parseInt(minute) : null

    if (eventType === 'goal') {
      const isHome = teamSeasonId === homeTeamSeasonId
      const newH = isHome ? hScore + 1 : hScore
      const newA = isHome ? aScore : aScore + 1
      setHScore(newH)
      setAScore(newA)
      await saveScore(newH, newA, undefined, true)
    }

    const res = await createMatchEvent(matchId, teamSeasonId, playerId, eventType, min)
    if (res.error) {
      setError(res.error)
    } else {
      setSelectedPlayer('')
      setMinute('')
      router.refresh()
      const { getMatchEvents } = await import('@/actions/match-events')
      const evRes = await getMatchEvents(matchId)
      setEvents(evRes.data ?? [])
    }
    setSaving(false)
  }

  async function handleDeleteEvent(eventId: string) {
    setSaving(true)
    const res = await deleteMatchEvent(eventId)
    if (res.error) {
      setError(res.error)
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      router.refresh()
    }
    setSaving(false)
  }

  async function handleMvpSelect(playerId: string | null) {
    setSaving(true)
    setError(null)
    const res = await updateMatchMvp(matchId, playerId)
    if (res.error) setError(res.error)
    else {
      setMvpId(playerId)
      setActivePanel('none')
    }
    setSaving(false)
  }

  const mvpPlayer = allPlayers.find((p) => p.player_id === mvpId)

  return (
    <div className="space-y-4 pb-8">
      {/* Back link */}
      <Link
        href="/peloteros"
        className="inline-flex items-center gap-1 text-xs text-navy-400 transition-colors hover:text-white"
      >
        <span>←</span> Volver a partidos
      </Link>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      {/* Score board */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900 p-4">
        <div className="grid grid-cols-3 gap-2">
          {/* Home */}
          <div className="flex flex-col items-center">
            <TeamCrest crestPath={homeTeam.crest_path} name={homeTeam.short_name} size={40} className="mb-1 rounded-lg" />
            <span className="mb-2 text-center text-xs font-bold uppercase text-navy-300">{homeTeam.short_name}</span>
            <div className="text-4xl font-extrabold tabular-nums text-white">{hScore}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => adjustScore('home', -1)}
                disabled={hScore <= 0 || saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-lg font-bold text-navy-400 transition-colors active:bg-navy-700 disabled:opacity-30"
              >
                −
              </button>
              <button
                onClick={() => adjustScore('home', 1)}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-league-green text-lg font-bold text-white transition-colors active:bg-league-green-dark disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          {/* vs */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-xl text-navy-600">vs</span>
            <span className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
              status === 'played'
                ? 'bg-league-green/20 text-league-green'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {status === 'played' ? 'Jugado' : 'En vivo'}
            </span>
            {saving && <span className="mt-1 text-[9px] text-navy-500 animate-pulse">Guardando...</span>}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center">
            <TeamCrest crestPath={awayTeam.crest_path} name={awayTeam.short_name} size={40} className="mb-1 rounded-lg" />
            <span className="mb-2 text-center text-xs font-bold uppercase text-navy-300">{awayTeam.short_name}</span>
            <div className="text-4xl font-extrabold tabular-nums text-white">{aScore}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => adjustScore('away', -1)}
                disabled={aScore <= 0 || saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-lg font-bold text-navy-400 transition-colors active:bg-navy-700 disabled:opacity-30"
              >
                −
              </button>
              <button
                onClick={() => adjustScore('away', 1)}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-league-green text-lg font-bold text-white transition-colors active:bg-league-green-dark disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Finalize button inside scoreboard */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={toggleFinalize}
            disabled={saving}
            className={`w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-colors active:scale-[0.98] disabled:opacity-50 ${
              status === 'played'
                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                : 'bg-league-green text-white'
            }`}
          >
            {status === 'played' ? 'Reabrir partido' : 'Finalizar partido ✓'}
          </button>
        </div>
      </div>

      {/* MVP display / select */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏅</span>
            <span className="text-xs font-semibold text-navy-300">MVP</span>
          </div>
          <button
            onClick={() => setActivePanel(activePanel === 'mvp' ? 'none' : 'mvp')}
            className="rounded-lg bg-navy-800 px-3 py-1.5 text-[11px] font-medium text-navy-300 transition-colors active:bg-navy-700"
          >
            {mvpPlayer ? 'Cambiar' : 'Elegir MVP'}
          </button>
        </div>
        {mvpPlayer && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
            <span className="text-xs font-semibold text-amber-300">{getPlayerLabel(mvpPlayer)}</span>
            <button
              onClick={() => handleMvpSelect(null)}
              className="text-[10px] text-amber-500/60 transition-colors hover:text-amber-400"
            >
              Quitar
            </button>
          </div>
        )}
        {activePanel === 'mvp' && (
          <div className="mt-2 space-y-1.5">
            <input
              type="text"
              value={mvpSearch}
              onChange={(e) => setMvpSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-xs text-white placeholder-navy-500"
            />
            <div className="max-h-52 overflow-y-auto rounded-lg border border-navy-700 bg-navy-800">
              {filterPlayers(homePlayers, mvpSearch).length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-navy-700 px-3 py-1.5">
                    <TeamCrest crestPath={homeTeam.crest_path} name={homeTeam.short_name} size={16} className="rounded" />
                    <span className="text-[10px] font-bold uppercase text-navy-300">{homeTeam.short_name}</span>
                  </div>
                  {filterPlayers(homePlayers, mvpSearch).map((p) => (
                    <button
                      key={p.player_id}
                      onClick={() => { handleMvpSelect(p.player_id); setMvpSearch('') }}
                      disabled={saving}
                      className="w-full px-3 py-2 text-left text-xs text-navy-200 transition-colors active:bg-navy-600 hover:bg-navy-700/50 disabled:opacity-50"
                    >
                      {getPlayerLabel(p)}
                    </button>
                  ))}
                </div>
              )}
              {filterPlayers(awayPlayers, mvpSearch).length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-navy-700 px-3 py-1.5">
                    <TeamCrest crestPath={awayTeam.crest_path} name={awayTeam.short_name} size={16} className="rounded" />
                    <span className="text-[10px] font-bold uppercase text-navy-300">{awayTeam.short_name}</span>
                  </div>
                  {filterPlayers(awayPlayers, mvpSearch).map((p) => (
                    <button
                      key={p.player_id}
                      onClick={() => { handleMvpSelect(p.player_id); setMvpSearch('') }}
                      disabled={saving}
                      className="w-full px-3 py-2 text-left text-xs text-navy-200 transition-colors active:bg-navy-600 hover:bg-navy-700/50 disabled:opacity-50"
                    >
                      {getPlayerLabel(p)}
                    </button>
                  ))}
                </div>
              )}
              {filterPlayers(homePlayers, mvpSearch).length === 0 && filterPlayers(awayPlayers, mvpSearch).length === 0 && mvpSearch && (
                <div className="px-3 py-3 text-center text-[10px] text-navy-500">Sin resultados</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActivePanel(activePanel === 'event' ? 'none' : 'event')}
          className={`flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-colors active:scale-[0.98] ${
            activePanel === 'event'
              ? 'bg-league-green text-white'
              : 'bg-navy-800 text-navy-300'
          }`}
        >
          + Evento
        </button>
      </div>

      {/* Event form (collapsible) */}
      {activePanel === 'event' && (
        <div className="rounded-xl border border-navy-700 bg-navy-900 p-4 space-y-3">
          {/* Event type selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {(['goal', 'assist', 'yellow', 'red'] as EventType[]).map((type) => (
              <button
                key={type}
                onClick={() => setEventType(type)}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors ${
                  eventType === type
                    ? 'bg-league-green/20 text-league-green ring-1 ring-league-green/40'
                    : 'bg-navy-800 text-navy-400'
                }`}
              >
                <span className="text-lg">{EVENT_ICONS[type]}</span>
                {type === 'goal' ? 'Gol' : type === 'assist' ? 'Asist.' : type === 'yellow' ? 'Amarilla' : 'Roja'}
              </button>
            ))}
          </div>

          {/* Player picker with search */}
          <div>
            <label className="block text-[10px] font-medium uppercase text-navy-400 mb-1">Jugador</label>
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => { setPlayerSearch(e.target.value); setSelectedPlayer('') }}
              placeholder="Buscar jugador..."
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 text-sm text-white placeholder-navy-500"
            />
            {selectedPlayer && (
              <div className="mt-1.5 flex items-center justify-between rounded-lg bg-league-green/15 px-3 py-2">
                <span className="text-xs font-semibold text-league-green">
                  {(() => {
                    const p = allPlayers.find((pl) => `${pl.team_season_id}:${pl.player_id}` === selectedPlayer)
                    return p ? getPlayerLabel(p) : ''
                  })()}
                </span>
                <button onClick={() => setSelectedPlayer('')} className="text-[10px] text-league-green/60">✕</button>
              </div>
            )}
            {!selectedPlayer && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-navy-700 bg-navy-800">
                {filterPlayers(homePlayers, playerSearch).length > 0 && (
                  <div>
                    <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-navy-700 px-3 py-1.5">
                      <TeamCrest crestPath={homeTeam.crest_path} name={homeTeam.short_name} size={16} className="rounded" />
                      <span className="text-[10px] font-bold uppercase text-navy-300">{homeTeam.short_name}</span>
                    </div>
                    {filterPlayers(homePlayers, playerSearch).map((p) => (
                      <button
                        key={`${p.team_season_id}:${p.player_id}`}
                        onClick={() => { setSelectedPlayer(`${p.team_season_id}:${p.player_id}`); setPlayerSearch('') }}
                        className="w-full px-3 py-2 text-left text-xs text-navy-200 transition-colors active:bg-navy-600 hover:bg-navy-700/50"
                      >
                        {getPlayerLabel(p)}
                      </button>
                    ))}
                  </div>
                )}
                {filterPlayers(awayPlayers, playerSearch).length > 0 && (
                  <div>
                    <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-navy-700 px-3 py-1.5">
                      <TeamCrest crestPath={awayTeam.crest_path} name={awayTeam.short_name} size={16} className="rounded" />
                      <span className="text-[10px] font-bold uppercase text-navy-300">{awayTeam.short_name}</span>
                    </div>
                    {filterPlayers(awayPlayers, playerSearch).map((p) => (
                      <button
                        key={`${p.team_season_id}:${p.player_id}`}
                        onClick={() => { setSelectedPlayer(`${p.team_season_id}:${p.player_id}`); setPlayerSearch('') }}
                        className="w-full px-3 py-2 text-left text-xs text-navy-200 transition-colors active:bg-navy-600 hover:bg-navy-700/50"
                      >
                        {getPlayerLabel(p)}
                      </button>
                    ))}
                  </div>
                )}
                {filterPlayers(homePlayers, playerSearch).length === 0 && filterPlayers(awayPlayers, playerSearch).length === 0 && playerSearch && (
                  <div className="px-3 py-3 text-center text-[10px] text-navy-500">Sin resultados</div>
                )}
              </div>
            )}
          </div>

          {/* Minute + Submit */}
          <div className="flex gap-2">
            <div className="w-20">
              <label className="block text-[10px] font-medium uppercase text-navy-400 mb-1">Min.</label>
              <input
                type="number"
                min={0}
                max={120}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 text-center text-sm text-white"
              />
            </div>
            <div className="flex-1 self-end">
              <button
                onClick={handleAddEvent}
                disabled={!selectedPlayer || saving}
                className="w-full rounded-xl bg-league-green py-2.5 text-sm font-bold text-white transition-colors active:bg-league-green-dark disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>

          {players.length === 0 && (
            <p className="text-[10px] text-amber-500">
              No hay jugadores en el plantel. Agrégalos desde Admin &gt; Jugadores.
            </p>
          )}
        </div>
      )}

      {/* Goals timeline */}
      {goalEvents.length > 0 && (
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-3">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-navy-400">Goles</h3>
          <div className="grid grid-cols-2 gap-x-3">
            {/* Home goals */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TeamCrest crestPath={homeTeam.crest_path} name={homeTeam.short_name} size={16} className="rounded" />
                <span className="text-[10px] font-bold text-navy-400">{homeTeam.short_name}</span>
              </div>
              {homeGoals.map((ev) => {
                const name = ev.player.nickname
                  ? `${ev.player.first_name} "${ev.player.nickname}"`
                  : `${ev.player.first_name} ${ev.player.last_name ?? ''}`
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-lg bg-navy-800/60 px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">⚽</span>
                      <span className="truncate text-xs text-white">{name.trim()}</span>
                      {ev.minute !== null && (
                        <span className="shrink-0 text-[10px] text-navy-500">{ev.minute}&apos;</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="ml-1 shrink-0 text-[10px] text-red-400/60 active:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              {homeGoals.length === 0 && (
                <span className="text-[10px] text-navy-600">—</span>
              )}
            </div>
            {/* Away goals */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TeamCrest crestPath={awayTeam.crest_path} name={awayTeam.short_name} size={16} className="rounded" />
                <span className="text-[10px] font-bold text-navy-400">{awayTeam.short_name}</span>
              </div>
              {awayGoals.map((ev) => {
                const name = ev.player.nickname
                  ? `${ev.player.first_name} "${ev.player.nickname}"`
                  : `${ev.player.first_name} ${ev.player.last_name ?? ''}`
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-lg bg-navy-800/60 px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">⚽</span>
                      <span className="truncate text-xs text-white">{name.trim()}</span>
                      {ev.minute !== null && (
                        <span className="shrink-0 text-[10px] text-navy-500">{ev.minute}&apos;</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="ml-1 shrink-0 text-[10px] text-red-400/60 active:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              {awayGoals.length === 0 && (
                <span className="text-[10px] text-navy-600">—</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other events */}
      {otherEvents.length > 0 && (
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-3">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-navy-400">Otros eventos</h3>
          <div className="space-y-1.5">
            {otherEvents.map((ev) => {
              const name = ev.player.nickname
                ? `${ev.player.first_name} "${ev.player.nickname}"`
                : `${ev.player.first_name} ${ev.player.last_name ?? ''}`
              return (
                <div key={ev.id} className="flex items-center justify-between rounded-lg bg-navy-800/60 px-2 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs">{EVENT_ICONS[ev.type as EventType] ?? '📋'}</span>
                    <span className="truncate text-xs text-white">{name.trim()}</span>
                    <span className="shrink-0 text-[10px] text-navy-600">({ev.team.short_name})</span>
                    {ev.minute !== null && (
                      <span className="shrink-0 text-[10px] text-navy-500">{ev.minute}&apos;</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="ml-1 shrink-0 text-[10px] text-red-400/60 active:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
