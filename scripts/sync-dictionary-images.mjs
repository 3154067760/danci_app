/**
 * 将 data/dictionary/image-inbox/ 下按单词命名的图片移入 public/dictionary/images/
 * 并按实际扩展名更新 entries.json、import.csv 与 custom-words.json
 *
 * 用法:
 *   1. 把图片放到 data/dictionary/image-inbox/，文件名 = 单词，如 mulberry.png
 *   2. npm run dict:sync-images
 *
 * 旧目录 public/images/ 仍会被扫描一次并迁移（移走，不复制）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { writeCsvFile } from './lib/csv.mjs'
import {
  entryToCsvRow,
  IMPORT_HEADERS,
  readEntriesFile,
  writeEntriesFile,
} from './lib/dictionary.mjs'
import {
  buildEntryImageFileName,
  customImageFileName,
  DICTIONARY_IMAGES_DIR,
  findWordNamedImage,
  IMAGE_INBOX_DIR,
  LEGACY_IMAGES_DIR,
  moveToDictionaryImage,
} from './lib/word-images.mjs'

const root = path.resolve(import.meta.dirname, '..')
const importCsvPath = path.join(root, 'data/dictionary/import.csv')
const customWordsPath = path.join(root, 'data/local/custom-words.json')
const publicLocalCustomWordsPath = path.join(root, 'public/local/custom-words.json')

const SOURCE_DIRS = [IMAGE_INBOX_DIR, LEGACY_IMAGES_DIR]

function loadCustomWords() {
  if (!fs.existsSync(customWordsPath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(customWordsPath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomWords(words) {
  fs.mkdirSync(path.dirname(customWordsPath), { recursive: true })
  const content = `${JSON.stringify(words, null, 2)}\n`
  fs.writeFileSync(customWordsPath, content, 'utf8')
  fs.mkdirSync(path.dirname(publicLocalCustomWordsPath), { recursive: true })
  fs.writeFileSync(publicLocalCustomWordsPath, content, 'utf8')
}

function writeImportCsv(entries) {
  fs.mkdirSync(path.dirname(importCsvPath), { recursive: true })
  writeCsvFile(importCsvPath, IMPORT_HEADERS, entries.map(entryToCsvRow))
}

function syncCustomWords() {
  const customWords = loadCustomWords()
  if (customWords.length === 0) return { synced: 0, updated: 0, skipped: 0, legacyMoved: 0 }

  let synced = 0
  let updated = 0
  let skipped = 0
  let legacyMoved = 0
  let changed = false

  console.log('\n自定义词库:')

  for (const word of customWords) {
    const source = findWordNamedImage(word.word, SOURCE_DIRS)
    if (!source) {
      skipped += 1
      continue
    }

    const ext = path.extname(source).toLowerCase()
    const imageFile = customImageFileName(word, ext)
    const publicUrl = `/dictionary/images/${imageFile}`

    if (word.imageUrl !== publicUrl) {
      console.log(`  ${word.word}: 更新 imageUrl → ${imageFile}`)
      word.imageUrl = publicUrl
      updated += 1
      changed = true
    }

    moveToDictionaryImage(source, imageFile)
    if (path.resolve(path.dirname(source)) === path.resolve(LEGACY_IMAGES_DIR)) legacyMoved += 1
    synced += 1
    console.log(`  ${word.word}: ${path.basename(source)} → ${imageFile}`)
  }

  if (changed) {
    saveCustomWords(customWords)
    console.log('已更新 data/local/custom-words.json 与 public/local/custom-words.json')
  }

  return { synced, updated, skipped, legacyMoved }
}

function main() {
  fs.mkdirSync(DICTIONARY_IMAGES_DIR, { recursive: true })
  fs.mkdirSync(IMAGE_INBOX_DIR, { recursive: true })

  const data = readEntriesFile()
  let synced = 0
  let skipped = 0
  let updated = 0
  let legacyMoved = 0

  console.log('收件箱: data/dictionary/image-inbox/')
  console.log('词库目录: public/dictionary/images/（唯一存储）\n')
  console.log('内置词库:')

  for (const entry of data.entries) {
    const source = findWordNamedImage(entry.word, SOURCE_DIRS)
    if (!source) {
      skipped += 1
      continue
    }

    const ext = path.extname(source).toLowerCase()
    const imageFile = buildEntryImageFileName(entry, ext)

    if (entry.image.file !== imageFile) {
      console.log(`  ${entry.word}: 更新 image_file → ${imageFile}`)
      entry.image.file = imageFile
      updated += 1
    }

    moveToDictionaryImage(source, imageFile)
    if (path.resolve(path.dirname(source)) === path.resolve(LEGACY_IMAGES_DIR)) legacyMoved += 1
    synced += 1
    console.log(`  ${entry.word}: ${path.basename(source)} → ${imageFile}`)
  }

  if (synced > 0) {
    writeEntriesFile(data)
    try {
      writeImportCsv(data.entries)
      console.log(`\n已更新 import.csv`)
    } catch (error) {
      if (error.code === 'EBUSY') {
        console.log('\nimport.csv 被占用，请关闭文件后运行: npm run dict:export')
      } else {
        throw error
      }
    }
  }

  const customStats = syncCustomWords()
  const totalLegacy = legacyMoved + customStats.legacyMoved

  console.log(
    `\n内置: 同步 ${synced} 张，更新路径 ${updated} 条，${skipped} 个词无对应待同步图片`,
  )
  console.log(
    `自定义: 同步 ${customStats.synced} 张，更新路径 ${customStats.updated} 条，${customStats.skipped} 个词无对应待同步图片`,
  )
  if (totalLegacy > 0) {
    console.log(`\n已从旧目录 public/images/ 迁移 ${totalLegacy} 张（已移走，未保留副本）`)
  }
  if (synced > 0 || customStats.synced > 0) console.log('刷新浏览器即可看到更新')
}

main()
