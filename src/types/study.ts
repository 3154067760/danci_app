export interface DailyWordStudy {
  wordId: string
  count: number
}

export interface DayStudySummary {
  date: string
  totalCount: number
  wordCount: number
  words: DailyWordStudy[]
}

export interface StudyStatsOverview {
  todayTotal: number
  todayWordCount: number
  totalDays: number
  totalSessions: number
  totalWordsLearned: number
}

export type StudyStore = Record<string, Record<string, number>>
