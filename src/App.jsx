import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import MapCanvas from './components/MapCanvas'
import PosterStudio from './components/PosterStudio'
import RegionList from './components/RegionList'
import { AccentPicker, ModeToggle } from './components/ThemeControls'
import { MAPS, getMap } from './data/maps'
import { shareLink, useVisited } from './hooks/useVisited'
import { loadMap } from './lib/geo'

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }

export default function App() {
  const { visited, sets, toggle, clear, name, setName, shared, leaveShared } = useVisited()
  const [mapId, setMapId] = useState(() => {
    // open a shared link on the first map that has something on it
    const p = new URLSearchParams(window.location.hash.slice(1))
    return MAPS.find((m) => p.get(m.key))?.id ?? 'world'
  })
  const [data, setData] = useState(null)
  const [studio, setStudio] = useState(false)
  const [toast, setToast] = useState('')
  const map = getMap(mapId)
  const set = sets[mapId]

  useEffect(() => {
    let live = true
    loadMap(map).then((d) => live && setData({ id: map.id, ...d }))
    return () => {
      live = false
    }
  }, [map])

  const onToggle = useCallback((id) => toggle(mapId, id), [toggle, mapId])
  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(visited, name))
      flash('Link copied')
    } catch {
      flash('Couldn’t copy')
    }
  }

  const ready = data?.id === mapId
  const total = ready ? data.regions.length : 0
  const stat = ready ? map.stat(set, data.regions) : null
  const progress = total ? set.size / total : 0

  return (
    <div className="min-h-svh pb-28">
      <motion.div {...fade} className="mx-auto max-w-6xl px-3 pt-3 md:px-8 md:pt-6">
        <div className="card">
          {/* ── nav ─────────────────────────────────────────── */}
          <header className="flex items-stretch divide-x divide-line">
            <a href="./" className="flex items-center gap-3 px-4 py-3 md:px-5">
              <Logo />
              <span className="hidden font-semibold tracking-tight min-[400px]:inline">Been There</span>
            </a>
            <p className="label hidden flex-1 items-center px-5 md:flex">Personal travel map</p>
            <div className="ml-auto flex items-center px-3 md:ml-0 md:px-4">
              <AccentPicker className="gap-0.5 sm:gap-1.5" />
            </div>
            <ModeToggle />
          </header>

          {/* shared-link banner */}
          <AnimatePresence initial={false}>
            {shared && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-accent/10 py-2 pl-4 pr-2 md:pl-5">
                  <p className="text-sm">
                    You’re viewing <span className="font-semibold">{name ? `${name}’s` : 'a friend’s'}</span> map.
                  </p>
                  <button onClick={leaveShared} className="btn btn-accent py-1.5">
                    Make my own
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── hero ────────────────────────────────────────── */}
          <section className="grid border-t border-line md:grid-cols-12">
            <h1 className="px-4 pb-4 pt-8 text-4xl font-semibold leading-[0.95] tracking-[-0.045em] md:col-span-8 md:px-5 md:pb-6 md:pt-14 md:text-7xl">
              Where have
              <br />
              you been?
            </h1>
            <div className="flex flex-col justify-end border-t border-line px-4 py-4 md:col-span-4 md:border-l md:border-t-0 md:px-5 md:py-6">
              <p className="label mb-2">{shared ? 'Shared map' : 'How it works'}</p>
              <p className="text-sm text-muted md:text-base">
                {shared
                  ? 'Every coloured shape is somewhere they’ve been.'
                  : 'Tap the places you’ve visited to colour them in. Turn it into a clean poster when you’re done.'}
              </p>
            </div>
          </section>

          {/* ── map switcher ────────────────────────────────── */}
          <nav className="grid grid-cols-3 divide-x divide-line border-t border-line" aria-label="Choose a map">
            {MAPS.map((m, i) => {
              const active = m.id === mapId
              return (
                <button
                  key={m.id}
                  onClick={() => setMapId(m.id)}
                  aria-current={active}
                  className={`relative flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium transition-colors md:px-5 md:py-4 ${active ? 'bg-bg text-fg' : 'text-muted hover:bg-bg/60 hover:text-fg'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="tab"
                      className="absolute inset-x-0 top-0 h-[3px] bg-accent"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="flex items-baseline gap-2">
                    <span className="hidden font-mono text-[11px] text-muted sm:inline">0{i + 1}</span>
                    {m.label}
                  </span>
                  <span className={`font-mono text-xs tabular-nums ${sets[m.id].size ? 'text-accent' : 'text-muted'}`}>
                    {String(sets[m.id].size).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* ── map + panel ─────────────────────────────────── */}
          <main className="grid border-t border-line lg:grid-cols-12">
            <section className="grid-paper relative overflow-hidden lg:col-span-8 lg:border-r lg:border-line">
              <div className="aspect-[4/3] w-full md:aspect-auto md:h-[min(68svh,640px)]">
                <AnimatePresence mode="wait">
                  {ready ? (
                    <motion.div
                      key={mapId}
                      className="h-full w-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <MapCanvas mapId={mapId} tiny={map.tiny} data={data} visited={set} onToggle={onToggle} readOnly={shared} />
                    </motion.div>
                  ) : (
                    <motion.div key="loading" className="label grid h-full place-items-center" exit={{ opacity: 0 }}>
                      Loading map…
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="label pointer-events-none absolute left-0 top-0 hidden border-b border-r border-line bg-surface px-3 py-2 md:block">
                {shared ? 'View only' : 'Click to colour in · drag to pan · ⌘/ctrl + scroll to zoom'}
              </p>
            </section>

            <aside className="flex flex-col border-t border-line lg:col-span-4 lg:h-[min(68svh,640px)] lg:border-t-0">
              {/* stats */}
              <div className="grid grid-cols-2 divide-x divide-line">
                <div className="px-4 py-4 md:px-5 md:py-5">
                  <p className="label">{map.unit[1]}</p>
                  <p className="mt-2 flex items-baseline gap-1 text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
                    <Counter value={set.size} />
                    <span className="font-mono text-sm font-normal text-muted">/{total || '–'}</span>
                  </p>
                </div>
                <div className="px-4 py-4 md:px-5 md:py-5">
                  <p className="label">{stat ? stat.label : ' '}</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-accent tabular-nums md:text-5xl">{stat?.value ?? '–'}</p>
                </div>
              </div>
              <div className="h-2 border-y border-line bg-land">
                <motion.div
                  className="h-full bg-accent"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>

              {/* list */}
              <div className="flex h-[440px] flex-col overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
                {ready && (
                  <RegionList key={mapId} regions={data.regions} visited={set} onToggle={onToggle} readOnly={shared} unit={map.unit[1]} />
                )}
              </div>
            </aside>
          </main>

          {/* ── footer ──────────────────────────────────────── */}
          <footer className="flex flex-col divide-y divide-line border-t border-line text-xs text-muted md:flex-row md:divide-x md:divide-y-0">
            <p className="flex-1 px-4 py-3 md:px-5">
              Saved in this browser only · Maps: Natural Earth, US Census,{' '}
              <a className="underline underline-offset-2 hover:text-fg" href="https://github.com/VictorCazanave/svg-maps" target="_blank" rel="noreferrer">
                svg-maps
              </a>{' '}
              (CC BY 4.0)
            </p>
            {!shared && set.size > 0 && (
              <button
                onClick={() => window.confirm(`Clear all your ${map.label} ${map.unit[1]}?`) && clear(mapId)}
                className="px-4 py-3 text-left transition-colors hover:bg-bg hover:text-fg md:px-5"
              >
                Clear {map.label}
              </button>
            )}
          </footer>
        </div>
      </motion.div>

      {/* ── floating action bar ─────────────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 28 }}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      >
        <div className="pointer-events-auto flex items-stretch divide-x divide-line border border-line bg-surface shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)]">
          <button onClick={copyLink} className="btn min-w-[108px] text-muted hover:bg-bg hover:text-fg">
            {toast || 'Copy link'}
          </button>
          <button onClick={() => setStudio(true)} className="btn btn-accent group px-5">
            Create poster
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {studio && (
          <PosterStudio
            initialMap={mapId}
            visited={visited}
            sets={sets}
            name={name}
            setName={setName}
            readOnly={shared}
            onClose={() => setStudio(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center bg-accent text-surface">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c-2.8 2.8-2.8 13.2 0 16M12 4c2.8 2.8 2.8 13.2 0 16" />
      </svg>
    </span>
  )
}

/** Number that slides when it changes. */
function Counter({ value }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '60%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-60%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
