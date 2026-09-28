import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAPS } from '../data/maps'

const KEY = 'btm-visited'
const NAME_KEY = 'btm-name'
const empty = () => Object.fromEntries(MAPS.map((m) => [m.id, []]))

const load = () => {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return empty()
  }
}
const store = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode — just won't persist */
  }
}

/** Reads a shared map from the URL hash: #w=356,250&i=mh,ka&u=06&n=Rachit */
function readShared() {
  const h = window.location.hash.slice(1)
  if (!h) return null
  const p = new URLSearchParams(h)
  if (!MAPS.some((m) => p.has(m.key))) return null
  const visited = empty()
  for (const m of MAPS) visited[m.id] = (p.get(m.key) || '').split(',').filter(Boolean)
  return { visited, name: p.get('n') || '' }
}

/** Builds a link that opens this exact map, read-only, for someone else. */
export function shareLink(visited, name) {
  const p = new URLSearchParams()
  for (const m of MAPS) if (visited[m.id]?.length) p.set(m.key, visited[m.id].join(','))
  if (name) p.set('n', name)
  // URLSearchParams escapes commas; they're safe in a hash, so keep links short
  return `${window.location.origin}${window.location.pathname}#${p.toString().replaceAll('%2C', ',')}`
}

/**
 * Your visited places per map, saved in localStorage.
 * If the page was opened from a shared link, it shows that map instead
 * (read-only) until you choose "Make my own".
 */
export function useVisited() {
  const [shared, setShared] = useState(readShared)
  const [mine, setMine] = useState(load)
  const [name, setNameState] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => store(KEY, JSON.stringify(mine)), [mine])

  const visited = shared ? shared.visited : mine
  const sets = useMemo(() => Object.fromEntries(Object.entries(visited).map(([k, v]) => [k, new Set(v)])), [visited])

  const toggle = useCallback(
    (mapId, id) => {
      if (shared) return
      setMine((prev) => {
        const cur = new Set(prev[mapId])
        cur.has(id) ? cur.delete(id) : cur.add(id)
        return { ...prev, [mapId]: [...cur] }
      })
    },
    [shared],
  )

  const clear = useCallback((mapId) => setMine((prev) => ({ ...prev, [mapId]: [] })), [])

  const setName = useCallback((n) => {
    setNameState(n)
    store(NAME_KEY, n)
  }, [])

  const leaveShared = useCallback(() => {
    history.replaceState(null, '', window.location.pathname)
    setShared(null)
  }, [])

  return { visited, sets, toggle, clear, name: shared ? shared.name : name, setName, shared: !!shared, leaveShared }
}
