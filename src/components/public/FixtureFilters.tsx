'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'

interface TeamInfo {
  name: string
  short_name: string
  crest_path: string | null
}

interface MatchDisplay {
  id: string
  round: number | null
  kickoff_at: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team: TeamInfo
  away_team: TeamInfo
  group_id: string | null
  mvp_name: string | null
}

interface StageSection {
  competitionId: string
  competitionName: string
  stageId: string
  stageName: string
  stageType: string
  groups: { name: string; id: string | null; matchesByRound: [number, MatchDisplay[]][] }[]
}

interface FilterOption {
  id: string
  name: string
}

export default function FixtureFilters({ sections }: { sections: StageSection[] }) {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedRound, setSelectedRound] = useState<string>('all')

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
      for (const g of s.groups) {
        if (g.id && g.name && !seen.has(g.id)) {
          seen.set(g.id, g.name)
        }
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sections, selectedCompetition, selectedStage])

  const rounds = useMemo(() => {
    const roundSet = new Set<number>()
    for (const s of sections) {
      if (selectedCompetition !== 'all' && s.competitionId !== selectedCompetition) continue
      if (selectedStage !== 'all' && s.stageId !== selectedStage) continue
      for (const g of s.groups) {
        if (selectedGroup !== 'all' && g.id !== selectedGroup) continue
        for (const [round] of g.matchesByRound) {
          roundSet.add(round)
        }
      }
    }
    return Array.from(roundSet).sort((a, b) => b - a)
  }, [sections, selectedCompetition, selectedStage, selectedGroup])

  const filtered = useMemo(() => {
    return sections
      .filter((s) => {
        if (selectedCompetition !== 'all' && s.competitionId !== selectedCompetition) return false
        if (selectedStage !== 'all' && s.stageId !== selectedStage) return false
        return true
      })
      .map((s) => ({
        ...s,
        groups: s.groups
          .filter((g) => {
            if (selectedGroup !== 'all' && g.id !== selectedGroup) return false
            return true
          })
          .map((g) => ({
            ...g,
            matchesByRound: g.matchesByRound.filter(([round]) => {
              if (selectedRound !== 'all' && round !== Number(selectedRound)) return false
              return true
            }),
          }))
          .filter((g) => g.matchesByRound.length > 0),
      }))
      .filter((s) => s.groups.length > 0)
  }, [sections, selectedCompetition, selectedStage, selectedGroup, selectedRound])

  function handleCompetitionChange(val: string) {
    setSelectedCompetition(val)
    setSelectedStage('all')
    setSelectedGroup('all')
    setSelectedRound('all')
  }

  function handleStageChange(val: string) {
    setSelectedStage(val)
    setSelectedGroup('all')
    setSelectedRound('all')
  }

  function handleGroupChange(val: string) {
    setSelectedGroup(val)
    setSelectedRound('all')
  }

  const hasActiveFilters = selectedCompetition !== 'all' || selectedStage !== 'all' || selectedGroup !== 'all' || selectedRound !== 'all'

  function clearFilters() {
    setSelectedCompetition('all')
    setSelectedStage('all')
    setSelectedGroup('all')
    setSelectedRound('all')
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
            onChange={handleGroupChange}
            options={groups}
          />
        )}

        {rounds.length > 1 && (
          <FilterSelect
            label="Fecha"
            value={selectedRound}
            onChange={(v) => setSelectedRound(v)}
            options={rounds.map((r) => ({
              id: String(r),
              name: r === 0 ? 'Sin fecha asignada' : `Fecha ${r}`,
            }))}
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
          No hay partidos que coincidan con los filtros
        </div>
      )}

      <div className="mt-8 space-y-12">
        {filtered.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">{section.stageName}</h2>
              {section.competitionName && (
                <p className="text-xs text-navy-400">{section.competitionName}</p>
              )}
            </div>

            {section.groups.map((group, gIdx) => (
              <div key={gIdx} className="mb-8">
                {group.name && (
                  <h3 className="mb-3 text-sm font-semibold text-league-green">{group.name}</h3>
                )}

                <div className="space-y-8">
                  {group.matchesByRound.map(([round, roundMatches]) => (
                    <div key={round}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-navy-800" />
                        <h4 className="text-xs font-semibold text-navy-400">
                          {section.stageType === 'knockout'
                            ? `Ronda ${round}`
                            : round === 0
                              ? 'Sin fecha asignada'
                              : `Fecha ${round}`}
                        </h4>
                        <div className="h-px flex-1 bg-navy-800" />
                      </div>

                      <div className="space-y-2">
                        {roundMatches.map((match) => (
                          <MatchRow key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

function MatchRow({ match }: { match: MatchDisplay }) {
  const isPlayed = match.status === 'played'
  const dateStr = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Link
      href={`/fixture/${match.id}`}
      className="flex items-center justify-between rounded-xl border border-navy-800 bg-navy-900 px-4 py-3 sm:px-6 transition-colors hover:bg-navy-800 cursor-pointer"
    >
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <span className="text-right text-sm font-medium text-white">{match.home_team.name}</span>
        <TeamCrest crestPath={match.home_team.crest_path} name={match.home_team.short_name} size={40} />
      </div>

      <div className="mx-3 flex flex-col items-center sm:mx-6">
        {isPlayed ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{match.home_score}</span>
            <span className="text-xs text-navy-600">-</span>
            <span className="text-lg font-bold text-white">{match.away_score}</span>
          </div>
        ) : (
          <span className="text-sm font-medium text-navy-500">vs</span>
        )}
        {dateStr && <span className="mt-0.5 text-[10px] text-navy-500">{dateStr}</span>}
        {match.mvp_name && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            <span>🏅</span> {match.mvp_name}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center gap-2 sm:gap-3">
        <TeamCrest crestPath={match.away_team.crest_path} name={match.away_team.short_name} size={40} />
        <span className="text-sm font-medium text-white">{match.away_team.name}</span>
      </div>
    </Link>
  )
}
