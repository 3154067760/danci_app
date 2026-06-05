import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayStudySummary, StudyStatsOverview, StudyStore } from '../types/study'
import type { CheckInRecord, CheckInStore } from '../types/checkIn'
import {
  buildShareText,
  createCheckIn,
  getCheckInByDate,
  getCheckInStreak,
  hasCheckedInToday,
  loadCheckIns,
  saveCheckInsToFile,
} from '../utils/checkIn'
import {
  getDaySummary,
  getRecentDays,
  getStudyOverview,
  getTodayKey,
  incrementStudy,
  loadStudyStore,
  saveStudyStoreToFile,
} from '../utils/studyRecords'

interface CheckInPayload {
  dictionaryName: string
}

interface StudyContextValue {
  store: StudyStore
  checkIns: CheckInStore
  recordStudy: (wordId: string) => void
  getWordCountToday: (wordId: string) => number
  todaySummary: DayStudySummary
  recentDays: DayStudySummary[]
  overview: StudyStatsOverview
  todayCheckIn: CheckInRecord | null
  hasCheckedInToday: boolean
  checkInStreak: number
  checkInToday: (payload: CheckInPayload) => boolean
  buildTodayShareText: (wordLabels: string[]) => string
}

const StudyContext = createContext<StudyContextValue | null>(null)

export function StudyProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StudyStore>(() => loadStudyStore())
  const [checkIns, setCheckIns] = useState<CheckInStore>(() => loadCheckIns())

  useEffect(() => {
    void saveStudyStoreToFile(store)
  }, [store])

  useEffect(() => {
    void saveCheckInsToFile(checkIns)
  }, [checkIns])

  const recordStudy = useCallback((wordId: string) => {
    setStore((prev) => incrementStudy(prev, wordId))
  }, [])

  const getWordCountToday = useCallback(
    (wordId: string) => store[getTodayKey()]?.[wordId] ?? 0,
    [store],
  )

  const todaySummary = useMemo(() => getDaySummary(store, getTodayKey()), [store])
  const recentDays = useMemo(() => getRecentDays(store, 7), [store])
  const overview = useMemo(() => getStudyOverview(store), [store])
  const todayCheckIn = useMemo(() => getCheckInByDate(checkIns, getTodayKey()), [checkIns])
  const checkedInToday = useMemo(() => hasCheckedInToday(checkIns, getTodayKey()), [checkIns])
  const checkInStreak = useMemo(() => getCheckInStreak(checkIns), [checkIns])

  const checkInToday = useCallback(
    (payload: CheckInPayload) => {
      if (checkedInToday) return false
      if (todaySummary.totalCount === 0) return false

      setCheckIns((prev) =>
        createCheckIn(prev, {
          totalCount: todaySummary.totalCount,
          wordCount: todaySummary.wordCount,
          dictionaryName: payload.dictionaryName,
        }),
      )
      return true
    },
    [checkedInToday, todaySummary],
  )

  const buildTodayShareText = useCallback(
    (wordLabels: string[]) => {
      const record = todayCheckIn ?? {
        date: getTodayKey(),
        totalCount: todaySummary.totalCount,
        wordCount: todaySummary.wordCount,
        dictionaryName: '单词学习',
        checkedInAt: Date.now(),
      }
      return buildShareText(record, checkInStreak, wordLabels)
    },
    [todayCheckIn, todaySummary, checkInStreak],
  )

  return (
    <StudyContext.Provider
      value={{
        store,
        checkIns,
        recordStudy,
        getWordCountToday,
        todaySummary,
        recentDays,
        overview,
        todayCheckIn,
        hasCheckedInToday: checkedInToday,
        checkInStreak,
        checkInToday,
        buildTodayShareText,
      }}
    >
      {children}
    </StudyContext.Provider>
  )
}

export function useStudy() {
  const context = useContext(StudyContext)
  if (!context) {
    throw new Error('useStudy must be used within StudyProvider')
  }
  return context
}
