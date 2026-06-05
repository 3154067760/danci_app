export interface Word {
  id: string
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  example: string
  exampleTranslation: string
  imageCaption: string
  imageUrl: string
  /** 离线单词发音，相对 public/dictionary/audio/words/ */
  wordAudioUrl?: string
  /** 离线例句发音，相对 public/dictionary/audio/sentences/ */
  sentenceAudioUrl?: string
}
