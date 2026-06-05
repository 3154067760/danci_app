/**
 * 将 CSV 批量导入 entries.json
 *
 * 用法:
 *   npm run dict:import -- data/dictionary/import.csv
 *   npm run dict:import -- data/dictionary/import.csv --replace
 */
import fs from 'node:fs'
import { readCsvFile } from './lib/csv.mjs'
import {
  ENTRIES_PATH,
  csvRowToEntry,
  readEntriesFile,
  writeEntriesFile,
} from './lib/dictionary.mjs'

const DEFAULT_INPUT = 'data/dictionary/import.csv'

function getInputPath() {
  const positional = process.argv.find((arg) => !arg.startsWith('-') && !arg.endsWith('.mjs') && arg !== process.argv[0] && arg !== process.argv[1])
  return positional ?? DEFAULT_INPUT
}

function hasFlag(flag) {
  return process.argv.includes(flag)
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

function validateRow(row, lineNo) {
  if (!row.word?.trim()) {
    throw new Error(`第 ${lineNo} 行缺少 word`)
  }
  if (!row.definition?.trim()) {
    throw new Error(`第 ${lineNo} 行「${row.word}」缺少 definition`)
  }
  if (/^[\?？\uFFFD\s]+$/.test(row.definition.trim())) {
    throw new Error(
      `第 ${lineNo} 行「${row.word}」释义乱码，请用 UTF-8 保存 CSV（Excel 选「CSV UTF-8」或在 Cursor 中编辑）`,
    )
  }
}

function main() {
  const inputPath = getInputPath()
  const replace = hasFlag('--replace')

  if (!fs.existsSync(inputPath)) {
    console.error(`未找到 CSV: ${inputPath}`)
    console.error('可先运行: npm run dict:export 或 npm run dict:enrich')
    process.exit(1)
  }

  const rows = readCsvFile(inputPath)
  if (rows.length === 0) {
    console.error('CSV 为空')
    process.exit(1)
  }

  rows.forEach((row, index) => validateRow(row, index + 2))

  const data = readEntriesFile()
  let entries
  let updated = 0
  let created = 0

  if (replace) {
    entries = rows.map((row, index) => csvRowToEntry(row, index + 1, String(index + 1)))
    created = entries.length
  } else {
    entries = [...data.entries]
    const existingByWord = new Map(entries.map((entry) => [entry.word.toLowerCase(), entry]))

    rows.forEach((row) => {
      const key = row.word.trim().toLowerCase()
      const found = existingByWord.get(key)

      if (found) {
        const index = entries.findIndex((entry) => entry.id === found.id)
        entries[index] = csvRowToEntry(row, orderFromId(found.id, index + 1), found.id)
        updated += 1
        return
      }

      const id = nextNumericId(entries.map((entry) => entry.id))
      entries.push(csvRowToEntry(row, Number.parseInt(id, 10), id))
      existingByWord.set(key, entries[entries.length - 1])
      created += 1
    })
  }

  writeEntriesFile({ ...data, entries })

  console.log(`CSV: ${rows.length} 行`)
  console.log(`模式: ${replace ? 'replace（全量替换）' : 'merge（按单词合并）'}`)
  console.log(`新增 ${created} 条，更新 ${updated} 条`)
  console.log(`已写入: ${ENTRIES_PATH}`)
  console.log('下一步: npm run dict:sync-audio')
}

main()
