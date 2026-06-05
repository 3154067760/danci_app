import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EdgeTTS } from 'node-edge-tts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultRoot = path.resolve(__dirname, '../..')

export const VOICE = 'en-GB-SoniaNeural'
const MIN_SIZE = 500
const DELAY_MS = 350

function slugify(word) {
  return (
    word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'word'
  )
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldSkip(dest, force) {
  return !force && fs.existsSync(dest) && fs.statSync(dest).size > MIN_SIZE
}

function urlToLocalPath(root, url) {
  if (!url || url.startsWith('data:')) return null
  const normalized = url.startsWith('/') ? url.slice(1) : url
  return path.join(root, 'public', normalized)
}

function customSentenceFileName(word) {
  const slug = slugify(word.word)
  const shortId = String(word.id).split('-').pop() ?? 'x'
  return `custom-${slug}-${shortId}-sentence.mp3`
}

function loadCustomWords(customWordsPath) {
  if (!fs.existsSync(customWordsPath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(customWordsPath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomWords(customWordsPath, words) {
  ensureDir(path.dirname(customWordsPath))
  fs.writeFileSync(customWordsPath, `${JSON.stringify(words, null, 2)}\n`, 'utf8')
}

async function synthesizeToFile(tts, text, dest) {
  const tmp = `${dest}.tmp.mp3`
  await tts.ttsPromise(text.trim(), tmp)

  if (!fs.existsSync(tmp) || fs.statSync(tmp).size < MIN_SIZE) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    throw new Error('生成的音频过小')
  }

  fs.renameSync(tmp, dest)
}

async function generateAudio(tts, text, dest, label, force, onLog) {
  if (!text?.trim()) {
    onLog?.(`  skip (${label}): 无文本`)
    return 'empty'
  }

  if (shouldSkip(dest, force)) {
    onLog?.(`  skip (${label}): ${path.basename(dest)}`)
    return 'skip'
  }

  try {
    await synthesizeToFile(tts, text, dest)
    const size = fs.statSync(dest).size
    onLog?.(`  saved (${label}): ${path.basename(dest)} (${size} bytes)`)
    return 'ok'
  } catch (error) {
    onLog?.(`  failed (${label}): ${path.basename(dest)} — ${error.message}`)
    return 'fail'
  }
}

async function processBuiltinEntries(tts, entries, paths, options) {
  const { force, sentencesOnly, stats, onLog } = options
  const { wordsDir, sentencesDir } = paths

  onLog?.(`内置词库: ${entries.length} 条 (voice: ${VOICE})`)

  for (const entry of entries) {
    onLog?.(entry.word)

    const wordDest = path.join(wordsDir, entry.audio.wordFile)
    const sentenceDest = path.join(sentencesDir, entry.audio.sentenceFile)

    const tasks = sentencesOnly
      ? [await generateAudio(tts, entry.example?.en ?? '', sentenceDest, 'sentence', force, onLog)]
      : [
          await generateAudio(tts, entry.word, wordDest, 'word', force, onLog),
          await generateAudio(tts, entry.example?.en ?? '', sentenceDest, 'sentence', force, onLog),
        ]

    for (const result of tasks) {
      stats[result] += 1
    }

    await sleep(DELAY_MS)
  }
}

async function processCustomWords(tts, customWords, paths, root, options) {
  const { force, sentencesOnly, stats, onLog } = options
  const { wordsDir, sentencesDir, customWordsPath } = paths

  if (customWords.length === 0) return { customWords, customWordsUpdated: false }

  onLog?.(`自定义词库: ${customWords.length} 条`)

  let changed = false

  for (const word of customWords) {
    onLog?.(`${word.word} (custom)`)

    const sentenceText = word.example?.trim() ?? ''
    const defaultFile = customSentenceFileName(word)
    const sentenceDest =
      urlToLocalPath(root, word.sentenceAudioUrl) ?? path.join(sentencesDir, defaultFile)

    if (!sentencesOnly) {
      const wordDest =
        urlToLocalPath(root, word.wordAudioUrl) ??
        path.join(wordsDir, `custom-${slugify(word.word)}-${String(word.id).split('-').pop()}-word.mp3`)

      const wordResult = await generateAudio(tts, word.word, wordDest, 'word', force, onLog)
      stats[wordResult] += 1

      if (wordResult === 'ok' && !word.wordAudioUrl?.startsWith('/dictionary/')) {
        word.wordAudioUrl = `/dictionary/audio/words/${path.basename(wordDest)}`
        changed = true
      }
    }

    const sentenceResult = await generateAudio(tts, sentenceText, sentenceDest, 'sentence', force, onLog)
    stats[sentenceResult] += 1

    if (sentenceResult === 'ok') {
      const publicUrl = `/dictionary/audio/sentences/${path.basename(sentenceDest)}`
      if (word.sentenceAudioUrl !== publicUrl) {
        word.sentenceAudioUrl = publicUrl
        changed = true
      }
    }

    await sleep(DELAY_MS)
  }

  if (changed) {
    saveCustomWords(customWordsPath, customWords)
    onLog?.('已更新 data/local/custom-words.json')
  }

  return { customWords, customWordsUpdated: changed }
}

/**
 * @param {{ root?: string, force?: boolean, sentencesOnly?: boolean, limit?: number, onLog?: (line: string) => void }} options
 */
export async function syncDictionaryAudio(options = {}) {
  const root = options.root ?? defaultRoot
  const force = options.force ?? false
  const sentencesOnly = options.sentencesOnly ?? false
  const limit = options.limit ?? Infinity
  const onLog = options.onLog

  const entriesPath = path.join(root, 'src/data/offlineDictionary/entries.json')
  const customWordsPath = path.join(root, 'data/local/custom-words.json')
  const wordsDir = path.join(root, 'public/dictionary/audio/words')
  const sentencesDir = path.join(root, 'public/dictionary/audio/sentences')

  const data = JSON.parse(fs.readFileSync(entriesPath, 'utf8'))
  const entries = data.entries.slice(0, limit)
  const customWords = loadCustomWords(customWordsPath)

  ensureDir(wordsDir)
  ensureDir(sentencesDir)

  const tts = new EdgeTTS({
    voice: VOICE,
    lang: 'en-GB',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    timeout: 60000,
  })

  const stats = { ok: 0, skip: 0, fail: 0, empty: 0 }
  const syncOptions = { force, sentencesOnly, stats, onLog }
  const paths = { wordsDir, sentencesDir, customWordsPath }

  if (force) onLog?.('模式: 覆盖已有文件')
  if (sentencesOnly) onLog?.('模式: 仅例句')

  await processBuiltinEntries(tts, entries, paths, syncOptions)
  const { customWordsUpdated } = await processCustomWords(tts, customWords, paths, root, syncOptions)

  onLog?.(`完成: 成功 ${stats.ok}，跳过 ${stats.skip}，无文本 ${stats.empty}，失败 ${stats.fail}`)

  return { stats, customWordsUpdated, voice: VOICE }
}
