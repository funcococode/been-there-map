// Small helpers shared by the map and the poster.

const dataCache = new Map()
/** Loads a map's generated JSON once and caches it. */
export function loadMap(map) {
  if (!dataCache.has(map.id)) dataCache.set(map.id, map.load().then((m) => m.default ?? m))
  return dataCache.get(map.id)
}

const markerCache = new Map()
/**
 * Some places (Singapore, Delhi, DC…) are too small to tap on the map.
 * After the paths render we measure them and give tiny ones a square
 * marker at their centre. Cached per map, reused by the poster.
 */
export function measureMarkers(mapId, svg, viewBox, tiny = 0.009) {
  if (markerCache.has(mapId)) return markerCache.get(mapId)
  const [, , vbW] = viewBox.split(' ').map(Number)
  const min = vbW * tiny
  const out = {}
  svg.querySelectorAll('path[data-id]').forEach((p) => {
    const b = p.getBBox()
    if (Math.max(b.width, b.height) < min) out[p.dataset.id] = [b.x + b.width / 2, b.y + b.height / 2]
  })
  markerCache.set(mapId, out)
  return out
}
export const cachedMarkers = (mapId) => markerCache.get(mapId)

/** Mix two hex colours: t = 0 → a, t = 1 → b */
export function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}
