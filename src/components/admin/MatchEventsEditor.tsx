'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getMatchEvents,
  getPlayersForMatch,
  createMatchEvent,
  deleteMatchEvent,
  type MatchEventDisplay,
  type PlayerOption,
} from '@/actions/match-events'

type EventType = 'goal' | 'assist' | 'yellow' | 'red'

const EVENT_LABELS: Record<EventType, string> = {
  goal: 'Gol',
  assist: 'Asistencia',
  yellow: 'Amarilla',
  red: 'Roja',
}

const EVENT_ICONS: Record<EventType, string> = {
  goal: '⚽',
  assist: '👟',
  yellow: '🟨',
  red: '🟥',
}

export default function MatchEventsEditor({
  matchId,
  homeTeamSeasonId,
  awayTeamSeasonId,
  homeTeamName,
  awayTeamName,
}: {
  matchId: string
  homeTeamSeasonId: string
  awayTeamSeasonId: string
  homeTeamName: string
  awayTeamName: string
}) {
  const [events, setEvents] = useState<MatchEventDisplay[]>([])
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOption, setSelectedOption] = useState('')
  const [eventType, setEventType] = useState<EventType>('goal')
  const [minute, setMinute] = useState<string>('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [eventsRes, playersRes] = await Promise.all([
      getMatchEvents(matchId),
      getPlayersForMatch(homeTeamSeasonId, awayTeamSeasonId),
    ])
    if (eventsRes.error) setError(eventsRes.error)
    if (playersRes.error) setError(playersRes.error)
    setEvents(eventsRes.data ?? [])
    setPlayers(playersRes.data ?? [])
    setLoading(false)
  }, [matchId, homeTeamSeasonId, awayTeamSeasonId])

  useEffect(() => { loadData() }, [loadData])

  const homePlayers = players.filter((p) => p.team_season_id === homeTeamSeasonId)
  const awayPlayers = players.filter((p) => p.team_season_id === awayTeamSeasonId)

  function getPlayerLabel(p: PlayerOption) {
    const num = p.shirt_number ? `#${p.shirt_number} ` : ''
    const name = p.nickname
      ? `${p.first_name} "${p.nickname}" ${p.last_name ?? ''}`
      : `${p.first_name} ${p.last_name ?? ''}`
    return `${num}${name.trim()}`
  }

  async function handleAdd() {
    if (!selectedOption) return
    const [teamSeasonId, playerId] = selectedOption.split(':')
    if (!teamSeasonId || !playerId) return

    setSaving(true)
    setError(null)
    const min = minute ? parseInt(minute) : null
    const result = await createMatchEvent(matchId, teamSeasonId, playerId, eventType, min)
    if (result.error) {
      setError(result.error)
    } else {
      setSelectedOption('')
      setMinute('')
      await loadData()
    }
    setSaving(false)
  }

  async function handleDelete(eventId: string) {
    const result = await deleteMatchEvent(eventId)
    if (result.error) {
      setError(result.error)
    } else {
      await loadData()
    }
  }

  if (loading) {
    return <div className="py-3 text-center text-xs text-gray-400">Cargando eventos...</div>
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <h4 className="text-xs font-semibold text-gray-600">Eventos del partido</h4>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {events.length > 0 && (
        <div className="space-y-1">
          {events.map((ev) => {
            const name = ev.player.nickname
              ? `${ev.player.first_name} "${ev.player.nickname}"`
              : `${ev.player.first_name} ${ev.player.last_name ?? ''}`

            return (
              <div key={ev.id} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{EVENT_ICONS[ev.type as EventType]}</span>
                  <span className="text-xs font-medium text-gray-800">{name.trim()}</span>
                  <span className="text-[10px] text-gray-400">({ev.team.short_name})</span>
                  {ev.minute !== null && (
                    <span className="text-[10px] text-gray-400">{ev.minute}&apos;</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-[10px] text-red-400 hover:text-red-600"
                >
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-medium text-gray-500">Jugador</label>
          <select
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">Seleccionar...</option>
            {homePlayers.length > 0 && (
              <optgroup label={homeTeamName}>
                {homePlayers.map((p) => (
                  <option key={`${p.team_season_id}:${p.player_id}`} value={`${p.team_season_id}:${p.player_id}`}>
                    {getPlayerLabel(p)}
                  </option>
                ))}
              </optgroup>
            )}
            {awayPlayers.length > 0 && (
              <optgroup label={awayTeamName}>
                {awayPlayers.map((p) => (
                  <option key={`${p.team_season_id}:${p.player_id}`} value={`${p.team_season_id}:${p.player_id}`}>
                    {getPlayerLabel(p)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-gray-500">Tipo</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="mt-0.5 rounded border border-gray-300 px-2 py-1 text-xs"
          >
            {(Object.keys(EVENT_LABELS) as EventType[]).map((type) => (
              <option key={type} value={type}>{EVENT_LABELS[type]}</option>
            ))}
          </select>
        </div>

        <div className="w-16">
          <label className="block text-[10px] font-medium text-gray-500">Min.</label>
          <input
            type="number"
            min={0}
            max={120}
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            placeholder="—"
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-center text-xs"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!selectedOption || saving}
          className="rounded bg-navy-900 px-3 py-1 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {saving ? '...' : 'Agregar'}
        </button>
      </div>

      {players.length === 0 && (
        <p className="text-[10px] text-amber-600">
          No hay jugadores en el plantel de estos equipos. Agrega jugadores en la sección Jugadores.
        </p>
      )}
    </div>
  )
}
