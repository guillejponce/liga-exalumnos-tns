'use client'

import { useState } from 'react'
import { createPlayer, updatePlayer, deletePlayer } from '@/actions/players'

interface PlayerRow {
  id: string
  first_name: string
  last_name: string | null
  nickname: string | null
  rut: string
  team_players: {
    team_id: string
    shirt_number: number | null
    is_captain: boolean
    team: { name: string; short_name: string }
  }[]
}

interface TeamOption {
  id: string
  name: string
  short_name: string
}

export default function PlayersManager({
  players,
  teams,
  leagueId,
}: {
  players: PlayerRow[]
  teams: TeamOption[]
  leagueId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = players.filter((p) => {
    const term = search.toLowerCase()
    const fullName = `${p.first_name} ${p.last_name ?? ''} ${p.nickname ?? ''} ${p.rut}`.toLowerCase()
    return fullName.includes(term)
  })

  async function handleCreate(formData: FormData) {
    formData.set('league_id', leagueId)
    const result = await createPlayer(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowForm(false)
    setError(null)
  }

  async function handleUpdate(formData: FormData) {
    const result = await updatePlayer(formData)
    if (result.error) { setError(result.error); return }
    setEditingId(null)
    setError(null)
  }

  async function handleDelete(playerId: string) {
    if (!confirm('¿Eliminar este jugador?')) return
    const result = await deletePlayer(playerId)
    if (result.error) setError(result.error)
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Buscar por nombre, apodo o RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs focus:border-league-green focus:ring-1 focus:ring-league-green"
        />
        <button
          onClick={() => { setShowForm(!showForm) }}
          className="rounded-lg bg-league-green px-4 py-2 text-sm font-medium text-white hover:bg-league-green-dark"
        >
          {showForm ? 'Cancelar' : '+ Nuevo jugador'}
        </button>
      </div>

      {showForm && (
        <form action={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre *</label>
              <input name="first_name" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Apellido</label>
              <input name="last_name" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Apodo</label>
              <input name="nickname" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">RUT *</label>
              <input name="rut" required placeholder="12345678-9" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Equipo</label>
              <select name="team_id" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Sin equipo</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Dorsal</label>
                <input name="shirt_number" type="number" min={1} max={99} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input name="is_captain" type="checkbox" className="rounded border-gray-300" />
                  Capitán
                </label>
              </div>
            </div>
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Crear jugador
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="hidden px-4 py-3 sm:table-cell">RUT</th>
              <th className="px-4 py-3">Equipo</th>
              <th className="hidden px-4 py-3 text-center sm:table-cell">#</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  {search ? 'No se encontraron jugadores' : 'No hay jugadores registrados'}
                </td>
              </tr>
            )}
            {filtered.map((player) => {
              const tp = player.team_players?.[0]

              if (editingId === player.id) {
                return (
                  <tr key={player.id} className="bg-amber-50">
                    <td colSpan={5} className="px-4 py-3">
                      <form action={handleUpdate} className="space-y-3">
                        <input type="hidden" name="id" value={player.id} />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Nombre *</label>
                            <input name="first_name" required defaultValue={player.first_name} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Apellido</label>
                            <input name="last_name" defaultValue={player.last_name ?? ''} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Apodo</label>
                            <input name="nickname" defaultValue={player.nickname ?? ''} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">RUT *</label>
                            <input name="rut" required defaultValue={player.rut} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Equipo</label>
                            <select name="team_id" defaultValue={tp?.team_id ?? ''} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                              <option value="">Sin equipo</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600">Dorsal</label>
                              <input name="shirt_number" type="number" min={1} max={99} defaultValue={tp?.shirt_number ?? ''} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                            </div>
                            <label className="flex items-center gap-2 pb-1.5 text-xs text-gray-600">
                              <input name="is_captain" type="checkbox" defaultChecked={tp?.is_captain ?? false} className="rounded border-gray-300" />
                              Capitán
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit" className="rounded-lg bg-league-green px-3 py-1.5 text-xs font-medium text-white hover:bg-league-green-dark">
                            Guardar
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={player.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">{player.first_name} {player.last_name}</span>
                    {player.nickname && (
                      <span className="ml-1 text-gray-400">&quot;{player.nickname}&quot;</span>
                    )}
                    {tp?.is_captain && (
                      <span className="ml-1 text-xs text-league-green">(C)</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">{player.rut}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {tp?.team ? tp.team.short_name : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-sm text-gray-500 sm:table-cell">
                    {tp?.shirt_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditingId(player.id)} className="text-xs text-navy-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(player.id)} className="text-xs text-red-500 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
