'use client'

import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
  year: number
  semester: number
  is_active: boolean
}

export default function SeasonPicker({
  seasons,
  currentSeasonId,
}: {
  seasons: Season[]
  currentSeasonId: string
}) {
  const router = useRouter()

  function handleChange(seasonId: string) {
    router.push(`/admin/partidos?seasonId=${seasonId}`)
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <label className="text-sm text-gray-500">Temporada:</label>
      <select
        value={currentSeasonId}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.year} – S{s.semester}){s.is_active ? ' ★' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
