export interface CheckInRecord {
  date: string
  totalCount: number
  wordCount: number
  dictionaryName: string
  checkedInAt: number
}

export type CheckInStore = CheckInRecord[]
