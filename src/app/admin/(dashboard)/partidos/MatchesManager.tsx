'use client'

import { useState } from 'react'
import { createMatch, updateMatchScore, deleteMatch, createCompetition, createStage } from '@/actions/matches'

interface Props {
  seasonId: string
  competitions: CompetitionRow[]
  teamSeasons: TeamSeasonRow[]
  matches: MatchRow[]
}

interface CompetitionRow {
  id: string
  name: string
  stages: StageRow[]
}

interface StageRow {
  id: string
  name: string
  type: string
  stage_order: number
  stage_groups: { id: string; name: string }[]
}

interface TeamSeasonRow {
  id: string
  team: { id: string; name: string; short_name: string }
}

interface MatchRow {
  id: string
  stage_id: string
  home_score: number | null
  away_score: number | null
  status: string
  round: number | null
  kickoff_at: string | null
  home_team_season: TeamSeasonRow
  away_team_season: TeamSeasonRow
}

export default function MatchesManager({ seasonId, competitions, teamSeasons, matches }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [showCompForm, setShowCompForm] = useState(false)
  const [showStageForm, setShowStageForm] = useState<string | null>(null)
  const [showMatchForm, setShowMatchForm] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<string | null>(null)

  async function handleCreateComp(formData: FormData) {
    formData.set('season_id', seasonId)
    const result = await createCompetition(formData)
    if (result.error) { setError(result.error); return }
    setShowCompForm(false)
  }

  async function handleCreateStage(formData: FormData) {
    const result = await createStage(formData)
    if (result.error) { setError(result.error); return }
    setShowStageForm(null)
  }

  async function handleCreateMatch(formData: FormData) {
    const result = await createMatch(formData)
    if (result.error) { setError(result.error); return }
    setShowMatchForm(null)
  }

  async function handleUpdateScore(formData: FormData) {
    const result = await updateMatchScore(formData)
    if (result.error) { setError(result.error); return }
    setEditingMatch(null)
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('¿Eliminar este partido?')) return
    const result = await deleteMatch(matchId)
    if (result.error) setError(result.error)
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => setShowCompForm(!showCompForm)} className="rounded-lg bg-league-green px-4 py-2 text-sm font-medium text-white hover:bg-league-green-dark">
          {showCompForm ? 'Cancelar' : '+ Competencia'}
        </button>
      </div>

      {showCompForm && (
        <form action={handleCreateComp} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Nombre de la competencia</label>
              <input name="name" required placeholder="Ej: Torneo Apertura" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              Crear
            </button>
          </div>
        </form>
      )}

      {competitions.length === 0 && !showCompForm && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
          No hay competencias. Creá una competencia para empezar a cargar partidos.
        </div>
      )}

      {competitions.map((comp) => (
        <div key={comp.id} className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-gray-900">{comp.name}</h3>
            <button
              onClick={() => setShowStageForm(showStageForm === comp.id ? null : comp.id)}
              className="text-xs text-navy-600 hover:underline"
            >
              + Etapa
            </button>
          </div>

          {showStageForm === comp.id && (
            <form action={handleCreateStage} className="border-b border-gray-100 px-4 py-3">
              <input type="hidden" name="competition_id" value={comp.id} />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nombre</label>
                  <input name="name" required placeholder="Ej: Fase de Grupos" className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Tipo</label>
                  <select name="type" required className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                    <option value="league_table">Liga (todos vs todos)</option>
                    <option value="groups">Grupos</option>
                    <option value="knockout">Eliminación directa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Orden</label>
                  <input name="stage_order" type="number" defaultValue={1} min={1} className="mt-1 w-16 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
                  Crear etapa
                </button>
              </div>
            </form>
          )}

          {comp.stages.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Sin etapas aún
            </div>
          )}

          {comp.stages
            .sort((a, b) => a.stage_order - b.stage_order)
            .map((stage) => {
              const stageMatches = matches.filter((m) => m.stage_id === stage.id)
              return (
                <div key={stage.id} className="border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase">
                        {stage.type.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMatchForm(showMatchForm === stage.id ? null : stage.id)}
                      className="text-xs text-league-green hover:underline"
                    >
                      + Partido
                    </button>
                  </div>

                  {showMatchForm === stage.id && (
                    <form action={handleCreateMatch} className="bg-gray-50 px-4 pb-3">
                      <input type="hidden" name="stage_id" value={stage.id} />
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Local</label>
                          <select name="home_team_season_id" required className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                            <option value="">Seleccionar...</option>
                            {teamSeasons.map((ts) => (
                              <option key={ts.id} value={ts.id}>{ts.team.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Visitante</label>
                          <select name="away_team_season_id" required className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                            <option value="">Seleccionar...</option>
                            {teamSeasons.map((ts) => (
                              <option key={ts.id} value={ts.id}>{ts.team.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Fecha #</label>
                          <input name="round" type="number" min={1} className="mt-1 w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Hora</label>
                          <input name="kickoff_at" type="datetime-local" className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
                          Crear
                        </button>
                      </div>
                    </form>
                  )}

                  {stageMatches.length === 0 && showMatchForm !== stage.id && (
                    <div className="px-4 py-4 text-center text-xs text-gray-400">Sin partidos</div>
                  )}

                  {stageMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 hover:bg-gray-50">
                      {editingMatch === match.id ? (
                        <form action={handleUpdateScore} className="flex w-full items-center gap-2">
                          <input type="hidden" name="id" value={match.id} />
                          <span className="flex-1 text-right text-sm font-medium">{match.home_team_season.team.short_name}</span>
                          <input name="home_score" type="number" min={0} defaultValue={match.home_score ?? 0} className="w-12 rounded border border-gray-300 px-2 py-1 text-center text-sm" />
                          <span className="text-xs text-gray-400">-</span>
                          <input name="away_score" type="number" min={0} defaultValue={match.away_score ?? 0} className="w-12 rounded border border-gray-300 px-2 py-1 text-center text-sm" />
                          <span className="flex-1 text-sm font-medium">{match.away_team_season.team.short_name}</span>
                          <select name="status" defaultValue={match.status} className="rounded border border-gray-300 px-2 py-1 text-xs">
                            <option value="scheduled">Programado</option>
                            <option value="played">Jugado</option>
                          </select>
                          <button type="submit" className="rounded bg-league-green px-2 py-1 text-xs text-white">OK</button>
                          <button type="button" onClick={() => setEditingMatch(null)} className="text-xs text-gray-400">x</button>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-1 items-center gap-2">
                            {match.round && <span className="text-xs text-gray-400">F{match.round}</span>}
                            <span className="flex-1 text-right text-sm font-medium text-gray-900">
                              {match.home_team_season.team.short_name}
                            </span>
                            <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5">
                              <span className="text-sm font-bold text-gray-700">{match.home_score ?? '-'}</span>
                              <span className="text-xs text-gray-400">:</span>
                              <span className="text-sm font-bold text-gray-700">{match.away_score ?? '-'}</span>
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-900">
                              {match.away_team_season.team.short_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${match.status === 'played' ? 'bg-league-green/10 text-league-green' : 'bg-gray-100 text-gray-500'}`}>
                              {match.status === 'played' ? 'Jugado' : 'Prog.'}
                            </span>
                            <button onClick={() => setEditingMatch(match.id)} className="text-xs text-navy-600 hover:underline">
                              Editar
                            </button>
                            <button onClick={() => handleDeleteMatch(match.id)} className="text-xs text-red-500 hover:underline">
                              x
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}
