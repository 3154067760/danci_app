import type { Dictionary, DictionaryState } from '../types/dictionary'
import { hydrateLocalData, persistLocalData } from './localData'

const STORAGE_KEY = 'danci-dictionaries'

const DEFAULT_DICTIONARY_ID = 'dict-default'

export function createDefaultState(): DictionaryState {
  return {
    dictionaries: [
      {
        id: DEFAULT_DICTIONARY_ID,
        name: '默认词书',
        description: '系统内置词书',
        wordIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        isBuiltin: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    activeDictionaryId: DEFAULT_DICTIONARY_ID,
  }
}

export function loadDictionaryState(): DictionaryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()

    const parsed = JSON.parse(raw) as DictionaryState
    if (!Array.isArray(parsed.dictionaries) || !parsed.activeDictionaryId) {
      return createDefaultState()
    }

    const hasActive = parsed.dictionaries.some((item) => item.id === parsed.activeDictionaryId)
    if (!hasActive && parsed.dictionaries.length > 0) {
      parsed.activeDictionaryId = parsed.dictionaries[0].id
    }

    return parsed
  } catch {
    return createDefaultState()
  }
}

export function saveDictionaryState(state: DictionaryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export async function hydrateDictionaryState(): Promise<DictionaryState> {
  const fromFile = await hydrateLocalData<DictionaryState | null>('dictionaries', null)
  if (fromFile && Array.isArray(fromFile.dictionaries) && fromFile.activeDictionaryId) {
    return normalizeDictionaryState(fromFile)
  }
  return loadDictionaryState()
}

export async function saveDictionaryStateToFile(state: DictionaryState) {
  saveDictionaryState(state)
  await persistLocalData('dictionaries', state)
}

function normalizeDictionaryState(parsed: DictionaryState): DictionaryState {
  const hasActive = parsed.dictionaries.some((item) => item.id === parsed.activeDictionaryId)
  if (!hasActive && parsed.dictionaries.length > 0) {
    return { ...parsed, activeDictionaryId: parsed.dictionaries[0].id }
  }
  return parsed
}

export function createDictionaryId() {
  return `dict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function touchDictionary(dictionary: Dictionary): Dictionary {
  return { ...dictionary, updatedAt: Date.now() }
}
