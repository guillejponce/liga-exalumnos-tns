'use client'

import { useState } from 'react'
import { createSeason, setActiveSeason, deleteSeason, registerTeamToSeason, removeTeamFromSeason } from '@/actions/seasons'

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
}

interface TeamOption {
  id: string
  name: string
  short_name: string
}

export default function SeasonsManager({
  seasons,
  teams,
  leagueId,
}: {
  seasons: SeasonRow[]
  teams: TeamOption[]
  leagueId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
    if (!confirm('¿Eliminar esta temporada?')) return
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

  const currentYear = new Date().getFullYear()

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
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
              <div className="flex items-center justify-between px-4 py-4">
                <button onClick={() => setExpandedId(isExpanded ? null : season.id)} className="flex items-center gap-3 text-left">
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <div>
                    <span className="font-semibold text-gray-900">{season.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{season.year} – S{season.semester}</span>
                  </div>
                  {season.is_active && (
                    <span className="rounded-full bg-league-green/10 px-2 py-0.5 text-xs font-medium text-league-green">
                      Activa
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{season.team_seasons.length} equipos</span>
                  {!season.is_active && (
                    <button onClick={() => handleActivate(season.id)} className="text-xs text-navy-600 hover:underline">
                      Activar
                    </button>
                  )}
                  <button onClick={() => handleDelete(season.id)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <h4 className="text-sm font-medium text-gray-700">Equipos inscritos</h4>

                  {season.team_seasons.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {season.team_seasons.map((ts) => (
                        <span key={ts.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                          {ts.team.name}
                          <button onClick={() => handleRemoveTeam(ts.id)} className="ml-1 text-gray-400 hover:text-red-500">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">No hay equipos inscritos</p>
                  )}

                  {availableTeams.length > 0 && (
                    <form action={handleRegisterTeam} className="mt-4 flex items-center gap-2">
                      <input type="hidden" name="season_id" value={season.id} />
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
