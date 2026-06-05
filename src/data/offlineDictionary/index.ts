import type { OfflineDictionaryData, OfflineDictionaryEntry } from '../../types/dictionaryEntry'
import type { Word } from '../../types/word'
import rawData from './entries.json'

const dictionaryData = rawData as OfflineDictionaryData

const ASSET_BASE = '/dictionary'

export const offlineDictionaryMeta = dictionaryData.meta

function resolveImageUrl(file: string) {
  return `${ASSET_BASE}/images/${file}`
}

function resolveWordAudioUrl(file: string) {
  return `${ASSET_BASE}/audio/words/${file}`
}

function resolveSentenceAudioUrl(file: string) {
  return `${ASSET_BASE}/audio/sentences/${file}`
}

export function entryToWord(entry: OfflineDictionaryEntry): Word {
  return {
    id: entry.id,
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    definition: entry.definition,
    example: entry.example.en,
    exampleTranslation: entry.example.zh,
    imageCaption: entry.image.caption,
    imageUrl: resolveImageUrl(entry.image.file),
    wordAudioUrl: resolveWordAudioUrl(entry.audio.wordFile),
    sentenceAudioUrl: resolveSentenceAudioUrl(entry.audio.sentenceFile),
  }
}

export const offlineEntries: OfflineDictionaryEntry[] = dictionaryData.entries

export const offlineWordBank: Word[] = offlineEntries.map(entryToWord)

export const offlineWordMap = new Map(offlineWordBank.map((word) => [word.id, word]))

export const offlineWordByTextMap = new Map(
  offlineWordBank.map((word) => [word.word.toLowerCase(), word]),
)

export function getOfflineEntryById(id: string) {
  return offlineEntries.find((entry) => entry.id === id)
}

export function getOfflineWordById(id: string) {
  return offlineWordMap.get(id)
}

export function getOfflineWordsByIds(ids: string[]) {
  return ids.map((id) => offlineWordMap.get(id)).filter((word): word is Word => Boolean(word))
}

export function searchOfflineWords(query: string): Word[] {
  const trimmed = query.trim()
  if (!trimmed) return offlineWordBank

  const lower = trimmed.toLowerCase()
  return offlineWordBank.filter(
    (item) =>
      item.word.toLowerCase().includes(lower) ||
      item.definition.includes(trimmed) ||
      item.example.toLowerCase().includes(lower) ||
      item.exampleTranslation.includes(trimmed),
  )
}

export function getAllOfflineWords() {
  return offlineWordBank
}
