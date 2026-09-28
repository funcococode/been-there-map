import { forwardRef, useEffect, useState } from 'react'
import { mix } from '../lib/geo'

export const FORMATS = [
  { id: 'portrait', label: 'Portrait', hint: '4:5', w: 1080, h: 1350, lines: 3 },
  { id: 'story', label: 'Story', hint: '9:16', w: 1080, h: 1920, lines: 8 },
  { id: 'square', label: 'Square', hint: '1:1', w: 1080, h: 1080, lines: 2 },
]

// print colours for the two poster styles (independent of the page mode)
export const PAPER = {
  light: { bg: '#f7f6f3', text: '#18181b', muted: '#8a8a91', line: '#e2e0db' },
  dark: { bg: '#111113', text: '#f4f4f5', muted: '#8b8b94', line: '#2a2a2f' },
}

const SANS = "'Geist Variable', sans-serif"
const MONO = "'Geist Mono Variable', monospace"

let ctx
function measure(text, size, weight = 400, family = SANS) {
  ctx ??= document.createElement('canvas').getContext('2d')
  ctx.font = `${weight} ${size}px ${family}`
  return ctx.measureText(text).width
}

/** Re-render once the web fonts are ready so measurements are exact. */
export function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load(`300 100px ${SANS}`), document.fonts.load(`500 20px ${SANS}`), document.fonts.load(`400 20px ${MONO}`)]).then(
      () => live && setReady(true),
    )
    return () => {
      live = false
    }
  }, [])
  return ready
}

/** Greedy word-wrap using measured widths. */
function wrap(items, maxW, size, maxLines) {
  const lines = []
  let line = ''
  let used = 0
  for (const item of items) {
    const next = line ? `${line}, ${item}` : item
    if (measure(next, size) <= maxW) {
      line = next
      used++
      continue
    }
    if (lines.length === maxLines - 1) break
    lines.push(line + ',')
    line = item
    used++
  }
  if (line) lines.push(line)
  const rest = items.length - used
  if (rest > 0) lines[lines.length - 1] += ` and ${rest} more`
  return lines
}

/**
 * A minimal print: big light number, the map in one accent colour,
 * three quiet stats. One SVG with explicit colours so it exports as-is.
 */
const Poster = forwardRef(function Poster({ map, data, visited, markers = {}, name, format, accent, dark, showList, year }, ref) {
  const { w: W, h: H } = format
  const c = dark ? PAPER.dark : PAPER.light
  const land = mix(c.bg, c.text, dark ? 0.14 : 0.1)

  const M = 88 // generous margins
  const iw = W - M * 2
  const n = visited.size
  const total = data.regions.length
  const stat = map.stat(visited, data.regions)
  const names = data.regions.filter((r) => visited.has(r.id)).map((r) => r.name)

  /* top line */
  const topY = M + 14
  const who = name.trim() ? `${name.trim()}’s travels` : 'My travels'

  /* number + unit */
  const num = String(n)
  const unitWord = `${n === 1 ? map.posterUnit[0] : map.posterUnit[1]} visited`
  const numRatio = measure(num, 100, 300) / 100

  /* bottom-up: footer, list, stats */
  const footY = H - M
  const listSize = 20
  const listLines = showList && names.length ? wrap(names, iw, listSize, format.lines) : []
  const listH = listLines.length ? listLines.length * 32 + 24 : 0
  const statsH = 96
  const statY = footY - 48 - listH - statsH

  /* map gets what it needs; any spare height goes to the number */
  const [vbX, vbY, vbW, vbH] = data.viewBox.split(' ').map(Number)
  const mapNeed = (iw * vbH) / vbW
  const headTop = topY + 70
  const baseNum = format.id === 'square' ? 180 : 230
  const spare = statY - 48 - headTop - baseNum * 0.74 - 90 - mapNeed
  const numSize = Math.min(spare > 0 ? baseNum + spare * 0.7 : baseNum, iw / numRatio, 520)
  const numY = headTop + numSize * 0.74
  const unitY = numY + 64
  const mapBox = { x: M, y: unitY + 48, w: iw, h: statY - 48 - (unitY + 48) }
  const scale = Math.min(mapBox.w / vbW, mapBox.h / vbH)
  const mk = 12 / scale

  const cells = [
    { big: `${n}/${total}`, small: `${map.unit[1]} on the map` },
    { big: stat.value, small: stat.label },
    { big: year, small: 'last updated' },
  ]
  const cw = iw / 3

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', width: '100%', height: 'auto' }}>
      <rect width={W} height={H} fill={c.bg} />

      {/* top line */}
      <g fontFamily={MONO} fontSize="17" letterSpacing="2.5" fill={c.muted}>
        <text x={M} y={topY}>
          {who.toUpperCase()}
        </text>
        <text x={W - M} y={topY} textAnchor="end">
          {map.label.toUpperCase()} · {year}
        </text>
      </g>
      <line x1={M} x2={W - M} y1={topY + 26} y2={topY + 26} stroke={c.line} strokeWidth="1.5" />

      {/* the number */}
      <text x={M - numSize * 0.04} y={numY} fontFamily={SANS} fontSize={numSize} fontWeight="300" letterSpacing={-numSize * 0.045} fill={c.text}>
        {num}
      </text>
      <text x={M} y={unitY} fontFamily={SANS} fontSize="44" fontWeight="400" letterSpacing="-1" fill={c.text}>
        {unitWord}
        <tspan fill={c.muted}> {map.posterPlace}</tspan>
      </text>

      {/* map */}
      <svg x={mapBox.x} y={mapBox.y} width={mapBox.w} height={mapBox.h} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet">
        <g stroke={c.bg} strokeWidth={1 / scale} strokeLinejoin="round">
          {data.regions.map((r) => (
            <path key={r.id} d={r.d} fill={visited.has(r.id) ? accent : land} />
          ))}
        </g>
        {Object.entries(markers)
          .filter(([id]) => visited.has(id))
          .map(([id, [x, y]]) => (
            <circle key={id} cx={x} cy={y} r={mk / 2} fill={accent} stroke={c.bg} strokeWidth={1.5 / scale} />
          ))}
      </svg>

      {/* stats */}
      <line x1={M} x2={W - M} y1={statY - 24} y2={statY - 24} stroke={c.line} strokeWidth="1.5" />
      {cells.map((cell, i) => (
        <g key={i}>
          <text x={M + cw * i} y={statY + 44} fontFamily={SANS} fontSize="46" fontWeight="500" letterSpacing="-1.5" fill={i === 1 ? accent : c.text}>
            {cell.big}
          </text>
          <text x={M + cw * i} y={statY + 80} fontFamily={SANS} fontSize="18" fill={c.muted}>
            {cell.small.charAt(0).toUpperCase() + cell.small.slice(1)}
          </text>
        </g>
      ))}

      {/* places */}
      {listLines.map((l, i) => (
        <text key={i} x={M} y={statY + statsH + 40 + i * 32} fontFamily={SANS} fontSize={listSize} fill={c.text} opacity="0.75">
          {l}
        </text>
      ))}

      {/* footer */}
      <g fontFamily={MONO} fontSize="15" letterSpacing="2" fill={c.muted}>
        <circle cx={M + 6} cy={footY - 5} r="6" fill={accent} />
        <text x={M + 22} y={footY}>BEEN THERE</text>
        <text x={W - M} y={footY} textAnchor="end">
          {(window.location.host || 'been-there').toUpperCase()}
        </text>
      </g>
    </svg>
  )
})

export default Poster
