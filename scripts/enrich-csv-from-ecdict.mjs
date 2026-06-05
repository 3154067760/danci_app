/**
 * 用词表 CSV + ECDICT 数据生成可导入的词典 CSV
 *
 * 用法:
 *   npm run dict:enrich -- data/dictionary/word-list.csv
 *
 * 需先将 ECDICT 的 ecdict.csv 放到 data/dictionary/ecdict.csv
 * 下载: https://github.com/skywind3000/ECDICT （仓库根目录 ecdict.csv，非 Releases）
 */
import fs from 'node:fs'
import path from 'node:path'
import { readCsvFile, writeCsvFile } from './lib/csv.mjs'
import {
  IMPORT_HEADERS,
  cleanDefinition,
  extractPartOfSpeech,
  normalizePhonetic,
} from './lib/dictionary.mjs'

const DEFAULT_INPUT = 'data/dictionary/word-list.example.csv'
const DEFAULT_OUTPUT = 'data/dictionary/import.csv'
const ECDICT_PATH = 'data/dictionary/ecdict.csv'

function getInputPath() {
  const positional = process.argv.find(
    (arg) =>
      !arg.startsWith('-') &&
      !arg.endsWith('.mjs') &&
      arg !== process.argv[0] &&
      arg !== process.argv[1],
  )
  return positional ?? DEFAULT_INPUT
}

function getArg(flag, fallback) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function loadEcdictMap(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`未找到 ECDICT 文件: ${filePath}`)
    console.error('请从 https://github.com/skywind3000/EC-DICT/releases 下载 ecdict.csv')
    process.exit(1)
  }

  const rows = readCsvFile(filePath)
  const map = new Map()

  for (const row of rows) {
    const word = row.word?.trim().toLowerCase()
    if (!word || map.has(word)) continue
    map.set(word, row)
  }

  return map
}

function main() {
  const inputPath = getInputPath()
  const outputPath = getArg('--output', DEFAULT_OUTPUT)
  const ecdictPath = getArg('--ecdict', ECDICT_PATH)

  if (!fs.existsSync(inputPath)) {
    console.error(`未找到词表: ${inputPath}`)
    console.error('可复制 data/dictionary/word-list.example.csv 开始')
    process.exit(1)
  }

  const wordRows = readCsvFile(inputPath)
  const ecdictMap = loadEcdictMap(ecdictPath)
  const output = []
  let matched = 0
  let missing = 0

  for (const row of wordRows) {
    const word = row.word?.trim()
    if (!word || word.toLowerCase() === 'word') continue

    const hit = ecdictMap.get(word.toLowerCase())
    if (!hit) {
      missing += 1
      console.warn(`  未匹配: ${word}`)
      output.push({
        word,
        phonetic: row.phonetic ?? '',
        partOfSpeech: row.partOfSpeech ?? '',
        definition: row.definition ?? '',
        example_en: row.example_en ?? '',
        example_zh: row.example_zh ?? '',
        image_file: row.image_file ?? '',
        image_caption: row.image_caption ?? word,
        tags: row.tags ?? '',
        level: row.level ?? '',
      })
      continue
    }

    matched += 1
    output.push({
      word,
      phonetic: normalizePhonetic(hit.phonetic ?? row.phonetic ?? ''),
      partOfSpeech:
        row.partOfSpeech?.trim() ||
        extractPartOfSpeech(hit.translation ?? '', hit.pos ?? ''),
      definition: row.definition?.trim() || cleanDefinition(hit.translation ?? '', hit.definition ?? ''),
      example_en: row.example_en ?? '',
      example_zh: row.example_zh ?? '',
      image_file: row.image_file ?? '',
      image_caption: row.image_caption ?? word,
      tags: row.tags ?? hit.tag ?? '',
      level: row.level ?? '',
    })
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  writeCsvFile(outputPath, IMPORT_HEADERS, output)

  console.log(`词表: ${wordRows.length} 条`)
  console.log(`ECDICT 匹配: ${matched} 条，未匹配: ${missing} 条`)
  console.log(`已写入: ${outputPath}`)
  console.log('下一步: 补全 example_en / example_zh / image_file 后运行 npm run dict:import')
}

main()
