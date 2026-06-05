import fs from 'node:fs'
import path from 'node:path'
import { assetPrefix, slugify } from './dictionary.mjs'

/** 词库配图唯一存储目录（应用读取 /dictionary/images/） */
export const DICTIONARY_IMAGES_DIR = path.resolve('public/dictionary/images')

/** 待同步收件箱：按单词名放图，运行 dict:sync-images 后移入词库目录 */
export const IMAGE_INBOX_DIR = path.resolve('data/dictionary/image-inbox')

/** 旧版源目录，仅用于迁移；新流程请勿使用 */
export const LEGACY_IMAGES_DIR = path.resolve('public/images')

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function orderFromId(id) {
  const num = Number.parseInt(id, 10)
  return Number.isFinite(num) ? num : 0
}

export function buildEntryImageFileName(entry, ext) {
  return `${assetPrefix(orderFromId(entry.id))}-${slugify(entry.word)}${ext}`
}

export function customImageFileName(word, ext) {
  const shortId = String(word.id).split('-').pop() ?? 'x'
  return `custom-${slugify(word.word)}-${shortId}${ext}`
}

export function extFromFilename(filename) {
  const ext = path.extname(filename ?? '').toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext) ? ext : '.png'
}

/** 在多个目录中按「单词.扩展名」查找图片（优先靠前的目录） */
export function findWordNamedImage(word, searchDirs) {
  const lower = word.toLowerCase()
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue
    for (const ext of IMAGE_EXTENSIONS) {
      const file = path.join(dir, `${lower}${ext}`)
      if (fs.existsSync(file)) return file
    }
  }
  return null
}

/** 写入词库配图目录（唯一副本） */
export function writeDictionaryImage(fileName, buffer) {
  ensureDir(DICTIONARY_IMAGES_DIR)
  const dest = path.join(DICTIONARY_IMAGES_DIR, fileName)
  fs.writeFileSync(dest, buffer)
  return fileName
}

/** 将收件箱/旧目录中的文件移入词库目录（不复制） */
export function moveToDictionaryImage(sourcePath, fileName) {
  ensureDir(DICTIONARY_IMAGES_DIR)
  const dest = path.join(DICTIONARY_IMAGES_DIR, fileName)
  if (path.resolve(sourcePath) === path.resolve(dest)) return fileName
  if (fs.existsSync(dest)) fs.rmSync(dest, { force: true })
  fs.renameSync(sourcePath, dest)
  return fileName
}
