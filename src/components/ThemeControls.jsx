import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { ACCENTS } from '../lib/themes'

/** A row of accent colour dots. */
export function AccentPicker({ className = '' }) {
  const { accentId, mode, setAccent } = useTheme()
  return (
    <div className={`flex items-center gap-2 ${className}`} role="radiogroup" aria-label="Accent colour">
      {ACCENTS.map((a) => {
        const on = a.id === accentId
        return (
          <button
            key={a.id}
            role="radio"
            aria-checked={on}
            aria-label={a.name}
            title={a.name}
            onClick={() => setAccent(a.id)}
            className="relative grid h-6 w-6 place-items-center transition-transform hover:scale-110"
          >
            {on && (
              <motion.span
                layoutId="accent-ring"
                className="absolute inset-0 border-2"
                style={{ borderColor: a[mode] }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="h-3.5 w-3.5" style={{ background: a[mode] }} />
          </button>
        )
      })}
    </div>
  )
}

export function ModeToggle({ className = '' }) {
  const { mode, toggleMode } = useTheme()
  const dark = mode === 'dark'
  return (
    <button
      onClick={toggleMode}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`grid min-h-9 w-12 place-items-center self-stretch text-muted transition-colors hover:bg-bg hover:text-fg ${className}`}
    >
      <motion.svg key={mode} initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </motion.svg>
    </button>
  )
}
