'use client'

import { useState } from 'react'
import { createTeam, updateTeam, deleteTeam } from '@/actions/teams'

interface TeamRow {
  id: string
  name: string
  short_name: string
  crest_path: string | null
  team_players: { count: number }[]
}

export default function TeamsManager({ teams, leagueId }: { teams: TeamRow[]; leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    formData.set('league_id', leagueId)
    const result = await createTeam(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowForm(false)
    setError(null)
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateTeam(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setEditingId(null)
    setError(null)
  }

  async function handleDelete(teamId: string) {
    if (!confirm('¿Eliminar este equipo? Se borrarán sus datos asociados.')) return
    const result = await deleteTeam(teamId)
    if (result.error) setError(result.error)
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        onClick={() => { setShowForm(!showForm); setEditingId(null) }}
        className="mb-4 rounded-lg bg-league-green px-4 py-2 text-sm font-medium text-white hover:bg-league-green-dark"
      >
        {showForm ? 'Cancelar' : '+ Nuevo equipo'}
      </button>

      {showForm && (
        <form action={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input name="name" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-league-green focus:ring-1 focus:ring-league-green" placeholder="Ej: FC Newland" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre corto</label>
              <input name="short_name" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-league-green focus:ring-1 focus:ring-league-green" placeholder="Ej: FCN" />
            </div>
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Crear equipo
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3">Abreviatura</th>
              <th className="px-4 py-3 text-center">Jugadores</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teams.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
                  No hay equipos registrados
                </td>
              </tr>
            )}
            {teams.map((team) =>
              editingId === team.id ? (
                <tr key={team.id} className="bg-blue-50/50">
                  <td colSpan={4} className="px-4 py-3">
                    <form action={handleUpdate} className="flex items-center gap-3">
                      <input type="hidden" name="id" value={team.id} />
                      <input name="name" defaultValue={team.name} required className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                      <input name="short_name" defaultValue={team.short_name} required className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                      <button type="submit" className="rounded-lg bg-league-green px-3 py-1.5 text-xs font-medium text-white">Guardar</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={team.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{team.short_name}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {team.team_players?.[0]?.count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingId(team.id)} className="mr-2 text-xs text-navy-600 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(team.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
