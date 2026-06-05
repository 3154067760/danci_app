import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useWordBank } from './WordBankContext'
import type { Dictionary } from '../types/dictionary'
import type { Word } from '../types/word'
import {
  createDefaultState,
  createDictionaryId,
  hydrateDictionaryState,
  loadDictionaryState,
  saveDictionaryStateToFile,
  touchDictionary,
} from '../utils/dictionaries'

interface DictionaryContextValue {
  dictionaries: Dictionary[]
  activeDictionary: Dictionary
  activeWords: Word[]
  createDictionary: (name: string, description?: string) => Dictionary
  deleteDictionary: (id: string) => void
  renameDictionary: (id: string, name: string) => void
  setActiveDictionary: (id: string) => void
  addWordsToDictionary: (dictionaryId: string, wordIds: string[]) => void
  removeWordFromDictionary: (dictionaryId: string, wordId: string) => void
  isWordInDictionary: (dictionaryId: string, wordId: string) => boolean
  getDictionaryWords: (dictionaryId: string) => Word[]
  reloadDictionaryState: () => Promise<void>
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null)

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const { wordBank, getWordsByIds } = useWordBank()
  const [state, setState] = useState(() => loadDictionaryState())

  useEffect(() => {
    void saveDictionaryStateToFile(state)
  }, [state])

  const activeDictionary = useMemo(() => {
    return state.dictionaries.find((item) => item.id === state.activeDictionaryId) ?? state.dictionaries[0]
  }, [state])

  const activeWords = useMemo(
    () => getWordsByIds(activeDictionary?.wordIds ?? []),
    [activeDictionary, getWordsByIds],
  )

  const createDictionary = useCallback((name: string, description?: string) => {
    const trimmed = name.trim()
    const dictionary: Dictionary = {
      id: createDictionaryId(),
      name: trimmed || '未命名词书',
      description,
      wordIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setState((prev) => ({
      ...prev,
      dictionaries: [dictionary, ...prev.dictionaries],
    }))

    return dictionary
  }, [])

  const deleteDictionary = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.dictionaries.find((item) => item.id === id)
      if (!target || target.isBuiltin) return prev

      const dictionaries = prev.dictionaries.filter((item) => item.id !== id)
      const nextList = dictionaries.length > 0 ? dictionaries : createDefaultState().dictionaries
      const activeDictionaryId =
        prev.activeDictionaryId === id ? nextList[0].id : prev.activeDictionaryId

      return { dictionaries: nextList, activeDictionaryId }
    })
  }, [])

  const renameDictionary = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    setState((prev) => ({
      ...prev,
      dictionaries: prev.dictionaries.map((item) =>
        item.id === id ? touchDictionary({ ...item, name: trimmed }) : item,
      ),
    }))
  }, [])

  const setActiveDictionary = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.dictionaries.some((item) => item.id === id)) return prev
      return { ...prev, activeDictionaryId: id }
    })
  }, [])

  const addWordsToDictionary = useCallback((dictionaryId: string, wordIds: string[]) => {
    const validIds = wordIds.filter((id) => wordBank.some((word) => word.id === id))
    if (validIds.length === 0) return

    setState((prev) => ({
      ...prev,
      dictionaries: prev.dictionaries.map((item) => {
        if (item.id !== dictionaryId) return item
        const merged = Array.from(new Set([...item.wordIds, ...validIds]))
        return touchDictionary({ ...item, wordIds: merged })
      }),
    }))
  }, [wordBank])

  const removeWordFromDictionary = useCallback((dictionaryId: string, wordId: string) => {
    setState((prev) => ({
      ...prev,
      dictionaries: prev.dictionaries.map((item) => {
        if (item.id !== dictionaryId) return item
        return touchDictionary({
          ...item,
          wordIds: item.wordIds.filter((id) => id !== wordId),
        })
      }),
    }))
  }, [])

  const isWordInDictionary = useCallback(
    (dictionaryId: string, wordId: string) => {
      const dictionary = state.dictionaries.find((item) => item.id === dictionaryId)
      return dictionary?.wordIds.includes(wordId) ?? false
    },
    [state.dictionaries],
  )

  const getDictionaryWords = useCallback(
    (dictionaryId: string) => {
      const dictionary = state.dictionaries.find((item) => item.id === dictionaryId)
      return getWordsByIds(dictionary?.wordIds ?? [])
    },
    [state.dictionaries, getWordsByIds],
  )

  const reloadDictionaryState = useCallback(async () => {
    const next = await hydrateDictionaryState()
    setState(next)
  }, [])

  if (!activeDictionary) {
    return null
  }

  return (
    <DictionaryContext.Provider
      value={{
        dictionaries: state.dictionaries,
        activeDictionary,
        activeWords,
        createDictionary,
        deleteDictionary,
        renameDictionary,
        setActiveDictionary,
        addWordsToDictionary,
        removeWordFromDictionary,
        isWordInDictionary,
        getDictionaryWords,
        reloadDictionaryState,
      }}
    >
      {children}
    </DictionaryContext.Provider>
  )
}

export function useDictionaries() {
  const context = useContext(DictionaryContext)
  if (!context) {
    throw new Error('useDictionaries must be used within DictionaryProvider')
  }
  return context
}
