// ─────────────────────────────────────────────────────────────
//  Neutral greys + one accent colour. index.css mirrors these as CSS
//  variables so the page paints correctly before React loads.
// ─────────────────────────────────────────────────────────────
export const MODES = {
  light: { bg: '#fafaf9', surface: '#ffffff', text: '#18181b', muted: '#71717a', line: '#e4e4e7', land: '#e7e5e4' },
  dark: { bg: '#0c0c0e', surface: '#16161a', text: '#f4f4f5', muted: '#a1a1aa', line: '#27272a', land: '#2c2c31' },
}

export const ACCENTS = [
  { id: 'ocean', name: 'Ocean', light: '#2563eb', dark: '#60a5fa' },
  { id: 'coral', name: 'Coral', light: '#ea580c', dark: '#fb8a5c' },
  { id: 'fern', name: 'Fern', light: '#15803d', dark: '#4ade80' },
  { id: 'iris', name: 'Iris', light: '#7c3aed', dark: '#a78bfa' },
  { id: 'rose', name: 'Rose', light: '#e11d48', dark: '#fb7185' },
  { id: 'graphite', name: 'Graphite', light: '#18181b', dark: '#f4f4f5' },
]

export const DEFAULT_ACCENT = 'ocean'
export const ACCENT_KEY = 'btm-accent'
export const MODE_KEY = 'btm-mode'
export const getAccent = (id) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]
