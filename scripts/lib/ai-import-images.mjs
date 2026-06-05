import fs from 'node:fs'
import path from 'node:path'
import Busboy from 'busboy'
import { batchImportWords } from './batch-import-words.mjs'
import { readEntriesFile } from './dictionary.mjs'
import { enrichWordFromBuffer, listWordImages, wordFromFilename } from './enrich-from-image.mjs'
import { IMAGE_INBOX_DIR } from './word-images.mjs'

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i

export function sortImageUploads(images) {
  return [...images].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

function stripVisionFields(row) {
  const { _vision, ...rest } = row
  return rest
}

/**
 * AI 识图 + 直接写入词库（无需 Excel）
 * @param {{ images: Array<{buffer: Buffer, filename: string}>, dictionaryId?: string, delayMs?: number, onProgress?: Function }} input
 */
export async function aiImportImages(input) {
  const { images, dictionaryId, delayMs = 400, onProgress } = input
  const sorted = sortImageUploads(images.filter((item) => IMAGE_EXT.test(item.filename)))

  if (sorted.length === 0) {
    throw new Error('请上传至少一张图片（png/jpg/webp），文件名即单词，如 grape.png')
  }

  const rows = []
  const buffers = []
  const errors = []
  const skipped = []

  const entryData = readEntriesFile()
  const existingWords = new Set(entryData.entries.map((entry) => entry.word.toLowerCase()))

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i]
    const word = wordFromFilename(item.filename)
    if (!word) {
      errors.push({ word: '—', file: item.filename, error: '无法从文件名解析单词' })
      onProgress?.({
        phase: 'error',
        index: i + 1,
        total: sorted.length,
        word: '—',
        error: '无法从文件名解析单词',
      })
      continue
    }

    onProgress?.({
      phase: 'start',
      index: i + 1,
      total: sorted.length,
      word,
      file: item.filename,
    })

    if (existingWords.has(word.toLowerCase())) {
      skipped.push({ word, file: item.filename })
      onProgress?.({ phase: 'skip', index: i + 1, total: sorted.length, word, file: item.filename })
      continue
    }

    try {
      const row = stripVisionFields(
        await enrichWordFromBuffer({
          word,
          buffer: item.buffer,
          filename: path.basename(item.filename),
        }),
      )

      if (!row.definition || !row.example_en || !row.example_zh) {
        throw new Error('模型返回字段不完整')
      }

      rows.push(row)
      buffers.push({ buffer: item.buffer, filename: item.filename })
      onProgress?.({ phase: 'done', index: i + 1, total: sorted.length, word, row })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ word, file: item.filename, error: message })
      onProgress?.({ phase: 'error', index: i + 1, total: sorted.length, word, error: message })
    }

    if (delayMs > 0 && i < sorted.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  if (rows.length === 0) {
    if (skipped.length > 0 && errors.length === 0) {
      return {
        total: 0,
        created: 0,
        updated: 0,
        importedIds: [],
        dictionaryUpdated: false,
        entryCount: entryData.entries.length,
        aiTotal: sorted.length,
        aiSuccess: 0,
        aiFailed: errors.length,
        aiSkipped: skipped.length,
        rows,
        errors,
        skipped,
        message: `全部 ${skipped.length} 个单词已在词库中，已跳过`,
      }
    }
    throw new Error(`全部失败：${errors.map((item) => `${item.word}: ${item.error}`).join('; ')}`)
  }

  onProgress?.({
    phase: 'saving',
    total: sorted.length,
    success: rows.length,
    failed: errors.length,
    skipped: skipped.length,
  })

  const importResult = batchImportWords({ rows, images: buffers, dictionaryId })

  const skipPart = skipped.length > 0 ? `，跳过 ${skipped.length} 张（词库已有）` : ''
  const failPart = errors.length > 0 ? `，识图失败 ${errors.length} 张` : ''

  return {
    ...importResult,
    aiTotal: sorted.length,
    aiSuccess: rows.length,
    aiFailed: errors.length,
    aiSkipped: skipped.length,
    rows,
    errors,
    skipped,
    message: `AI 导入完成：新增 ${importResult.created}，更新 ${importResult.updated}${skipPart}${failPart}`,
  }
}

/** 从本地目录 AI 导入（CLI / 服务端扫描 inbox） */
export async function aiImportImagesFromDir(options = {}) {
  const { dir = IMAGE_INBOX_DIR, dictionaryId, limit, delayMs, onProgress } = options
  const items = listWordImages(dir)
  const slice = typeof limit === 'number' ? items.slice(0, limit) : items

  if (slice.length === 0) {
    throw new Error(`目录 ${dir} 中没有可识图的单词图片（png/jpg/webp，文件名即单词）`)
  }

  const images = slice.map((item) => ({
    buffer: fs.readFileSync(item.fullPath),
    filename: item.name,
  }))

  return aiImportImages({ images, dictionaryId, delayMs, onProgress })
}

export function parseMultipartAiImport(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    const images = []
    let dictionaryId = ''
    let pending = 0
    let busboyFinished = false

    function tryResolve() {
      if (!busboyFinished || pending > 0) return
      if (images.length === 0) {
        reject(new Error('请选择图片文件夹'))
        return
      }
      resolve({ images, dictionaryId: dictionaryId.trim() || undefined })
    }

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname !== 'images') {
        file.resume()
        return
      }
      pending += 1
      const chunks = []
      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => {
        images.push({ buffer: Buffer.concat(chunks), filename: info.filename })
        pending -= 1
        tryResolve()
      })
    })

    busboy.on('field', (name, value) => {
      if (name === 'dictionaryId') dictionaryId = value
    })

    busboy.on('finish', () => {
      busboyFinished = true
      tryResolve()
    })

    busboy.on('error', reject)
    req.pipe(busboy)
  })
}
