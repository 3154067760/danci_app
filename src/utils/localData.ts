import type { Word } from '../types/word'

const API_BASE = '/api/local-data'

export type LocalDataKey =
  | 'custom-words'
  | 'dictionaries'
  | 'check-ins'
  | 'study-records'
  | 'favorites'
  | 'theme'

const LOCAL_STORAGE_KEYS: Record<LocalDataKey, string> = {
  'custom-words': 'danci-custom-words',
  dictionaries: 'danci-dictionaries',
  'check-ins': 'danci-checkins',
  'study-records': 'danci-study-records',
  favorites: 'danci-favorites',
  theme: 'danci-theme',
}

let apiAvailable: boolean | null = null

export async function isLocalDataApiAvailable(): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable
  try {
    const res = await fetch(`${API_BASE}/health`)
    apiAvailable = res.ok
  } catch {
    apiAvailable = false
  }
  return apiAvailable
}

function readFromLocalStorage<T>(key: LocalDataKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS[key])
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeToLocalStorage<T>(key: LocalDataKey, data: T) {
  localStorage.setItem(LOCAL_STORAGE_KEYS[key], JSON.stringify(data))
}

async function readFromStaticFile<T>(key: LocalDataKey): Promise<T | null> {
  try {
    const res = await fetch(`/local/${key}.json`)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function readFromApi<T>(key: LocalDataKey): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/${key}`)
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function writeToApi<T>(key: LocalDataKey, data: T): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

/** 启动时从本地文件加载并写入 localStorage 缓存 */
export async function hydrateLocalData<T>(key: LocalDataKey, fallback: T): Promise<T> {
  const cached = readFromLocalStorage(key, fallback)

  if (await isLocalDataApiAvailable()) {
    const fromFile = await readFromApi<T>(key)
    if (fromFile !== null) {
      writeToLocalStorage(key, fromFile)
      return fromFile
    }
    if (cached !== fallback && JSON.stringify(cached) !== JSON.stringify(fallback)) {
      await writeToApi(key, cached)
    }
    return cached
  }

  const fromStatic = await readFromStaticFile<T>(key)
  if (fromStatic !== null) {
    writeToLocalStorage(key, fromStatic)
    return fromStatic
  }

  return cached
}

/** 保存到 localStorage，并尽力同步到本地文件 */
export async function persistLocalData<T>(key: LocalDataKey, data: T): Promise<void> {
  writeToLocalStorage(key, data)

  if (await isLocalDataApiAvailable()) {
    await writeToApi(key, data)
    return
  }

  // 静态模式下仅保留浏览器缓存；构建时会从 data/local 打包
}

export async function hydrateAllLocalData(): Promise<void> {
  await Promise.all([
    hydrateLocalData('custom-words', []),
    hydrateLocalData('dictionaries', null),
    hydrateLocalData('check-ins', []),
    hydrateLocalData('study-records', {}),
    hydrateLocalData('favorites', []),
    hydrateLocalData('theme', null),
  ])
}

export type CustomAssetType = 'image' | 'word-audio' | 'sentence-audio'

export async function saveCustomAsset(
  wordId: string,
  word: string,
  type: CustomAssetType,
  dataUrl: string,
): Promise<string> {
  if (!(await isLocalDataApiAvailable())) return dataUrl

  try {
    const res = await fetch(`${API_BASE}/asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId, word, type, dataUrl }),
    })
    if (!res.ok) return dataUrl
    const payload = (await res.json()) as { url?: string }
    return payload.url ?? dataUrl
  } catch {
    return dataUrl
  }
}

export async function persistCustomWordAssets(word: Word): Promise<Word> {
  const imageUrl = word.imageUrl.startsWith('data:')
    ? await saveCustomAsset(word.id, word.word, 'image', word.imageUrl)
    : word.imageUrl

  const wordAudioUrl = word.wordAudioUrl?.startsWith('data:')
    ? await saveCustomAsset(word.id, word.word, 'word-audio', word.wordAudioUrl)
    : word.wordAudioUrl

  const sentenceAudioUrl = word.sentenceAudioUrl?.startsWith('data:')
    ? await saveCustomAsset(word.id, word.word, 'sentence-audio', word.sentenceAudioUrl)
    : word.sentenceAudioUrl

  return { ...word, imageUrl, wordAudioUrl, sentenceAudioUrl }
}

export interface SyncAudioStats {
  ok: number
  skip: number
  fail: number
  empty: number
}

export interface SyncAudioResult {
  ok: boolean
  stats?: SyncAudioStats
  customWordsUpdated?: boolean
  voice?: string
  message?: string
  error?: string
}

/** 触发服务端例句离线发音同步（等同 npm run dict:sync-audio -- --sentences-only） */
export async function syncSentenceAudio(options?: { force?: boolean }): Promise<SyncAudioResult> {
  if (!(await isLocalDataApiAvailable())) {
    return {
      ok: false,
      error: '当前环境无法写入本地文件，请用 npm run dev 启动并在同一 WiFi 下访问',
    }
  }

  try {
    const res = await fetch(`${API_BASE}/sync-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentencesOnly: true, force: options?.force === true }),
    })

    const payload = (await res.json()) as SyncAudioResult & { error?: string }

    if (!res.ok) {
      return { ok: false, error: payload.error ?? '同步失败' }
    }

    return { ...payload, ok: true }
  } catch {
    return { ok: false, error: '网络错误，请确认电脑上的开发服务正在运行' }
  }
}

export interface BatchImportResult {
  ok: boolean
  message?: string
  total?: number
  created?: number
  updated?: number
  entryCount?: number
  dictionaryUpdated?: boolean
  error?: string
}

/** 批量导入 Excel + 图片到词库 */
export async function batchImportWords(formData: FormData): Promise<BatchImportResult> {
  if (!(await isLocalDataApiAvailable())) {
    return {
      ok: false,
      error: '当前环境无法写入服务器文件，请确认服务已启动（npm run start / PM2）',
    }
  }

  try {
    const res = await fetch(`${API_BASE}/batch-import`, {
      method: 'POST',
      body: formData,
    })
    const payload = (await res.json()) as BatchImportResult & { error?: string }
    if (!res.ok) {
      return { ok: false, error: payload.error ?? '导入失败' }
    }
    return { ...payload, ok: true }
  } catch {
    return { ok: false, error: '上传失败，请检查网络或文件大小' }
  }
}

export interface EnrichFromImagesRow {
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  example_en: string
  example_zh: string
  image_caption: string
  tags: string
  level: string
}

export interface EnrichFromImagesResult {
  ok: boolean
  message?: string
  outputPath?: string
  total?: number
  success?: number
  failed?: number
  rows?: EnrichFromImagesRow[]
  errors?: Array<{ word: string; file: string; error: string }>
  error?: string
}

export interface AiImportImagesResult {
  ok: boolean
  message?: string
  total?: number
  created?: number
  updated?: number
  entryCount?: number
  aiTotal?: number
  aiSuccess?: number
  aiFailed?: number
  aiSkipped?: number
  rows?: EnrichFromImagesRow[]
  errors?: Array<{ word: string; file: string; error: string }>
  skipped?: Array<{ word: string; file: string }>
  error?: string
}

export interface AiImportProgressEvent {
  phase: 'start' | 'done' | 'error' | 'skip' | 'saving' | 'complete' | 'fatal'
  index?: number
  total?: number
  word?: string
  file?: string
  error?: string
  success?: number
  failed?: number
  skipped?: number
  row?: EnrichFromImagesRow
  result?: AiImportImagesResult
}

async function readAiImportSse(
  res: Response,
  onProgress: (event: AiImportProgressEvent) => void,
): Promise<AiImportImagesResult> {
  if (!res.body) throw new Error('无响应流')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: AiImportImagesResult = { ok: false }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const line = block.split('\n').find((item) => item.startsWith('data: '))
      if (!line) continue

      const data = JSON.parse(line.slice(6)) as AiImportProgressEvent
      if (data.phase === 'complete' && data.result) {
        finalResult = { ...data.result, ok: true }
        onProgress(data)
      } else if (data.phase === 'fatal') {
        throw new Error(data.error ?? 'AI 图片导入失败')
      } else {
        onProgress(data)
      }
    }
  }

  if (!finalResult.ok) {
    throw new Error('导入未完成')
  }

  return finalResult
}

export interface AiAddWordRow {
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  example_en: string
  example_zh: string
  image_caption: string
}

export interface AiAddWordResult {
  ok: boolean
  message?: string
  word?: string
  wordId?: string
  row?: AiAddWordRow
  created?: number
  updated?: number
  git?: { ok: boolean; pushed?: boolean; message?: string; error?: string }
  error?: string
}

/** 填写单词 + 上传图片，AI 自动生成释义例句并写入词库 */
export async function aiAddWord(formData: FormData): Promise<AiAddWordResult> {
  if (!(await isLocalDataApiAvailable())) {
    return {
      ok: false,
      error: '当前环境无法调用本地 API，请确认 npm run dev 或 PM2 已启动，且已配置 .env',
    }
  }

  try {
    const res = await fetch(`${API_BASE}/ai-add-word`, {
      method: 'POST',
      body: formData,
    })
    const payload = (await res.json()) as AiAddWordResult & { error?: string }
    if (!res.ok) {
      return { ok: false, error: payload.error ?? 'AI 添加失败' }
    }
    return { ...payload, ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '上传失败，请检查网络、图片大小与 API Key',
    }
  }
}

/** 上传图片文件夹，AI 识图后直接导入词库（无需 Excel） */
export async function aiImportImages(
  formData: FormData,
  onProgress?: (event: AiImportProgressEvent) => void,
): Promise<AiImportImagesResult> {
  if (!(await isLocalDataApiAvailable())) {
    return {
      ok: false,
      error: '当前环境无法调用本地 API，请确认 npm run dev 或 PM2 已启动，且已配置 .env',
    }
  }

  try {
    const headers: HeadersInit = {}
    if (onProgress) headers.Accept = 'text/event-stream'

    const res = await fetch(`${API_BASE}/ai-import-images`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const contentType = res.headers.get('content-type') ?? ''

    if (onProgress && contentType.includes('text/event-stream')) {
      if (!res.ok) {
        const text = await res.text()
        try {
          const payload = JSON.parse(text) as { error?: string }
          return { ok: false, error: payload.error ?? 'AI 图片导入失败' }
        } catch {
          return { ok: false, error: text || 'AI 图片导入失败' }
        }
      }
      return readAiImportSse(res, onProgress)
    }

    const payload = (await res.json()) as AiImportImagesResult & { error?: string }
    if (!res.ok) {
      return { ok: false, error: payload.error ?? 'AI 图片导入失败' }
    }
    return { ...payload, ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '上传失败，请检查网络、图片大小与 API Key',
    }
  }
}
