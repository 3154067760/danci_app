import { hydrateLocalData, persistLocalData } from './localData'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'danci-theme'

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed === 'light' || parsed === 'dark') return parsed
    } catch {
      // ignore
    }
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a0f0d' : '#f4f7f6')
  }
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}

export async function hydrateTheme(): Promise<Theme | null> {
  return hydrateLocalData<Theme | null>('theme', null)
}

export async function saveThemeToFile(theme: Theme) {
  saveTheme(theme)
  await persistLocalData('theme', theme)
}
