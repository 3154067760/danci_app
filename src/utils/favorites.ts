import { hydrateLocalData, persistLocalData } from './localData'

const STORAGE_KEY = 'danci-favorites'

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export async function hydrateFavorites(): Promise<string[]> {
  return hydrateLocalData('favorites', [])
}

export async function saveFavoritesToFile(ids: string[]) {
  saveFavorites(ids)
  await persistLocalData('favorites', ids)
}
