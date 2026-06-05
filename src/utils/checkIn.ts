import type { CheckInRecord, CheckInStore } from '../types/checkIn'
import { hydrateLocalData, persistLocalData } from './localData'
import { getTodayKey } from './studyRecords'

const STORAGE_KEY = 'danci-checkins'

export function loadCheckIns(): CheckInStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCheckIns(store: CheckInStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export async function hydrateCheckIns(): Promise<CheckInStore> {
  return hydrateLocalData('check-ins', [])
}

export async function saveCheckInsToFile(store: CheckInStore) {
  saveCheckIns(store)
  await persistLocalData('check-ins', store)
}

export function getCheckInByDate(store: CheckInStore, dateKey = getTodayKey()) {
  return store.find((item) => item.date === dateKey) ?? null
}

export function hasCheckedInToday(store: CheckInStore, dateKey = getTodayKey()) {
  return store.some((item) => item.date === dateKey)
}

export function createCheckIn(
  store: CheckInStore,
  payload: Omit<CheckInRecord, 'checkedInAt' | 'date'>,
  dateKey = getTodayKey(),
): CheckInStore {
  const filtered = store.filter((item) => item.date !== dateKey)
  const record: CheckInRecord = {
    date: dateKey,
    checkedInAt: Date.now(),
    ...payload,
  }
  return [record, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
}

export function getCheckInStreak(store: CheckInStore) {
  const dateSet = new Set(store.map((item) => item.date))
  let streak = 0
  const cursor = new Date()

  for (;;) {
    const key = getTodayKey(cursor)
    if (!dateSet.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function formatShareDate(dateKey = getTodayKey()) {
  const [year, month, day] = dateKey.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export function buildShareText(record: CheckInRecord, streak: number, wordLabels: string[]) {
  const wordsLine = wordLabels.length > 0 ? `\n今日单词：${wordLabels.join('、')}` : ''
  return `我完成了今日单词打卡！📚
${formatShareDate(record.date)}
连续打卡 ${streak} 天
学习 ${record.wordCount} 个单词，共 ${record.totalCount} 次
词书：${record.dictionaryName}${wordsLine}
#单词学习 #每日打卡`
}
