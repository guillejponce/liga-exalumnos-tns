'use client'

import { useState } from 'react'
import {
  createStageGroup,
  deleteStageGroup,
  assignTeamToGroup,
  removeTeamFromGroup,
  generateRoundRobinMatches,
  generateKnockoutMatches,
  deleteAllStageMatches,
  updateMatchScore,
  deleteMatch,
} from '@/actions/matches'

// ─── Types ───

interface TeamSeasonRow {
  id: string
  team: { id: string; name: string; short_name: string }
}

interface GroupRow {
  id: string
  name: string
  stage_group_teams: { team_season_id: string }[]
}

interface MatchRow {
  id: string
  stage_id: string
  group_id: string | null
  home_team_season_id: string
  away_team_season_id: string
  home_score: number | null
  away_score: number | null
  status: string
  round: number | null
  kickoff_at: string | null
  home_team_season: TeamSeasonRow
  away_team_season: TeamSeasonRow
}

interface StageData {
  id: string
  name: string
  type: string
  stage_order: number
  rules: Record<string, unknown>
  stage_groups: GroupRow[]
}

interface Props {
  stage: StageData
  teamSeasons: TeamSeasonRow[]
  matches: MatchRow[]
  onError: (msg: string) => void
  onClose: () => void
}

// ─── Main Component ───

export default function StageEditor({ stage, teamSeasons, matches, onError, onClose }: Props) {
  const stageMatches = matches.filter((m) => m.stage_id === stage.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
          <p className="text-xs text-gray-500">
            {stage.type === 'league_table' && 'Liga — todos contra todos'}
            {stage.type === 'groups' && 'Fase de grupos'}
            {stage.type === 'knockout' && 'Eliminación directa'}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          Volver
        </button>
      </div>

      {stage.type === 'league_table' && (
        <LeagueTableEditor
          stage={stage}
          teamSeasons={teamSeasons}
          matches={stageMatches}
          onError={onError}
        />
      )}

      {stage.type === 'groups' && (
        <GroupsEditor
          stage={stage}
          teamSeasons={teamSeasons}
          matches={stageMatches}
          onError={onError}
        />
      )}

      {stage.type === 'knockout' && (
        <KnockoutEditor
          stage={stage}
          teamSeasons={teamSeasons}
          matches={stageMatches}
          onError={onError}
        />
      )}
    </div>
  )
}

// ─── League Table Editor ───

function LeagueTableEditor({
  stage,
  teamSeasons,
  matches,
  onError,
}: {
  stage: StageData
  teamSeasons: TeamSeasonRow[]
  matches: MatchRow[]
  onError: (msg: string) => void
}) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(() => {
    const idsInMatches = new Set<string>()
    matches.forEach((m) => { idsInMatches.add(m.home_team_season_id); idsInMatches.add(m.away_team_season_id) })
    return Array.from(idsInMatches)
  })
  const [generating, setGenerating] = useState(false)

  function toggleTeam(tsId: string) {
    setSelectedTeams((prev) =>
      prev.includes(tsId) ? prev.filter((id) => id !== tsId) : [...prev, tsId]
    )
  }

  async function handleGenerate() {
    if (selectedTeams.length < 2) { onError('Seleccioná al menos 2 equipos'); return }

    if (matches.length > 0) {
      if (!confirm(`Ya hay ${matches.length} partidos en esta etapa. ¿Querés borrarlos y generar de nuevo?`)) return
      const del = await deleteAllStageMatches(stage.id)
      if (del.error) { onError(del.error); return }
    }

    setGenerating(true)
    const result = await generateRoundRobinMatches(stage.id, selectedTeams)
    setGenerating(false)

    if (result.error) onError(result.error)
  }

  return (
    <div className="space-y-4">
      {/* Team selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">Equipos participantes</h4>
        <div className="flex flex-wrap gap-2">
          {teamSeasons.map((ts) => {
            const isSelected = selectedTeams.includes(ts.id)
            return (
              <button
                key={ts.id}
                onClick={() => toggleTeam(ts.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-navy-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ts.team.short_name}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{selectedTeams.length} equipos seleccionados</span>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedTeams.length < 2}
            className="rounded-lg bg-league-green px-4 py-1.5 text-xs font-medium text-white hover:bg-league-green-dark disabled:opacity-50"
          >
            {generating ? 'Generando...' : matches.length > 0 ? 'Regenerar fixture' : 'Generar fixture'}
          </button>
        </div>
      </div>

      {/* Matches list */}
      <MatchList matches={matches} onError={onError} />
    </div>
  )
}

// ─── Groups Editor ───

function GroupsEditor({
  stage,
  teamSeasons,
  matches,
  onError,
}: {
  stage: StageData
  teamSeasons: TeamSeasonRow[]
  matches: MatchRow[]
  onError: (msg: string) => void
}) {
  const [newGroupName, setNewGroupName] = useState('')
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    const result = await createStageGroup(stage.id, newGroupName.trim())
    if (result.error) onError(result.error)
    setNewGroupName('')
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('¿Eliminar este grupo y sus partidos?')) return
    const result = await deleteStageGroup(groupId)
    if (result.error) onError(result.error)
  }

  async function handleAssignTeam(groupId: string, teamSeasonId: string) {
    const result = await assignTeamToGroup(groupId, teamSeasonId)
    if (result.error) onError(result.error)
  }

  async function handleRemoveTeam(groupId: string, teamSeasonId: string) {
    const result = await removeTeamFromGroup(groupId, teamSeasonId)
    if (result.error) onError(result.error)
  }

  async function handleGenerateGroupMatches(groupId: string, teamIds: string[]) {
    if (teamIds.length < 2) { onError('Se necesitan al menos 2 equipos en el grupo'); return }

    const groupMatches = matches.filter((m) => m.group_id === groupId)
    if (groupMatches.length > 0) {
      if (!confirm(`Ya hay ${groupMatches.length} partidos en este grupo. Se borrarán los existentes del grupo.`)) return
      for (const m of groupMatches) {
        await deleteMatch(m.id)
      }
    }

    setGeneratingFor(groupId)
    const result = await generateRoundRobinMatches(stage.id, teamIds, groupId)
    setGeneratingFor(null)

    if (result.error) onError(result.error)
  }

  return (
    <div className="space-y-4">
      {/* Info about enrolled teams */}
      {teamSeasons.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          No hay equipos inscritos en esta temporada. Inscribí equipos en la pestaña &quot;Equipos inscritos&quot; primero.
        </div>
      )}

      {/* Create group */}
      <div className="flex items-center gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nombre del grupo (ej: Grupo A)"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGroup() }}}
        />
        <button
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim()}
          className="rounded-lg bg-league-green px-3 py-1.5 text-xs font-medium text-white hover:bg-league-green-dark disabled:opacity-50"
        >
          + Grupo
        </button>
      </div>

      {stage.stage_groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Creá los grupos para empezar a asignar equipos
        </div>
      )}

      {/* Groups grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {stage.stage_groups.map((group) => {
          const groupTeamIds = new Set(group.stage_group_teams.map((gt) => gt.team_season_id))
          const groupTeams = teamSeasons.filter((ts) => groupTeamIds.has(ts.id))
          const availableForGroup = teamSeasons.filter((ts) => !groupTeamIds.has(ts.id))
          const groupMatches = matches.filter((m) => m.group_id === group.id)

          return (
            <div key={group.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{groupTeams.length} equipos · {groupMatches.length} partidos</span>
                  <button onClick={() => handleDeleteGroup(group.id)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* Teams in group */}
                <div className="flex flex-wrap gap-1.5">
                  {groupTeams.map((ts) => (
                    <span key={ts.id} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-xs font-medium text-navy-700">
                      {ts.team.short_name}
                      <button onClick={() => handleRemoveTeam(group.id, ts.id)} className="text-navy-400 hover:text-red-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {groupTeams.length === 0 && (
                    <span className="text-xs text-gray-400">Sin equipos</span>
                  )}
                </div>

                {/* Add team to group */}
                {teamSeasons.length > 0 ? (
                  availableForGroup.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        id={`assign-${group.id}`}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>Agregar equipo...</option>
                        {availableForGroup.map((ts) => (
                          <option key={ts.id} value={ts.id}>{ts.team.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = document.getElementById(`assign-${group.id}`) as HTMLSelectElement
                          if (sel?.value) { handleAssignTeam(group.id, sel.value); sel.value = '' }
                        }}
                        className="rounded bg-navy-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-navy-800"
                      >
                        Agregar
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">Todos los equipos ya están en este grupo.</p>
                  )
                ) : null}

                {/* Generate matches for this group */}
                {groupTeams.length >= 2 && (
                  <button
                    onClick={() => handleGenerateGroupMatches(group.id, Array.from(groupTeamIds))}
                    disabled={generatingFor === group.id}
                    className="w-full rounded-lg border border-dashed border-league-green px-3 py-1.5 text-xs font-medium text-league-green hover:bg-league-green/5 disabled:opacity-50"
                  >
                    {generatingFor === group.id
                      ? 'Generando...'
                      : groupMatches.length > 0
                        ? `Regenerar partidos (${groupMatches.length} existentes)`
                        : 'Generar partidos del grupo'}
                  </button>
                )}

                {/* Group matches */}
                {groupMatches.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {groupMatches
                      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0))
                      .map((match) => (
                        <MatchRowInline key={match.id} match={match} onError={onError} />
                      ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Knockout Editor ───

function KnockoutEditor({
  stage,
  teamSeasons,
  matches,
  onError,
}: {
  stage: StageData
  teamSeasons: TeamSeasonRow[]
  matches: MatchRow[]
  onError: (msg: string) => void
}) {
  const [matchups, setMatchups] = useState<{ home: string; away: string }[]>([{ home: '', away: '' }])
  const [roundNum, setRoundNum] = useState(1)
  const [generating, setGenerating] = useState(false)

  function addMatchup() {
    setMatchups((prev) => [...prev, { home: '', away: '' }])
  }

  function removeMatchup(idx: number) {
    setMatchups((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMatchup(idx: number, field: 'home' | 'away', value: string) {
    setMatchups((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  async function handleGenerate() {
    const valid = matchups.filter((m) => m.home && m.away && m.home !== m.away)
    if (valid.length === 0) { onError('Definí al menos una llave válida'); return }

    setGenerating(true)
    const result = await generateKnockoutMatches(
      stage.id,
      valid.map((m) => ({ ...m, round: roundNum }))
    )
    setGenerating(false)

    if (result.error) { onError(result.error); return }
    setMatchups([{ home: '', away: '' }])
  }

  const rounds = new Map<number, MatchRow[]>()
  matches.forEach((m) => {
    const r = m.round ?? 1
    if (!rounds.has(r)) rounds.set(r, [])
    rounds.get(r)!.push(m)
  })
  const sortedRounds = [...rounds.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="space-y-4">
      {/* Create matchups */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Crear llaves</h4>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Ronda:</label>
            <input
              type="number"
              min={1}
              value={roundNum}
              onChange={(e) => setRoundNum(parseInt(e.target.value) || 1)}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          {matchups.map((mu, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={mu.home}
                onChange={(e) => updateMatchup(idx, 'home', e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="">Local...</option>
                {teamSeasons.map((ts) => (
                  <option key={ts.id} value={ts.id}>{ts.team.name}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-gray-400">vs</span>
              <select
                value={mu.away}
                onChange={(e) => updateMatchup(idx, 'away', e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="">Visitante...</option>
                {teamSeasons.map((ts) => (
                  <option key={ts.id} value={ts.id}>{ts.team.name}</option>
                ))}
              </select>
              {matchups.length > 1 && (
                <button onClick={() => removeMatchup(idx)} className="text-xs text-red-400 hover:text-red-600">x</button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={addMatchup} className="text-xs text-navy-600 hover:underline">
            + Agregar llave
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-league-green px-4 py-1.5 text-xs font-medium text-white hover:bg-league-green-dark disabled:opacity-50"
          >
            {generating ? 'Creando...' : 'Crear partidos'}
          </button>
        </div>
      </div>

      {/* Existing matches by round */}
      {sortedRounds.map(([round, roundMatches]) => (
        <div key={round} className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
            <span className="text-sm font-semibold text-gray-700">Ronda {round}</span>
            <span className="ml-2 text-xs text-gray-400">({roundMatches.length} partidos)</span>
          </div>
          <div className="divide-y divide-gray-50">
            {roundMatches.map((match) => (
              <MatchRowInline key={match.id} match={match} onError={onError} />
            ))}
          </div>
        </div>
      ))}

      {matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Definí las llaves arriba para crear los partidos de eliminación directa
        </div>
      )}
    </div>
  )
}

// ─── Match List (for league_table) ───

function MatchList({
  matches,
  onError,
}: {
  matches: MatchRow[]
  onError: (msg: string) => void
}) {
  const rounds = new Map<number, MatchRow[]>()
  matches.forEach((m) => {
    const r = m.round ?? 0
    if (!rounds.has(r)) rounds.set(r, [])
    rounds.get(r)!.push(m)
  })
  const sortedRounds = [...rounds.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="space-y-3">
      {matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Seleccioná equipos y generá el fixture
        </div>
      )}

      {sortedRounds.map(([round, roundMatches]) => (
        <div key={round} className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
            <span className="text-sm font-semibold text-gray-700">
              {round === 0 ? 'Sin fecha' : `Fecha ${round}`}
            </span>
            <span className="text-xs text-gray-400">{roundMatches.length} partidos</span>
          </div>
          <div className="divide-y divide-gray-50">
            {roundMatches.map((match) => (
              <MatchRowInline key={match.id} match={match} onError={onError} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Single Match Row ───

function MatchRowInline({
  match,
  onError,
}: {
  match: MatchRow
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)

  async function handleSave(formData: FormData) {
    formData.set('id', match.id)
    const result = await updateMatchScore(formData)
    if (result.error) { onError(result.error); return }
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este partido?')) return
    const result = await deleteMatch(match.id)
    if (result.error) onError(result.error)
  }

  if (editing) {
    return (
      <form action={handleSave} className="flex items-center gap-2 px-4 py-2">
        <span className="flex-1 text-right text-xs font-medium">{match.home_team_season.team.short_name}</span>
        <input name="home_score" type="number" min={0} defaultValue={match.home_score ?? 0} className="w-10 rounded border border-gray-300 px-1 py-0.5 text-center text-xs" />
        <span className="text-[10px] text-gray-400">-</span>
        <input name="away_score" type="number" min={0} defaultValue={match.away_score ?? 0} className="w-10 rounded border border-gray-300 px-1 py-0.5 text-center text-xs" />
        <span className="flex-1 text-xs font-medium">{match.away_team_season.team.short_name}</span>
        <select name="status" defaultValue={match.status} className="rounded border border-gray-300 px-1 py-0.5 text-[10px]">
          <option value="scheduled">Prog.</option>
          <option value="played">Jugado</option>
        </select>
        <button type="submit" className="rounded bg-league-green px-2 py-0.5 text-[10px] text-white">OK</button>
        <button type="button" onClick={() => setEditing(false)} className="text-[10px] text-gray-400">x</button>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50">
      <div className="flex flex-1 items-center gap-1.5">
        <span className="flex-1 text-right text-xs font-medium text-gray-800">
          {match.home_team_season.team.short_name}
        </span>
        <div className="flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5">
          <span className="text-xs font-bold text-gray-700">{match.home_score ?? '-'}</span>
          <span className="text-[10px] text-gray-400">:</span>
          <span className="text-xs font-bold text-gray-700">{match.away_score ?? '-'}</span>
        </div>
        <span className="flex-1 text-xs font-medium text-gray-800">
          {match.away_team_season.team.short_name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${match.status === 'played' ? 'bg-league-green/10 text-league-green' : 'bg-gray-100 text-gray-400'}`}>
          {match.status === 'played' ? 'Jugado' : 'Prog.'}
        </span>
        <button onClick={() => setEditing(true)} className="text-[10px] text-navy-600 hover:underline">Editar</button>
        <button onClick={handleDelete} className="text-[10px] text-red-500 hover:underline">x</button>
      </div>
    </div>
  )
}
