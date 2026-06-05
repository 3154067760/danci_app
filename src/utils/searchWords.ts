import type { Word } from '../types/word'

export function searchWords(query: string, scopeWords: Word[]): Word[] {
  const trimmed = query.trim()
  if (!trimmed) return scopeWords

  const lower = trimmed.toLowerCase()
  return scopeWords.filter(
    (item) =>
      item.word.toLowerCase().includes(lower) ||
      item.definition.includes(trimmed) ||
      item.example.toLowerCase().includes(lower) ||
      item.exampleTranslation.includes(trimmed),
  )
}
