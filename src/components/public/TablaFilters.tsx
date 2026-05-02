'use client'

import { useState, useMemo } from 'react'
import TeamCrest from '@/components/public/TeamCrest'

interface StandingRow {
  team: { id: string; name: string; short_name: string; crest_path: string | null }
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

interface StageSection {
  competitionId: string
  competitionName: string
  stageId: string
  stageName: string
  type: string
  groupId?: string
  groupName?: string
  standings: StandingRow[]
}

interface FilterOption {
  id: string
  name: string
}

const TABLE_HEADERS = ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'] as const

export default function TablaFilters({ sections }: { sections: StageSection[] }) {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const competitions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sections) {
      if (s.competitionId && !seen.has(s.competitionId)) {
        seen.set(s.competitionId, s.competitionName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sections])

  const stages = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sections) {
      if (selectedCompetition !== 'all' && s.competitionId !== selectedCompetition) continue
      if (!seen.has(s.stageId)) {
        seen.set(s.stageId, s.stageName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sections, selectedCompetition])

  const groups: FilterOption[] = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sections) {
      if (selectedCompetition !== 'all' && s.competitionId !== selectedCompetition) continue
      if (selectedStage !== 'all' && s.stageId !== selectedStage) continue
      if (s.groupId && s.groupName && !seen.has(s.groupId)) {
        seen.set(s.groupId, s.groupName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sections, selectedCompetition, selectedStage])

  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (selectedCompetition !== 'all' && s.competitionId !== selectedCompetition) return false
      if (selectedStage !== 'all' && s.stageId !== selectedStage) return false
      if (selectedGroup !== 'all' && s.groupId !== selectedGroup) return false
      return true
    })
  }, [sections, selectedCompetition, selectedStage, selectedGroup])

  function handleCompetitionChange(val: string) {
    setSelectedCompetition(val)
    setSelectedStage('all')
    setSelectedGroup('all')
  }

  function handleStageChange(val: string) {
    setSelectedStage(val)
    setSelectedGroup('all')
  }

  const hasActiveFilters = selectedCompetition !== 'all' || selectedStage !== 'all' || selectedGroup !== 'all'

  function clearFilters() {
    setSelectedCompetition('all')
    setSelectedStage('all')
    setSelectedGroup('all')
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        {competitions.length > 1 && (
          <FilterSelect
            label="Competencia"
            value={selectedCompetition}
            onChange={handleCompetitionChange}
            options={competitions}
          />
        )}

        {stages.length > 1 && (
          <FilterSelect
            label="Etapa"
            value={selectedStage}
            onChange={handleStageChange}
            options={stages}
          />
        )}

        {groups.length > 1 && (
          <FilterSelect
            label="Grupo"
            value={selectedGroup}
            onChange={(v) => setSelectedGroup(v)}
            options={groups}
          />
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-navy-700 px-3 py-2 text-xs font-medium text-navy-400 transition-colors hover:border-navy-600 hover:text-white"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-xl border border-navy-800 bg-navy-900 px-4 py-16 text-center text-sm text-navy-500">
          No hay tablas que coincidan con los filtros
        </div>
      )}

      <div className="mt-8 space-y-10">
        {filtered.map((section, idx) => (
          <div key={idx}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                {section.groupName ?? section.stageName}
              </h2>
              {section.competitionName && (
                <p className="text-xs text-navy-400">{section.competitionName} — {section.stageName}</p>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-navy-800">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-navy-900">
                    {TABLE_HEADERS.map((header) => (
                      <th key={header} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy-400 ${header === 'Equipo' ? 'text-left' : 'text-center'}`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {section.standings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="bg-navy-900/50 px-4 py-8 text-center text-sm text-navy-500">
                        Sin partidos jugados
                      </td>
                    </tr>
                  )}
                  {section.standings.map((row, index) => (
                    <tr key={row.team.id} className="bg-navy-900/50 transition-colors hover:bg-navy-800/50">
                      <td className="px-4 py-3 text-center text-sm font-bold text-navy-300">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest crestPath={row.team.crest_path} name={row.team.short_name} size={64} />
                          <span className="text-sm font-medium text-white">{row.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.played}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.won}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.drawn}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.lost}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_for}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goals_against}</td>
                      <td className="px-4 py-3 text-center text-sm text-navy-300">{row.goal_difference > 0 ? '+' : ''}{row.goal_difference}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-league-green">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  options: FilterOption[]
}) {
  return (
    <div className="min-w-[140px]">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-navy-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-white transition-colors focus:border-league-green focus:outline-none focus:ring-1 focus:ring-league-green"
      >
        <option value="all">Todas</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}
