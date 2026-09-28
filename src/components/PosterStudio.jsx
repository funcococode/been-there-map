import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MAPS, getMap } from '../data/maps'
import { useTheme } from '../hooks/useTheme'
import { shareLink } from '../hooks/useVisited'
import { download, posterToPng, shareImage } from '../lib/exportPoster'
import { cachedMarkers, loadMap, measureMarkers } from '../lib/geo'
import { getAccent } from '../lib/themes'
import Poster, { FORMATS, PAPER, useFontsReady } from './Poster'
import { AccentPicker } from './ThemeControls'

const ease = [0.22, 1, 0.36, 1]

/** Poster editor: a sheet with a live preview and a few quiet options. */
export default function PosterStudio({ initialMap, visited, sets, name, setName, readOnly, onClose }) {
  const { accentId } = useTheme()
  const [mapId, setMapId] = useState(initialMap)
  const [format, setFormat] = useState(FORMATS[0])
  const [dark, setDark] = useState(false)
  const [showList, setShowList] = useState(true)
  const [data, setData] = useState(null)
  const [markers, setMarkers] = useState(() => cachedMarkers(initialMap))
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState('')
  const [box, setBox] = useState(null)
  const posterRef = useRef(null)
  const measureRef = useRef(null)
  const stageRef = useRef(null)
  const fonts = useFontsReady()
  const map = getMap(mapId)
  const year = String(new Date().getFullYear())
  const accent = getAccent(accentId)[dark ? 'dark' : 'light']

  useEffect(() => {
    let live = true
    setData(null)
    setMarkers(cachedMarkers(mapId))
    loadMap(map).then((d) => live && setData(d))
    return () => {
      live = false
    }
  }, [map, mapId])

  // fit the preview inside the stage, whatever the poster's aspect ratio
  useLayoutEffect(() => {
    const el = stageRef.current
    const ro = new ResizeObserver(() => {
      const pad = parseFloat(getComputedStyle(el).paddingLeft) * 2
      setBox({ w: el.clientWidth - pad, h: el.clientHeight - pad })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // maps you haven't opened yet need their tiny-place markers measured once
  useLayoutEffect(() => {
    if (data && !markers && measureRef.current) setMarkers(measureMarkers(mapId, measureRef.current, data.viewBox, map.tiny))
  }, [data, markers, mapId, map.tiny])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const flash = (msg) => {
    setNote(msg)
    setTimeout(() => setNote(''), 2400)
  }
  const filename = `been-there-${mapId}-${format.id}.png`

  const run = async (kind) => {
    if (!posterRef.current || busy) return
    setBusy(kind)
    try {
      const blob = await posterToPng(posterRef.current)
      if (kind === 'share') {
        const shared = await shareImage(blob, filename, `I’ve been to ${sets[mapId].size} ${map.unit[1]}! Colour in yours:`)
        if (!shared) {
          download(blob, filename)
          flash('Sharing isn’t available here, so it was downloaded')
        }
      } else {
        download(blob, filename)
        flash('Poster downloaded')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') flash('Couldn’t create the image. Try again?')
    } finally {
      setBusy(null)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(visited, name))
      flash('Link copied')
    } catch {
      flash('Couldn’t copy the link')
    }
  }

  const w = box && Math.min(box.w, (box.h * format.w) / format.h)

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Create poster">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative flex h-[94svh] w-full max-w-6xl flex-col overflow-hidden border border-line bg-surface shadow-2xl md:h-[min(88svh,860px)]"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.45, ease }}
      >
        <header className="flex items-stretch justify-between border-b border-line">
          <div className="px-5 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight">Create poster</h2>
            <p className="label mt-0.5">Pick a size and style, then download or share</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid w-14 place-items-center border-l border-line text-muted transition-colors hover:bg-bg hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_340px] md:grid-rows-1">
          {/* preview */}
          <div ref={stageRef} className="grid-paper relative flex min-h-0 items-center justify-center p-5 md:p-10">
            {data && fonts && w ? (
              <motion.div
                key={`${mapId}-${format.id}-${dark}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="overflow-hidden shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)] ring-1 ring-line"
                style={{ width: w, background: PAPER[dark ? 'dark' : 'light'].bg }}
              >
                <Poster
                  ref={posterRef}
                  map={map}
                  data={data}
                  visited={sets[mapId]}
                  markers={markers ?? {}}
                  name={name}
                  format={format}
                  accent={accent}
                  dark={dark}
                  showList={showList}
                  year={year}
                />
              </motion.div>
            ) : (
              <p className="label">Preparing preview…</p>
            )}
            {data && !markers && (
              <svg ref={measureRef} viewBox={data.viewBox} className="pointer-events-none absolute h-[600px] w-[1000px] opacity-0" aria-hidden>
                {data.regions.map((r) => (
                  <path key={r.id} data-id={r.id} d={r.d} />
                ))}
              </svg>
            )}
          </div>

          {/* controls */}
          <div className="scroll-thin flex max-h-[46svh] min-h-0 flex-col overflow-y-auto border-t border-line md:max-h-none md:border-l md:border-t-0">
            <div className="space-y-6 p-5 md:p-6">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 22))}
                  disabled={readOnly}
                  placeholder="Your name (optional)"
                  className="w-full border border-line bg-bg px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                />
              </Field>
              <Field label="Map">
                <Segmented id="map" options={MAPS.map((m) => [m.id, m.label])} value={mapId} onChange={setMapId} />
              </Field>
              <Field label="Size">
                <Segmented id="size" options={FORMATS.map((f) => [f.id, `${f.label} ${f.hint}`])} value={format.id} onChange={(id) => setFormat(FORMATS.find((f) => f.id === id))} />
              </Field>
              <Field label="Style">
                <Segmented
                  id="style"
                  options={[
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                  ]}
                  value={dark ? 'dark' : 'light'}
                  onChange={(v) => setDark(v === 'dark')}
                />
              </Field>
              <Field label="Accent">
                <AccentPicker />
              </Field>
              <label className="flex cursor-pointer items-center justify-between text-sm">
                <span>List places on the poster</span>
                <Switch on={showList} onChange={setShowList} />
              </label>
            </div>

            <div className="sticky bottom-0 mt-auto space-y-2 border-t border-line bg-surface p-5 md:p-6">
              <button
                onClick={() => run('download')}
                className="btn btn-accent w-full py-3"
              >
                {busy === 'download' ? 'Rendering…' : 'Download PNG'}
              </button>
              <div className="grid grid-cols-2 divide-x divide-line border border-line">
                <button onClick={() => run('share')} className="btn hover:bg-bg">
                  {busy === 'share' ? 'Rendering…' : 'Share image'}
                </button>
                <button onClick={copyLink} className="btn hover:bg-bg">
                  Copy link
                </button>
              </div>
              <p aria-live="polite" className="label pt-1 text-center normal-case tracking-normal">
                {note || `${format.w * 2} × ${format.h * 2} px`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      {children}
    </div>
  )
}

function Segmented({ id, options, value, onChange }) {
  return (
    <div className="flex divide-x divide-line border border-line" role="radiogroup">
      {options.map(([key, label]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`relative flex-1 px-2 py-2 text-sm transition-colors ${value === key ? 'text-surface' : 'text-muted hover:bg-bg hover:text-fg'}`}
        >
          {value === key && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 bg-fg" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

function Switch({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 border transition-colors ${on ? 'border-accent bg-accent' : 'border-line bg-land'}`}
    >
      <motion.span
        className="absolute top-[1px] h-5 w-5 bg-white"
        animate={{ left: on ? 21 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  )
}
