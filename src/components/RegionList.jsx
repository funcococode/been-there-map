import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

const FILTERS = [
  ['all', 'All'],
  ['on', 'Visited'],
  ['off', 'Not yet'],
]
const plain = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Searchable checklist — the accessible (and tiny-island-friendly) way to tick places off. */
export default function RegionList({ regions, visited, onToggle, readOnly, unit }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const shown = useMemo(() => {
    const needle = plain(q.trim())
    return regions.filter((r) => {
      if (filter === 'on' && !visited.has(r.id)) return false
      if (filter === 'off' && visited.has(r.id)) return false
      return !needle || plain(r.name).includes(needle)
    })
  }, [regions, visited, q, filter])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line">
        <label className="flex items-center gap-2 border-b border-line px-4 py-3 focus-within:bg-bg md:px-5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${regions.length} ${unit}`}
            aria-label={`Search ${unit}`}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
        <div className="grid grid-cols-3 divide-x divide-line text-xs">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`relative px-3 py-2.5 font-mono uppercase tracking-wide transition-colors ${filter === id ? 'text-surface' : 'text-muted hover:bg-bg hover:text-fg'}`}
            >
              {filter === id && <motion.span layoutId="filter" className="absolute inset-0 bg-fg" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="scroll-thin min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {shown.map((r) => {
          const on = visited.has(r.id)
          return (
            <li key={r.id}>
              <button
                onClick={() => onToggle(r.id)}
                disabled={readOnly}
                aria-pressed={on}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg disabled:cursor-default md:px-5"
              >
                <span
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center border transition-colors ${on ? 'border-accent bg-accent text-surface' : 'border-muted/50 bg-surface'}`}
                >
                  {on && (
                    <motion.svg initial={{ scale: 0.4 }} animate={{ scale: 1 }} viewBox="0 0 16 16" className="h-3 w-3">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </span>
                <span className={on ? 'font-medium' : ''}>{r.name}</span>
              </button>
            </li>
          )
        })}
        {!shown.length && <li className="px-3 py-6 text-center text-sm text-muted">{q ? `Nothing matches “${q}”` : 'Nothing here yet'}</li>}
      </ul>
    </div>
  )
}
