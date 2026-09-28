import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EASE } from '../lib/motion'
import { measureMarkers } from '../lib/geo'

const MAX_ZOOM = 8
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * The interactive map. Tap a region to toggle it; drag to pan and
 * pinch / ctrl-scroll / the +− buttons to zoom. Tiny places get a
 * square marker so they can still be tapped.
 */
export default function MapCanvas({ mapId, tiny, data, visited, onToggle, readOnly }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [markers, setMarkers] = useState({})
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const [hover, setHover] = useState(null) // { id, x, y }
  const [stamps, setStamps] = useState([])
  const gesture = useRef({ pointers: new Map(), moved: 0, start: null, pinch: null })
  const [, , vbW, vbH] = data.viewBox.split(' ').map(Number)
  const names = useRef({})
  names.current = Object.fromEntries(data.regions.map((r) => [r.id, r.name]))

  useLayoutEffect(() => {
    setMarkers(measureMarkers(mapId, svgRef.current, data.viewBox, tiny))
    setView({ k: 1, x: 0, y: 0 })
  }, [mapId, data.viewBox, tiny])

  /* ── zoom helpers (x/y are in viewBox units) ─────────────── */
  const toSvg = useCallback(
    (clientX, clientY) => {
      const r = svgRef.current.getBoundingClientRect()
      // the svg keeps its aspect ratio, so one scale works for both axes
      const s = Math.max(vbW / r.width, vbH / r.height)
      const ox = (r.width * s - vbW) / 2
      const oy = (r.height * s - vbH) / 2
      return [(clientX - r.left) * s - ox, (clientY - r.top) * s - oy, s]
    },
    [vbW, vbH],
  )

  const zoomAt = useCallback(
    (factor, cx = vbW / 2, cy = vbH / 2) =>
      setView((v) => {
        const k = clamp(v.k * factor, 1, MAX_ZOOM)
        if (k === 1) return { k: 1, x: 0, y: 0 }
        const f = k / v.k
        return fit({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }, vbW, vbH)
      }),
    [vbW, vbH],
  )

  // ctrl + wheel (and trackpad pinch, which arrives as ctrl + wheel)
  useEffect(() => {
    const el = svgRef.current
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const [x, y] = toSvg(e.clientX, e.clientY)
      zoomAt(Math.exp(-e.deltaY * 0.01), x, y)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [toSvg, zoomAt])

  /* ── pointer gestures: tap, drag-pan, two-finger pinch ───── */
  const onPointerDown = (e) => {
    const g = gesture.current
    g.pointers.set(e.pointerId, [e.clientX, e.clientY])
    if (g.pointers.size === 1) {
      g.moved = 0
      g.start = { x: e.clientX, y: e.clientY, view }
      g.target = e.target.dataset?.id
    } else if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()]
      g.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: view.k }
      g.moved = 99 // a pinch is never a tap
    }
  }
  const onPointerMove = (e) => {
    const g = gesture.current
    if (e.pointerType === 'mouse') {
      const id = e.target.dataset?.id
      const r = wrapRef.current.getBoundingClientRect()
      setHover(id ? { id, x: e.clientX - r.left, y: e.clientY - r.top } : null)
    }
    if (!g.pointers.has(e.pointerId)) return
    g.pointers.set(e.pointerId, [e.clientX, e.clientY])

    if (g.pointers.size === 2 && g.pinch) {
      const [a, b] = [...g.pointers.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      const [cx, cy] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
      zoomAt((g.pinch.k * (d / g.pinch.d)) / view.k, cx, cy)
      return
    }
    const dx = e.clientX - g.start.x
    const dy = e.clientY - g.start.y
    g.moved = Math.max(g.moved, Math.hypot(dx, dy))
    if (g.start.view.k > 1 && g.moved > 4) {
      if (!svgRef.current.hasPointerCapture(e.pointerId)) svgRef.current.setPointerCapture(e.pointerId)
      const [, , s] = toSvg(0, 0)
      const k = g.start.view.k
      setView(fit({ k, x: g.start.view.x + (dx * s) / k, y: g.start.view.y + (dy * s) / k }, vbW, vbH))
    }
  }
  const onPointerUp = (e) => {
    const g = gesture.current
    g.pointers.delete(e.pointerId)
    if (g.pointers.size < 2) g.pinch = null
    if (g.pointers.size === 0 && g.moved < 6 && g.target && !readOnly) {
      const id = g.target
      const r = wrapRef.current.getBoundingClientRect()
      const adding = !visited.has(id)
      onToggle(id)
      setStamps((s) => [...s.slice(-6), { key: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top, adding }])
    }
    if (g.pointers.size === 0) g.target = null
  }

  const hoverName = hover && names.current[hover.id]
  const markerSize = vbW / 140 / Math.sqrt(view.k)

  return (
    <div ref={wrapRef} className={`relative h-full w-full select-none overflow-hidden p-3 pt-12 md:p-12 ${readOnly ? 'readonly' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={data.viewBox}
        className="h-full w-full touch-pan-y"
        style={{ touchAction: view.k > 1 ? 'none' : 'pan-y', overflow: 'visible' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => {
          setHover(null)
          if (e.pointerType === 'mouse') gesture.current.pointers.delete(e.pointerId)
        }}
        role="img"
        aria-label="Map — tap a place to mark it as visited"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transition: 'transform 0.08s linear' }}>
          {data.regions.map((r) => (
            <path key={r.id} data-id={r.id} d={r.d} className={`region ${visited.has(r.id) ? 'on' : ''}`} />
          ))}
          {Object.entries(markers).map(([id, [x, y]]) => (
            <rect
              key={id}
              data-id={id}
              x={x - markerSize / 2}
              y={y - markerSize / 2}
              width={markerSize}
              height={markerSize}
              className={`region ${visited.has(id) ? 'on' : ''}`}
              style={{ stroke: visited.has(id) ? 'var(--color-surface)' : 'var(--color-muted)', strokeWidth: 1 }}
            />
          ))}
        </g>
      </svg>

      {/* stamp: a square that bursts out from where you tapped */}
      <AnimatePresence>
        {stamps.map((s) => (
          <motion.span
            key={s.key}
            aria-hidden
            className={`pointer-events-none absolute h-12 w-12 ${s.adding ? 'bg-accent/30' : 'border border-muted'}`}
            style={{ left: s.x - 24, top: s.y - 24 }}
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: s.adding ? 2.2 : 1.3, opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE.expo }}
            onAnimationComplete={() => setStamps((all) => all.filter((x) => x.key !== s.key))}
          />
        ))}
      </AnimatePresence>

      {/* tooltip */}
      {hoverName && (
        <div
          className="pointer-events-none absolute z-10 border border-line bg-surface px-3 py-2 text-sm shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]"
          style={{
            left: hover.x + 14,
            top: hover.y + 14,
            transform: hover.x > (wrapRef.current?.clientWidth ?? 0) - 220 ? 'translateX(calc(-100% - 28px))' : undefined,
          }}
        >
          <span className="block font-medium leading-tight">{hoverName}</span>
          <span className={`font-mono text-[11px] uppercase tracking-wide ${visited.has(hover.id) ? 'text-accent' : 'text-muted'}`}>
            {visited.has(hover.id) ? 'Been there' : readOnly ? 'Not yet' : 'Click to add'}
          </span>
        </div>
      )}

      {/* zoom controls */}
      <div className="absolute right-0 top-0 flex divide-x divide-line border-b border-l border-line bg-surface">
        {[
          ['+', 'Zoom in', () => zoomAt(1.6)],
          ['−', 'Zoom out', () => zoomAt(1 / 1.6)],
          ['↺', 'Reset view', () => setView({ k: 1, x: 0, y: 0 })],
        ].map(([label, title, fn]) => (
          <button
            key={title}
            onClick={fn}
            title={title}
            aria-label={title}
            className={`grid h-9 w-9 place-items-center text-base text-muted transition-colors hover:bg-bg hover:text-fg`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** keep the zoomed map covering the viewport (no panning into empty space) */
function fit(v, w, h) {
  return { k: v.k, x: clamp(v.x, w - w * v.k, 0), y: clamp(v.y, h - h * v.k, 0) }
}
