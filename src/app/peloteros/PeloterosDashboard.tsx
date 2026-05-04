'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TeamCrest from '@/components/public/TeamCrest'
import type { PStageSection, PMatchItem } from './page'

const MATCHES_PER_PAGE = 20

interface Props {
  sections: PStageSection[]
  seasonName: string
}

export default function PeloterosDashboard({ sections, seasonName }: Props) {
  const [compFilter, setCompFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [roundFilter, setRoundFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'scheduled' | 'played'>('')
  const [page, setPage] = useState(0)

  const competitions = useMemo(() => {
    const map = new Map<string, string>()
    sections.forEach((s) => map.set(s.competitionId, s.competitionName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [sections])

  const stages = useMemo(() => {
    return sections
      .filter((s) => !compFilter || s.competitionId === compFilter)
      .map((s) => ({ id: s.stageId, name: `${s.competitionName} — ${s.stageName}` }))
  }, [sections, compFilter])

  const groups = useMemo(() => {
    const relevantSections = sections.filter((s) => {
      if (stageFilter) return s.stageId === stageFilter
      if (compFilter) return s.competitionId === compFilter
      return true
    })
    const allGroups: { id: string; name: string }[] = []
    const seen = new Set<string>()
    relevantSections.forEach((s) => {
      s.groups.forEach((g) => {
        if (g.id && !seen.has(g.id)) {
          seen.add(g.id)
          allGroups.push({ id: g.id, name: g.name })
        }
      })
    })
    return allGroups
  }, [sections, compFilter, stageFilter])

  const rounds = useMemo(() => {
    const roundSet = new Set<number>()
    sections.forEach((s) => {
      if (compFilter && s.competitionId !== compFilter) return
      if (stageFilter && s.stageId !== stageFilter) return
      s.matches.forEach((m) => {
        if (groupFilter && m.groupId !== groupFilter) return
        if (m.round !== null) roundSet.add(m.round)
      })
    })
    return Array.from(roundSet).sort((a, b) => b - a)
  }, [sections, compFilter, stageFilter, groupFilter])

  const filteredMatches = useMemo(() => {
    const result: PMatchItem[] = []
    sections.forEach((s) => {
      if (compFilter && s.competitionId !== compFilter) return
      if (stageFilter && s.stageId !== stageFilter) return
      s.matches.forEach((m) => {
        if (groupFilter && m.groupId !== groupFilter) return
        if (roundFilter && String(m.round) !== roundFilter) return
        if (statusFilter && m.status !== statusFilter) return
        result.push(m)
      })
    })
    return result
  }, [sections, compFilter, stageFilter, groupFilter, roundFilter, statusFilter])

  const matchesByRound = useMemo(() => {
    const map = new Map<number, PMatchItem[]>()
    filteredMatches.forEach((m) => {
      const r = m.round ?? 0
      if (!map.has(r)) map.set(r, [])
      map.get(r)!.push(m)
    })
    return Array.from(map.entries()).sort(([a], [b]) => b - a)
  }, [filteredMatches])

  const totalPages = Math.ceil(matchesByRound.length / MATCHES_PER_PAGE)
  const paginatedRounds = matchesByRound.slice(page * MATCHES_PER_PAGE, (page + 1) * MATCHES_PER_PAGE)

  function clearFilters() {
    setCompFilter('')
    setStageFilter('')
    setGroupFilter('')
    setRoundFilter('')
    setStatusFilter('')
    setPage(0)
  }

  const hasFilters = compFilter || stageFilter || groupFilter || roundFilter || statusFilter

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Partidos</h1>
        {seasonName && <p className="text-xs text-navy-400">{seasonName}</p>}
      </div>

      {/* Filters */}
      <div className="space-y-2 rounded-xl border border-navy-800 bg-navy-900 p-3">
        <div className="grid grid-cols-2 gap-2">
          {competitions.length > 1 && (
            <FilterSelect
              label="Competición"
              value={compFilter}
              onChange={(v) => { setCompFilter(v); setStageFilter(''); setGroupFilter(''); setRoundFilter(''); setPage(0) }}
              options={competitions.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {stages.length > 1 && (
            <FilterSelect
              label="Etapa"
              value={stageFilter}
              onChange={(v) => { setStageFilter(v); setGroupFilter(''); setRoundFilter(''); setPage(0) }}
              options={stages.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          {groups.length > 0 && (
            <FilterSelect
              label="Grupo"
              value={groupFilter}
              onChange={(v) => { setGroupFilter(v); setRoundFilter(''); setPage(0) }}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          )}
          {rounds.length > 1 && (
            <FilterSelect
              label="Fecha"
              value={roundFilter}
              onChange={(v) => { setRoundFilter(v); setPage(0) }}
              options={rounds.map((r) => ({ value: String(r), label: `Fecha ${r}` }))}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <StatusButton label="Todos" active={statusFilter === ''} onClick={() => { setStatusFilter(''); setPage(0) }} />
            <StatusButton label="Pendientes" active={statusFilter === 'scheduled'} onClick={() => { setStatusFilter('scheduled'); setPage(0) }} />
            <StatusButton label="Jugados" active={statusFilter === 'played'} onClick={() => { setStatusFilter('played'); setPage(0) }} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-[10px] text-navy-500 hover:text-navy-300">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-navy-500">
        {filteredMatches.length} partido{filteredMatches.length !== 1 ? 's' : ''}
      </p>

      {/* Match list grouped by round */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-xl border border-navy-800 bg-navy-900 px-4 py-12 text-center text-sm text-navy-500">
          No hay partidos con estos filtros
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedRounds.map(([round, matches]) => (
            <div key={round}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-navy-800 px-2.5 py-0.5 text-[10px] font-bold text-navy-300">
                  {round === 0 ? 'Sin fecha' : `Fecha ${round}`}
                </span>
                <span className="text-[10px] text-navy-600">{matches.length} partidos</span>
              </div>
              <div className="space-y-1.5">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs text-navy-300 disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-[10px] text-navy-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs text-navy-300 disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
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
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[9px] font-medium uppercase tracking-wider text-navy-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-navy-700 bg-navy-800 px-2 py-1.5 text-xs text-white"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function StatusButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
        active
          ? 'bg-league-green/20 text-league-green'
          : 'bg-navy-800 text-navy-500'
      }`}
    >
      {label}
    </button>
  )
}

function MatchCard({ match }: { match: PMatchItem }) {
  const isScheduled = match.status === 'scheduled'

  const inner = (
    <>
      {/* Home */}
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <span className="truncate text-right text-xs font-semibold text-white">{match.homeTeam}</span>
        <TeamCrest crestPath={match.homeCrest} name={match.homeTeam} size={24} className="shrink-0 rounded" />
      </div>

      {/* Score */}
      <div className="flex w-14 items-center justify-center">
        {!isScheduled ? (
          <span className="text-sm font-bold tabular-nums text-league-green">{match.home_score} - {match.away_score}</span>
        ) : (
          <span className="text-[10px] text-navy-500">vs</span>
        )}
      </div>

      {/* Away */}
      <div className="flex flex-1 items-center gap-1.5">
        <TeamCrest crestPath={match.awayCrest} name={match.awayTeam} size={24} className="shrink-0 rounded" />
        <span className="truncate text-xs font-semibold text-white">{match.awayTeam}</span>
      </div>

      {/* Status */}
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
        isScheduled
          ? 'bg-league-green/10 text-league-green'
          : 'bg-navy-800 text-navy-500'
      }`}>
        {isScheduled ? '●' : '✓'}
      </span>
    </>
  )

  if (isScheduled) {
    return (
      <Link
        href={`/peloteros/live/${match.id}`}
        className="flex items-center gap-3 rounded-xl border border-league-green/30 bg-navy-900 px-3 py-2.5 transition-colors active:scale-[0.98]"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-navy-800 bg-navy-900/60 px-3 py-2.5 opacity-60">
      {inner}
    </div>
  )
}
