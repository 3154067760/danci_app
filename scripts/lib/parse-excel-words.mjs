import XLSX from 'xlsx'

/** 与 data/dictionary/import.csv 字段一致（不含 image_file，图片由文件夹按序匹配） */
const COLUMN_ALIASES = {
  word: ['word', '单词'],
  phonetic: ['phonetic', '音标'],
  partOfSpeech: ['partofspeech', 'pos', '词性'],
  definition: ['definition', '释义', '中文释义'],
  example_en: ['example_en', '英文例句', '英语句子', '例句英文'],
  example_zh: ['example_zh', '例句翻译', '中文例句'],
  image_caption: ['image_caption', '图片说明', '配图说明'],
  tags: ['tags', '标签'],
  level: ['level', '难度', '级别'],
}

const REQUIRED_COLUMNS = ['word', 'definition', 'example_en', 'example_zh']

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findColumnIndex(headers, aliases) {
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i]
    if (aliases.some((alias) => header === alias)) return i
  }
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i]
    if (aliases.some((alias) => header.includes(alias))) return i
  }
  return -1
}

function cellText(row, index) {
  if (index < 0 || index >= row.length) return ''
  const value = row[index]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function columnLabel(key) {
  const labels = {
    word: '单词',
    definition: '释义',
    example_en: '英文例句',
    example_zh: '例句翻译',
  }
  return labels[key] ?? key
}

/**
 * @param {Buffer} buffer
 */
export function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel 中没有工作表')

  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (raw.length < 2) throw new Error('表格为空或只有表头')

  const headers = raw[0].map(normalizeHeader)
  const indices = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, findColumnIndex(headers, aliases)]),
  )

  const missing = REQUIRED_COLUMNS.filter((key) => indices[key] < 0)
  if (missing.length > 0) {
    throw new Error(
      `表头缺少必填列：${missing.map(columnLabel).join('、')}。请参照 import.csv：word、phonetic、partOfSpeech、definition、example_en、example_zh、image_caption、tags、level`,
    )
  }

  const rows = []

  for (let line = 1; line < raw.length; line += 1) {
    const lineData = raw[line]
    const word = cellText(lineData, indices.word)
    if (!word) continue

    const definition = cellText(lineData, indices.definition)
    const example_en = cellText(lineData, indices.example_en)
    const example_zh = cellText(lineData, indices.example_zh)

    if (!definition) {
      throw new Error(`第 ${line + 1} 行「${word}」缺少释义（definition），请填写中文释义，不要与例句翻译混用`)
    }
    if (!example_en || !example_zh) {
      throw new Error(`第 ${line + 1} 行「${word}」缺少英文例句或例句翻译`)
    }

    rows.push({
      word,
      phonetic: cellText(lineData, indices.phonetic),
      partOfSpeech: cellText(lineData, indices.partOfSpeech),
      definition,
      example_en,
      example_zh,
      image_caption: cellText(lineData, indices.image_caption),
      tags: cellText(lineData, indices.tags),
      level: cellText(lineData, indices.level),
    })
  }

  if (rows.length === 0) throw new Error('没有有效的单词行')
  return rows
}
