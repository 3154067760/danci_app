import type { Word } from '../types/word'
import { hydrateLocalData, persistCustomWordAssets, persistLocalData } from './localData'

const STORAGE_KEY = 'danci-custom-words'

export function loadCustomWords(): Word[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Word[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomWords(words: Word[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
}

export async function hydrateCustomWords(): Promise<Word[]> {
  return hydrateLocalData('custom-words', [])
}

export async function saveCustomWordsToFile(words: Word[]) {
  saveCustomWords(words)
  const processed = await Promise.all(words.map((word) => persistCustomWordAssets(word)))
  saveCustomWords(processed)
  await persistLocalData('custom-words', processed)
}

export function createCustomWordId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`文件过大（${(file.size / 1024).toFixed(0)}KB），请小于 ${(maxBytes / 1024).toFixed(0)}KB`))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('读取文件失败'))
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

export function findWordByText(words: Word[], text: string) {
  const lower = text.trim().toLowerCase()
  return words.find((item) => item.word.toLowerCase() === lower)
}
