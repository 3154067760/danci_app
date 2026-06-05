export interface Dictionary {
  id: string
  name: string
  description?: string
  wordIds: string[]
  isBuiltin?: boolean
  createdAt: number
  updatedAt: number
}

export interface DictionaryState {
  dictionaries: Dictionary[]
  activeDictionaryId: string
}
