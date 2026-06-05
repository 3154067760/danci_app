import type { DayStudySummary, StudyStatsOverview, StudyStore } from '../types/study'
import { hydrateLocalData, persistLocalData } from './localData'

const STORAGE_KEY = 'danci-study-records'

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function loadStudyStore(): StudyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function saveStudyStore(store: StudyStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export async function hydrateStudyStore(): Promise<StudyStore> {
  return hydrateLocalData('study-records', {})
}

export async function saveStudyStoreToFile(store: StudyStore) {
  saveStudyStore(store)
  await persistLocalData('study-records', store)
}

export function incrementStudy(store: StudyStore, wordId: string, dateKey = getTodayKey()) {
  const next: StudyStore = { ...store }
  next[dateKey] = { ...next[dateKey], [wordId]: (next[dateKey]?.[wordId] ?? 0) + 1 }
  return next
}

export function getDaySummary(store: StudyStore, dateKey: string): DayStudySummary {
  const dayRecords = store[dateKey] ?? {}
  const words = Object.entries(dayRecords)
    .map(([wordId, count]) => ({ wordId, count }))
    .sort((a, b) => b.count - a.count)

  const totalCount = words.reduce((sum, item) => sum + item.count, 0)

  return {
    date: dateKey,
    totalCount,
    wordCount: words.length,
    words,
  }
}

export function getRecentDays(store: StudyStore, days: number): DayStudySummary[] {
  const result: DayStudySummary[] = []
  const today = new Date()

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    result.push(getDaySummary(store, getTodayKey(date)))
  }

  return result
}

export function getStudyOverview(store: StudyStore): StudyStatsOverview {
  const dates = Object.keys(store)
  let totalSessions = 0
  const uniqueWords = new Set<string>()

  dates.forEach((dateKey) => {
    Object.entries(store[dateKey]).forEach(([wordId, count]) => {
      totalSessions += count
      uniqueWords.add(wordId)
    })
  })

  const today = getDaySummary(store, getTodayKey())

  return {
    todayTotal: today.totalCount,
    todayWordCount: today.wordCount,
    totalDays: dates.filter((dateKey) => Object.keys(store[dateKey]).length > 0).length,
    totalSessions,
    totalWordsLearned: uniqueWords.size,
  }
}

export function formatDisplayDate(dateKey: string) {
  const todayKey = getTodayKey()
  if (dateKey === todayKey) return '今天'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === getTodayKey(yesterday)) return '昨天'

  const [, month, day] = dateKey.split('-')
  return `${Number(month)}月${Number(day)}日`
}
