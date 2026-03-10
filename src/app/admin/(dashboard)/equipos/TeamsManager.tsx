'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createTeam, updateTeam, deleteTeam, removeCrest } from '@/actions/teams'

interface TeamRow {
  id: string
  name: string
  short_name: string
  crest_path: string | null
  team_players: { count: number }[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getCrestUrl(crestPath: string | null): string | null {
  if (!crestPath) return null
  const path = crestPath.replace(/\.(jpe?g)$/i, '.png')
  return `${SUPABASE_URL}/storage/v1/object/public/public_liga/${path}`
}

export default function TeamsManager({ teams, leagueId }: { teams: TeamRow[]; leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    formData.set('league_id', leagueId)
    const result = await createTeam(formData)
    if (result.error) { setError(result.error); return }
    setShowForm(false)
    setError(null)
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateTeam(formData)
    if (result.error) { setError(result.error); return }
    setEditingId(null)
    setError(null)
  }

  async function handleDelete(teamId: string) {
    if (!confirm('¿Eliminar este equipo? Se borrarán sus datos asociados.')) return
    const result = await deleteTeam(teamId)
    if (result.error) setError(result.error)
  }

  async function handleRemoveCrest(teamId: string) {
    if (!confirm('¿Eliminar el escudo?')) return
    const result = await removeCrest(teamId)
    if (result.error) setError(result.error)
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Cerrar</button>
        </div>
      )}

      <button
        onClick={() => { setShowForm(!showForm); setEditingId(null) }}
        className="mb-4 rounded-lg bg-league-green px-4 py-2 text-sm font-medium text-white hover:bg-league-green-dark"
      >
        {showForm ? 'Cancelar' : '+ Nuevo equipo'}
      </button>

      {showForm && <CreateTeamForm onSubmit={handleCreate} />}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 w-14">Escudo</th>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3">Abreviatura</th>
              <th className="px-4 py-3 text-center">Jugadores</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teams.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  No hay equipos registrados
                </td>
              </tr>
            )}
            {teams.map((team) =>
              editingId === team.id ? (
                <tr key={team.id} className="bg-blue-50/50">
                  <td colSpan={5} className="px-4 py-3">
                    <EditTeamForm team={team} onSubmit={handleUpdate} onCancel={() => setEditingId(null)} onRemoveCrest={handleRemoveCrest} />
                  </td>
                </tr>
              ) : (
                <tr key={team.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <TeamCrest crestPath={team.crest_path} name={team.short_name} size={32} />
                  </td>
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

// ─── Crest display ───

function TeamCrest({ crestPath, name, size }: { crestPath: string | null; name: string; size: number }) {
  const url = getCrestUrl(crestPath)

  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-400"
        style={{ width: size, height: size }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size}
      className="rounded-lg object-contain"
      unoptimized
    />
  )
}

// ─── File input with preview ───

function CrestUpload({
  currentPath,
  onRemove,
}: {
  currentPath?: string | null
  onRemove?: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const currentUrl = getCrestUrl(currentPath ?? null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  const displayUrl = preview || currentUrl

  return (
    <div className="flex items-center gap-3">
      {displayUrl ? (
        <div className="relative">
          <Image
            src={displayUrl}
            alt="Escudo"
            width={48}
            height={48}
            className="rounded-lg border border-gray-200 object-contain"
            unoptimized
          />
          {!preview && currentPath && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white hover:bg-red-600"
            >
              x
            </button>
          )}
        </div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {currentPath || preview ? 'Cambiar escudo' : 'Subir escudo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          name="crest"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="mt-1 text-[10px] text-gray-400">PNG, JPG, WebP o SVG. Máx 2MB.</p>
      </div>
    </div>
  )
}

// ─── Create form ───

function CreateTeamForm({ onSubmit }: { onSubmit: (fd: FormData) => Promise<void> }) {
  return (
    <form action={onSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
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
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Escudo</label>
        <CrestUpload />
      </div>
      <button type="submit" className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
        Crear equipo
      </button>
    </form>
  )
}

// ─── Edit form ───

function EditTeamForm({
  team,
  onSubmit,
  onCancel,
  onRemoveCrest,
}: {
  team: TeamRow
  onSubmit: (fd: FormData) => Promise<void>
  onCancel: () => void
  onRemoveCrest: (teamId: string) => void
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={team.id} />
      <div className="flex items-center gap-3">
        <input name="name" defaultValue={team.name} required className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" placeholder="Nombre" />
        <input name="short_name" defaultValue={team.short_name} required className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" placeholder="Abreviatura" />
      </div>
      <CrestUpload currentPath={team.crest_path} onRemove={() => onRemoveCrest(team.id)} />
      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-league-green px-3 py-1.5 text-xs font-medium text-white">Guardar</button>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}
