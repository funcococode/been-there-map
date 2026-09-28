import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ACCENT_KEY, DEFAULT_ACCENT, MODES, MODE_KEY, getAccent } from '../lib/themes'

const ThemeContext = createContext(null)
/** { palette, accentId, mode, setAccent, toggleMode } — palette values are resolved hex colours */
export const useTheme = () => useContext(ThemeContext)

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode — preference just won't persist */
  }
}
const systemMode = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function ThemeProvider({ children }) {
  const [accentId, setAccentId] = useState(() => getAccent(read(ACCENT_KEY, DEFAULT_ACCENT)).id)
  const [mode, setMode] = useState(() => read(MODE_KEY, systemMode()))
  const palette = { ...MODES[mode], accent: getAccent(accentId)[mode] }

  useEffect(() => {
    const root = document.documentElement
    root.dataset.accent = accentId
    root.dataset.mode = mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', MODES[mode].bg)
    save(ACCENT_KEY, accentId)
    save(MODE_KEY, mode)
  }, [accentId, mode])

  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ palette, accentId, mode, setAccent: setAccentId, toggleMode }}>{children}</ThemeContext.Provider>
  )
}
