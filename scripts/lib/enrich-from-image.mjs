import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import { deepseekChat, siliconflowVisionChat } from './ai-clients.mjs'
import { IMAGE_EXTENSIONS, IMAGE_INBOX_DIR, ensureDir } from './word-images.mjs'

const EXCEL_HEADERS = [
  'word',
  'phonetic',
  'partOfSpeech',
  'definition',
  'example_en',
  'example_zh',
  'image_caption',
  'tags',
  'level',
]

const VISION_PROMPT = `这是一张英语单词学习卡片配图。请识别：
1. 图片最底部一行或底部区域的英文文字（通常是例句，可能被裁切或不完整）
2. 图片上方可能的英文标题/说明（如有）

只返回 JSON，不要 markdown：
{
  "bottom_text": "底部英文原文，没有则空字符串",
  "image_caption": "图片英文主题/标题，没有则空字符串",
  "confidence": "high|medium|low"
}`

function buildTextPrompt(word, vision) {
  return `你是英语词库编辑。目标单词：${word}

图片 OCR 结果：
- 底部英文（可能不完整）：${vision.bottom_text || '（无）'}
- 图片说明：${vision.image_caption || '（无）'}
- 识别置信度：${vision.confidence || 'unknown'}

请生成词库字段。若底部英文是不完整例句，请补全为自然、语法正确的完整英文例句，且必须包含单词「${word}」（必要时调整大小写或复数形式）。

只返回 JSON，不要 markdown：
{
  "phonetic": "/音标/",
  "partOfSpeech": "n.",
  "definition": "中文释义（词义，不是例句翻译）",
  "example_en": "完整英文例句",
  "example_zh": "例句中文翻译",
  "image_caption": "英文图片说明，Title Case"
}`
}

export function parseModelJson(text) {
  const trimmed = String(text).trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1].trim() : trimmed
  return JSON.parse(raw)
}

export function wordFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename))
  const cleaned = base.replace(/^\d+[-_.\s]+/i, '').trim()
  return cleaned.replace(/[^a-zA-Z'-].*$/, '').trim() || base.trim()
}

function mimeFromExt(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return map[ext.toLowerCase()] || null
}

const MAX_VISION_BYTES = 2 * 1024 * 1024

export function imageToDataUrl(imagePath) {
  const buffer = fs.readFileSync(imagePath)
  return bufferToDataUrl(buffer, path.basename(imagePath))
}

export function bufferToDataUrl(buffer, filename) {
  const ext = path.extname(filename).toLowerCase()
  const mime = mimeFromExt(ext)
  if (!mime) throw new Error(`不支持识图的格式：${ext}（请用 png/jpg/webp）`)
  if (buffer.length > MAX_VISION_BYTES) {
    throw new Error(
      `图片过大（${(buffer.length / 1024 / 1024).toFixed(1)}MB），请压缩到 640×400、≤2MB 后再识图`,
    )
  }
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export async function enrichWordFromBuffer({ word, buffer, filename }) {
  const imageDataUrl = bufferToDataUrl(buffer, filename)

  const visionRaw = await siliconflowVisionChat({
    imageDataUrl,
    text: VISION_PROMPT,
  })
  const vision = parseModelJson(visionRaw)

  const textRaw = await deepseekChat([
    { role: 'system', content: 'You output strict JSON only.' },
    { role: 'user', content: buildTextPrompt(word, vision) },
  ])
  const fields = parseModelJson(textRaw)

  return {
    word,
    phonetic: String(fields.phonetic ?? '').trim(),
    partOfSpeech: String(fields.partOfSpeech ?? 'n.').trim() || 'n.',
    definition: String(fields.definition ?? '').trim(),
    example_en: String(fields.example_en ?? '').trim(),
    example_zh: String(fields.example_zh ?? '').trim(),
    image_caption: String(fields.image_caption ?? vision.image_caption ?? word).trim() || word,
    tags: String(fields.tags ?? 'CET4').trim(),
    level: String(fields.level ?? 'basic').trim(),
    _vision: vision,
  }
}

export async function enrichWordFromImage({ word, imagePath }) {
  return enrichWordFromBuffer({
    word,
    buffer: fs.readFileSync(imagePath),
    filename: path.basename(imagePath),
  })
}

export function listWordImages(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .filter((name) => mimeFromExt(path.extname(name)))
    .map((name) => {
      const fullPath = path.join(dir, name)
      const stat = fs.statSync(fullPath)
      return { name, fullPath, word: wordFromFilename(name), mtime: stat.mtimeMs, size: stat.size }
    })
    .filter((item) => item.word.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
}

function cacheKey(item) {
  return `${item.name}:${item.size}:${item.mtime}`
}

function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cachePath, cache) {
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
}

export async function enrichImagesFromFolder(options = {}) {
  const {
    dir = IMAGE_INBOX_DIR,
    outputPath = path.join(dir, 'words-from-images.xlsx'),
    cachePath = path.join(dir, '.ai-enrich-cache.json'),
    limit,
    delayMs = 400,
    useCache = true,
    onProgress,
  } = options

  ensureDir(dir)
  const items = listWordImages(dir)
  const slice = typeof limit === 'number' ? items.slice(0, limit) : items

  if (slice.length === 0) {
    throw new Error(`目录 ${dir} 中没有可识图的单词图片（png/jpg/webp，文件名即单词）`)
  }

  const cache = useCache ? loadCache(cachePath) : {}
  const rows = []
  const errors = []

  for (let i = 0; i < slice.length; i += 1) {
    const item = slice[i]
    const key = cacheKey(item)
    onProgress?.({ phase: 'start', index: i + 1, total: slice.length, word: item.word, file: item.name })

    try {
      let row = useCache ? cache[key] : null
      if (!row) {
        row = await enrichWordFromImage({ word: item.word, imagePath: item.fullPath })
        delete row._vision
        if (useCache) {
          cache[key] = row
          saveCache(cachePath, cache)
        }
        if (delayMs > 0 && i < slice.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }

      if (!row.definition || !row.example_en || !row.example_zh) {
        throw new Error('模型返回字段不完整')
      }

      rows.push(row)
      onProgress?.({ phase: 'done', index: i + 1, total: slice.length, word: item.word, row })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ word: item.word, file: item.name, error: message })
      onProgress?.({ phase: 'error', index: i + 1, total: slice.length, word: item.word, error: message })
    }
  }

  if (rows.length === 0) {
    throw new Error(`全部失败：${errors.map((item) => `${item.word}: ${item.error}`).join('; ')}`)
  }

  const sheetRows = [EXCEL_HEADERS, ...rows.map((row) => EXCEL_HEADERS.map((key) => row[key] ?? ''))]
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'words')
  XLSX.writeFile(book, outputPath)

  return {
    dir,
    outputPath,
    total: slice.length,
    success: rows.length,
    failed: errors.length,
    rows,
    errors,
  }
}
