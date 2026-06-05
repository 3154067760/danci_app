/** 离线词典 JSON 中的原始条目结构 */
export interface OfflineDictionaryEntry {
  id: string
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  example: {
    en: string
    zh: string
  }
  image: {
    /** 相对 public/dictionary/images/ 的文件名 */
    file: string
    caption: string
  }
  audio: {
    /** 相对 public/dictionary/audio/words/ 的文件名 */
    wordFile: string
    /** 相对 public/dictionary/audio/sentences/ 的文件名 */
    sentenceFile: string
  }
  /** 可选：词书分组、难度等 */
  tags?: string[]
  level?: string
}

export interface OfflineDictionaryMeta {
  version: number
  name: string
  description: string
  updatedAt: string
  entryCount: number
}

export interface OfflineDictionaryData {
  meta: OfflineDictionaryMeta
  entries: OfflineDictionaryEntry[]
}
