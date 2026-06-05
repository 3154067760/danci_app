import fs from 'node:fs'
import path from 'node:path'

export const ENTRIES_PATH = path.resolve('src/data/offlineDictionary/entries.json')

export const IMPORT_HEADERS = [
  'word',
  'phonetic',
  'partOfSpeech',
  'definition',
  'example_en',
  'example_zh',
  'image_file',
  'image_caption',
  'tags',
  'level',
]

export function slugify(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function assetPrefix(index) {
  return `w${String(index).padStart(3, '0')}`
}

export function normalizePhonetic(value) {
  const text = value.trim()
  if (!text) return ''
  if (text.startsWith('/') || text.startsWith('[')) return text
  return `/${text.replace(/^\/|\/$/g, '')}/`
}

export function parseTags(value) {
  if (!value?.trim()) return undefined
  return value
    .split(/[|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function extractPartOfSpeech(translation, posField) {
  const fromTranslation = translation.match(/^([a-z]+\.)\s/i)
  if (fromTranslation) return fromTranslation[1].toLowerCase()

  if (posField) {
    const first = posField.split('/')[0]?.split(':')[0]?.trim()
    if (first) {
      const map = {
        n: 'n.',
        v: 'v.',
        adj: 'adj.',
        adv: 'adv.',
        prep: 'prep.',
        conj: 'conj.',
        pron: 'pron.',
        art: 'art.',
        int: 'int.',
      }
      return map[first] ?? `${first}.`
    }
  }

  return ''
}

export function cleanDefinition(translation, definition) {
  const chinese = translation.trim()
  if (chinese) return chinese.replace(/^[a-z]+\.\s*/i, '').trim()

  const english = definition.trim()
  if (!english) return ''
  return english.length > 120 ? `${english.slice(0, 117)}...` : english
}

export function readEntriesFile() {
  return JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf8'))
}

export function writeEntriesFile(data) {
  data.meta.updatedAt = new Date().toISOString().slice(0, 10)
  data.meta.entryCount = data.entries.length
  fs.writeFileSync(ENTRIES_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export function csvRowToEntry(row, index, id) {
  const prefix = assetPrefix(index)
  const slug = slugify(row.word)
  const imageFile = row.image_file.trim() || `${prefix}-${slug}.jpg`
  const audioFile = `${prefix}-${slug}.mp3`

  const entry = {
    id,
    word: row.word.trim(),
    phonetic: normalizePhonetic(row.phonetic),
    partOfSpeech: row.partOfSpeech.trim(),
    definition: row.definition.trim(),
    example: {
      en: row.example_en.trim(),
      zh: row.example_zh.trim(),
    },
    image: {
      file: imageFile,
      caption: row.image_caption.trim() || row.word.trim(),
    },
    audio: {
      wordFile: audioFile,
      sentenceFile: audioFile,
    },
  }

  const tags = parseTags(row.tags)
  if (tags?.length) entry.tags = tags
  if (row.level?.trim()) entry.level = row.level.trim()

  return entry
}

export function entryToCsvRow(entry) {
  return {
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    definition: entry.definition,
    example_en: entry.example.en,
    example_zh: entry.example.zh,
    image_file: entry.image.file,
    image_caption: entry.image.caption,
    tags: (entry.tags ?? []).join('|'),
    level: entry.level ?? '',
  }
}
