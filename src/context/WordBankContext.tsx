import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OfflineDictionaryEntry } from '../types/dictionaryEntry'
import { offlineWordBank, entryToWord } from '../data/offlineDictionary'
import type { Word } from '../types/word'
import {
  createCustomWordId,
  findWordByText,
  hydrateCustomWords,
  loadCustomWords,
  saveCustomWordsToFile,
} from '../utils/customWords'

export interface AddCustomWordInput {
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  example: string
  exampleTranslation: string
  imageCaption: string
  imageUrl: string
  wordAudioUrl?: string
  sentenceAudioUrl?: string
}

interface WordBankContextValue {
  wordBank: Word[]
  customWords: Word[]
  addCustomWord: (input: AddCustomWordInput) => Word
  removeCustomWord: (id: string) => void
  getWordById: (id: string) => Word | undefined
  getWordsByIds: (ids: string[]) => Word[]
  searchWords: (query: string) => Word[]
  isCustomWord: (id: string) => boolean
  reloadCustomWords: () => Promise<void>
  reloadBuiltinWords: () => Promise<void>
}

const WordBankContext = createContext<WordBankContextValue | null>(null)

function searchInBank(words: Word[], query: string) {
  const trimmed = query.trim()
  if (!trimmed) return words

  const lower = trimmed.toLowerCase()
  return words.filter(
    (item) =>
      item.word.toLowerCase().includes(lower) ||
      item.definition.includes(trimmed) ||
      item.example.toLowerCase().includes(lower) ||
      item.exampleTranslation.includes(trimmed),
  )
}

export function WordBankProvider({ children }: { children: ReactNode }) {
  const [customWords, setCustomWords] = useState<Word[]>(() => loadCustomWords())
  const [builtinWords, setBuiltinWords] = useState<Word[]>(() => offlineWordBank)

  const persist = useCallback((words: Word[]) => {
    setCustomWords(words)
    void saveCustomWordsToFile(words)
  }, [])

  const reloadBuiltinWords = useCallback(async () => {
    try {
      const res = await fetch('/api/local-data/entries')
      if (!res.ok) return
      const data = (await res.json()) as { entries: OfflineDictionaryEntry[] }
      if (Array.isArray(data.entries)) {
        setBuiltinWords(data.entries.map((entry) => entryToWord(entry)))
      }
    } catch {
      // 静态构建环境继续使用打包时的词库
    }
  }, [])

  useEffect(() => {
    void reloadBuiltinWords()
  }, [reloadBuiltinWords])

  const wordBank = useMemo(() => {
    const customTexts = new Set(customWords.map((item) => item.word.toLowerCase()))
    const merged = builtinWords.filter((item) => !customTexts.has(item.word.toLowerCase()))
    return [...merged, ...customWords]
  }, [builtinWords, customWords])

  const wordMap = useMemo(() => new Map(wordBank.map((word) => [word.id, word])), [wordBank])

  const addCustomWord = useCallback(
    (input: AddCustomWordInput) => {
      const trimmedWord = input.word.trim()
      if (!trimmedWord) throw new Error('请输入单词')
      if (!input.definition.trim()) throw new Error('请输入释义')

      if (findWordByText(customWords, trimmedWord)) {
        throw new Error(`「${trimmedWord}」已在自定义词库中`)
      }

      const entry: Word = {
        id: createCustomWordId(),
        word: trimmedWord,
        phonetic: input.phonetic.trim(),
        partOfSpeech: input.partOfSpeech.trim(),
        definition: input.definition.trim(),
        example: input.example.trim(),
        exampleTranslation: input.exampleTranslation.trim(),
        imageCaption: input.imageCaption.trim() || trimmedWord,
        imageUrl: input.imageUrl,
        wordAudioUrl: input.wordAudioUrl,
        sentenceAudioUrl: input.sentenceAudioUrl,
      }

      persist([...customWords, entry])
      return entry
    },
    [customWords, persist],
  )

  const removeCustomWord = useCallback(
    (id: string) => {
      persist(customWords.filter((item) => item.id !== id))
    },
    [customWords, persist],
  )

  const getWordById = useCallback((id: string) => wordMap.get(id), [wordMap])

  const getWordsByIds = useCallback(
    (ids: string[]) => ids.map((id) => wordMap.get(id)).filter((word): word is Word => Boolean(word)),
    [wordMap],
  )

  const searchWords = useCallback((query: string) => searchInBank(wordBank, query), [wordBank])

  const isCustomWord = useCallback((id: string) => id.startsWith('custom-'), [])

  const reloadCustomWords = useCallback(async () => {
    const words = await hydrateCustomWords()
    setCustomWords(words)
  }, [])

  return (
    <WordBankContext.Provider
      value={{
        wordBank,
        customWords,
        addCustomWord,
        removeCustomWord,
        getWordById,
        getWordsByIds,
        searchWords,
        isCustomWord,
        reloadCustomWords,
        reloadBuiltinWords,
      }}
    >
      {children}
    </WordBankContext.Provider>
  )
}

export function useWordBank() {
  const context = useContext(WordBankContext)
  if (!context) {
    throw new Error('useWordBank must be used within WordBankProvider')
  }
  return context
}
