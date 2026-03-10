'use client'

import { useState } from 'react'
import { createSeason, setActiveSeason, deleteSeason, registerTeamToSeason, removeTeamFromSeason } from '@/actions/seasons'
import { createCompetition, createStage, deleteCompetition, deleteStage } from '@/actions/matches'
import StageEditor from '@/components/admin/StageEditor'

// ─── Types ───

interface GroupTeamRow {
  team_season_id: string
}

interface GroupRow {
  id: string
  name: string
  stage_group_teams: GroupTeamRow[]
}

interface StageRow {
  id: string
  name: string
  type: string
  stage_order: number
  rules: Record<string, unknown>
  stage_groups: GroupRow[]
}

interface CompetitionRow {
  id: string
  name: string
  stages: StageRow[]
}

interface TeamSeasonRow {
  id: string
  team: { id: string; name: string; short_name: string }
}

interface SeasonRow {
  id: string
  name: string
  year: number
  semester: number
  is_active: boolean
  team_seasons: TeamSeasonRow[]
  competitions: CompetitionRow[]
}

interface TeamOption {
  id: string
  name: string
  short_name: string
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

type TabKey = 'equipos' | 'estructura'

const STAGE_TYPE_LABELS: Record<string, string> = {
  league_table: 'Liga (todos vs todos)',
  groups: 'Fase de grupos',
  knockout: 'Eliminación directa',
}

// ─── Main ───

export default function SeasonsManager({
  seasons,
  teams,
  leagueId,
  allMatches,
}: {
  seasons: SeasonRow[]
  teams: TeamOption[]
  leagueId: string
  allMatches: MatchRow[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('equipos')
  const [editingStage, setEditingStage] = useState<{ seasonId: string; stage: StageRow } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    formData.set('league_id', leagueId)
    const result = await createSeason(formData)
    if (result.error) { setError(result.error); return }
    setShowForm(false)
    setError(null)
  }

  async function handleActivate(seasonId: string) {
    const result = await setActiveSeason(seasonId, leagueId)
    if (result.error) setError(result.error)
  }

  async function handleDelete(seasonId: string) {
    if (!confirm('¿Eliminar esta temporada y toda su estructura?')) return
    const result = await deleteSeason(seasonId)
    if (result.error) setError(result.error)
  }

  async function handleRegisterTeam(formData: FormData) {
    const result = await registerTeamToSeason(formData)
    if (result.error) setError(result.error)
  }

  async function handleRemoveTeam(teamSeasonId: string) {
    const result = await removeTeamFromSeason(teamSeasonId)
    if (result.error) setError(result.error)
  }

  // If editing a stage, show the StageEditor full-width
  if (editingStage) {
    const season = seasons.find((s) => s.id === editingStage.seasonId)
    const teamSeasons = season?.team_seasons ?? []

    return (
      <div className="mt-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">Cerrar</button>
          </div>
        )}
        <div className="mb-3 text-xs text-gray-400">
          {season?.name} &rsaquo; {editingStage.stage.name}
        </div>
        <StageEditor
          stage={editingStage.stage}
          teamSeasons={teamSeasons}
          matches={allMatches}
          onError={setError}
          onClose={() => setEditingStage(null)}
        />
      </div>
    )
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Cerrar</button>
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 rounded-lg bg-league-green px-4 py-2 text-sm font-medium text-white hover:bg-league-green-dark"
      >
        {showForm ? 'Cancelar' : '+ Nueva temporada'}
      </button>

      {showForm && (
        <form action={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input name="name" required placeholder={`Apertura ${currentYear}`} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Año</label>
              <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2040} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Semestre</label>
              <select name="semester" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="1">1er Semestre</option>
                <option value="2">2do Semestre</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input name="is_active" type="checkbox" className="rounded border-gray-300" />
                Temporada activa
              </label>
            </div>
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Crear temporada
          </button>
        </form>
      )}

      <div className="space-y-4">
        {seasons.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
            No hay temporadas registradas
          </div>
        )}

        {seasons.map((season) => {
          const isExpanded = expandedId === season.id
          const enrolledIds = new Set(season.team_seasons.map((ts) => ts.team.id))
          const availableTeams = teams.filter((t) => !enrolledIds.has(t.id))

          return (
            <div key={season.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4">
                <button onClick={() => { setExpandedId(isExpanded ? null : season.id); setActiveTab('equipos') }} className="flex items-center gap-3 text-left">
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <div>
                    <span className="font-semibold text-gray-900">{season.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{season.year} – S{season.semester}</span>
                  </div>
                  {season.is_active && (
                    <span className="rounded-full bg-league-green/10 px-2 py-0.5 text-xs font-medium text-league-green">Activa</span>
                  )}
                </button>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">{season.team_seasons.length} equipos</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400">{season.competitions.length} comp.</span>
                  {!season.is_active && (
                    <button onClick={() => handleActivate(season.id)} className="text-navy-600 hover:underline">Activar</button>
                  )}
                  <button onClick={() => handleDelete(season.id)} className="text-red-500 hover:underline">Eliminar</button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('equipos')}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'equipos' ? 'border-b-2 border-league-green text-league-green' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Equipos inscritos
                    </button>
                    <button
                      onClick={() => setActiveTab('estructura')}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'estructura' ? 'border-b-2 border-league-green text-league-green' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Competencias y Etapas
                    </button>
                  </div>

                  <div className="px-4 py-4">
                    {activeTab === 'equipos' ? (
                      <TeamsTab
                        teamSeasons={season.team_seasons}
                        availableTeams={availableTeams}
                        seasonId={season.id}
                        onRegister={handleRegisterTeam}
                        onRemove={handleRemoveTeam}
                      />
                    ) : (
                      <CompetitionsTab
                        competitions={season.competitions}
                        seasonId={season.id}
                        onError={setError}
                        onEditStage={(stage) => setEditingStage({ seasonId: season.id, stage })}
                        allMatches={allMatches}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Teams Tab ───

function TeamsTab({
  teamSeasons,
  availableTeams,
  seasonId,
  onRegister,
  onRemove,
}: {
  teamSeasons: TeamSeasonRow[]
  availableTeams: TeamOption[]
  seasonId: string
  onRegister: (fd: FormData) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  return (
    <div>
      {teamSeasons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {teamSeasons.map((ts) => (
            <span key={ts.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {ts.team.name}
              <button onClick={() => onRemove(ts.id)} className="ml-1 text-gray-400 hover:text-red-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No hay equipos inscritos</p>
      )}

      {availableTeams.length > 0 && (
        <form action={onRegister} className="mt-4 flex items-center gap-2">
          <input type="hidden" name="season_id" value={seasonId} />
          <select name="team_id" required className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Seleccionar equipo...</option>
            {availableTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
            Inscribir
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Competitions & Stages Tab ───

function CompetitionsTab({
  competitions,
  seasonId,
  onError,
  onEditStage,
  allMatches,
}: {
  competitions: CompetitionRow[]
  seasonId: string
  onError: (msg: string) => void
  onEditStage: (stage: StageRow) => void
  allMatches: MatchRow[]
}) {
  const [showCompForm, setShowCompForm] = useState(false)
  const [showStageFormFor, setShowStageFormFor] = useState<string | null>(null)

  async function handleCreateComp(formData: FormData) {
    formData.set('season_id', seasonId)
    const result = await createCompetition(formData)
    if (result.error) { onError(result.error); return }
    setShowCompForm(false)
  }

  async function handleCreateStage(formData: FormData) {
    const result = await createStage(formData)
    if (result.error) { onError(result.error); return }
    setShowStageFormFor(null)
  }

  async function handleDeleteComp(compId: string) {
    if (!confirm('¿Eliminar esta competencia y todas sus etapas y partidos?')) return
    const result = await deleteCompetition(compId)
    if (result.error) onError(result.error)
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('¿Eliminar esta etapa y sus partidos?')) return
    const result = await deleteStage(stageId)
    if (result.error) onError(result.error)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {competitions.length === 0 ? 'Sin competencias' : `${competitions.length} competencia(s)`}
        </p>
        <button
          onClick={() => setShowCompForm(!showCompForm)}
          className="rounded-lg bg-league-green px-3 py-1.5 text-xs font-medium text-white hover:bg-league-green-dark"
        >
          {showCompForm ? 'Cancelar' : '+ Competencia'}
        </button>
      </div>

      {showCompForm && (
        <form action={handleCreateComp} className="mt-3 flex items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600">Nombre de la competencia</label>
            <input name="name" required placeholder="Ej: Torneo Apertura, Copa, Playoffs..." className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-navy-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
            Crear
          </button>
        </form>
      )}

      <div className="mt-4 space-y-4">
        {competitions.map((comp) => {
          const sortedStages = [...comp.stages].sort((a, b) => a.stage_order - b.stage_order)
          const isAddingStage = showStageFormFor === comp.id

          return (
            <div key={comp.id} className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-navy-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">{comp.name}</span>
                  <span className="text-xs text-gray-400">({sortedStages.length} etapas)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStageFormFor(isAddingStage ? null : comp.id)}
                    className="text-xs text-navy-600 hover:underline"
                  >
                    + Etapa
                  </button>
                  <button onClick={() => handleDeleteComp(comp.id)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>

              {isAddingStage && (
                <form action={handleCreateStage} className="border-t border-gray-100 bg-blue-50/30 px-4 py-3">
                  <input type="hidden" name="competition_id" value={comp.id} />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[160px] flex-1">
                      <label className="block text-xs font-medium text-gray-600">Nombre de la etapa</label>
                      <input name="name" required placeholder="Ej: Fase Regular, Cuartos de Final..." className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Formato</label>
                      <select name="type" required className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                        <option value="league_table">Liga (todos vs todos)</option>
                        <option value="groups">Fase de grupos</option>
                        <option value="knockout">Eliminación directa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Orden</label>
                      <input name="stage_order" type="number" defaultValue={sortedStages.length + 1} min={1} className="mt-1 w-16 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <button type="submit" className="rounded-lg bg-navy-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
                      Crear etapa
                    </button>
                  </div>
                </form>
              )}

              {sortedStages.length === 0 && !isAddingStage && (
                <div className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-400">
                  Sin etapas — agregá una etapa para definir el formato
                </div>
              )}

              {sortedStages.map((stage, idx) => {
                const matchCount = allMatches.filter((m) => m.stage_id === stage.id).length
                return (
                  <div key={stage.id} className={`flex items-center justify-between border-t border-gray-100 px-4 py-2.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-700">
                        {stage.stage_order}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
                        </span>
                        {matchCount > 0 && (
                          <span className="ml-2 text-[10px] text-gray-400">{matchCount} partidos</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditStage(stage)}
                        className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700 hover:bg-navy-100"
                      >
                        Configurar
                      </button>
                      <button onClick={() => handleDeleteStage(stage.id)} className="text-xs text-red-500 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
