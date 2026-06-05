import fs from 'node:fs'
import path from 'node:path'
import Busboy from 'busboy'
import {
  ENTRIES_PATH,
  assetPrefix,
  csvRowToEntry,
  entryToCsvRow,
  IMPORT_HEADERS,
  normalizePhonetic,
  readEntriesFile,
  slugify,
  writeEntriesFile,
} from './dictionary.mjs'
import { writeCsvFile } from './csv.mjs'
import { parseExcelBuffer } from './parse-excel-words.mjs'
import {
  DICTIONARY_IMAGES_DIR,
  extFromFilename,
  writeDictionaryImage,
} from './word-images.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const importCsvPath = path.join(root, 'data/dictionary/import.csv')
const dictionariesPath = path.join(root, 'data/local/dictionaries.json')
const imagesDir = DICTIONARY_IMAGES_DIR

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function nextNumericId(existingIds) {
  const max = existingIds.reduce((current, id) => {
    const num = Number.parseInt(id, 10)
    return Number.isFinite(num) ? Math.max(current, num) : current
  }, 0)
  return String(max + 1)
}

function orderFromId(id, fallback) {
  const num = Number.parseInt(id, 10)
  return Number.isFinite(num) ? num : fallback
}

/** 直接写入 public/dictionary/images/（唯一存储） */
function storeWordImage(word, slug, prefix, buffer, uploadFilename) {
  const ext = extFromFilename(uploadFilename)
  const dictFileName = `${prefix}-${slug}${ext}`
  writeDictionaryImage(dictFileName, buffer)
  return dictFileName
}

function writeImportCsv(entries) {
  ensureDir(path.dirname(importCsvPath))
  writeCsvFile(importCsvPath, IMPORT_HEADERS, entries.map(entryToCsvRow))
}

function addWordsToDictionary(dictionaryId, wordIds) {
  if (!dictionaryId || wordIds.length === 0) return false
  if (!fs.existsSync(dictionariesPath)) return false

  const state = JSON.parse(fs.readFileSync(dictionariesPath, 'utf8'))
  let changed = false

  state.dictionaries = state.dictionaries.map((item) => {
    if (item.id !== dictionaryId) return item
    const merged = Array.from(new Set([...item.wordIds, ...wordIds]))
    if (merged.length === item.wordIds.length) return item
    changed = true
    return { ...item, wordIds: merged, updatedAt: Date.now() }
  })

  if (changed) {
    ensureDir(path.dirname(dictionariesPath))
    const content = `${JSON.stringify(state, null, 2)}\n`
    fs.writeFileSync(dictionariesPath, content, 'utf8')
    const publicLocal = path.join(root, 'public/local/dictionaries.json')
    ensureDir(path.dirname(publicLocal))
    fs.writeFileSync(publicLocal, content, 'utf8')
  }

  return changed
}

/**
 * @param {{ rows: Array<{word:string,phonetic?:string,partOfSpeech?:string,definition:string,example_en:string,example_zh:string,image_caption?:string,tags?:string,level?:string}>, images: Array<{buffer:Buffer,filename:string}|null>, dictionaryId?: string }} input
 */
export function batchImportWords(input) {
  const { rows, images, dictionaryId } = input

  if (!rows.length) {
    throw new Error('表格中没有有效单词')
  }

  if (images.length > 0 && images.length !== rows.length) {
    throw new Error(`图片数量（${images.length}）与单词行数（${rows.length}）不一致，请按行顺序一一对应`)
  }

  ensureDir(imagesDir)
  const data = readEntriesFile()
  const entries = [...data.entries]
  const existingByWord = new Map(entries.map((entry) => [entry.word.toLowerCase(), entry]))

  let created = 0
  let updated = 0
  const importedIds = []

  rows.forEach((row, rowIndex) => {
    const word = row.word.trim()
    if (!word) return

    const key = word.toLowerCase()
    const found = existingByWord.get(key)
    const id = found?.id ?? nextNumericId(entries.map((entry) => entry.id))
    const index = found ? orderFromId(found.id, entries.length + 1) : entries.length + 1
    const prefix = assetPrefix(index)
    const slug = slugify(word)

    let imageFile = found?.image?.file ?? `${prefix}-${slug}.png`
    const imagePayload = images[rowIndex]
    if (imagePayload?.buffer?.length) {
      imageFile = storeWordImage(word, slug, prefix, imagePayload.buffer, imagePayload.filename)
    }

    const csvRow = {
      word,
      phonetic: normalizePhonetic(row.phonetic ?? ''),
      partOfSpeech: row.partOfSpeech?.trim() || 'n.',
      definition: row.definition.trim(),
      example_en: row.example_en.trim(),
      example_zh: row.example_zh.trim(),
      image_file: imageFile,
      image_caption: row.image_caption?.trim() || found?.image?.caption || word,
      tags: row.tags?.trim() ?? '',
      level: row.level?.trim() ?? '',
    }

    const entry = csvRowToEntry(csvRow, index, id)
    entry.image.file = imageFile

    if (found) {
      const entryIndex = entries.findIndex((item) => item.id === found.id)
      entries[entryIndex] = entry
      updated += 1
    } else {
      entries.push(entry)
      existingByWord.set(key, entry)
      created += 1
    }

    importedIds.push(id)
  })

  writeEntriesFile({ ...data, entries })
  writeImportCsv(entries)
  const dictionaryUpdated = addWordsToDictionary(dictionaryId, importedIds)

  return {
    total: rows.length,
    created,
    updated,
    importedIds,
    dictionaryUpdated,
    entryCount: entries.length,
  }
}

export function readEntriesForApi() {
  return readEntriesFile()
}

export function parseMultipartBatchImport(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    let excelBuffer = null
    const images = []
    let dictionaryId = ''
    let pending = 0
    let busboyFinished = false

    function tryResolve() {
      if (!busboyFinished || pending > 0) return
      try {
        if (!excelBuffer?.length) {
          reject(new Error('请上传 Excel 文件'))
          return
        }
        const rows = parseExcelBuffer(excelBuffer)
        resolve({
          rows,
          images,
          dictionaryId: dictionaryId.trim() || undefined,
        })
      } catch (error) {
        reject(error)
      }
    }

    busboy.on('file', (fieldname, file, info) => {
      pending += 1
      const chunks = []
      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (fieldname === 'excel') {
          excelBuffer = buffer
        } else if (fieldname === 'images') {
          images.push({ buffer, filename: info.filename })
        }
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

export { ENTRIES_PATH }
