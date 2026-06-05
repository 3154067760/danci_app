import fs from 'node:fs'
import path from 'node:path'
import { writeCsvFile } from './lib/csv.mjs'
import { ENTRIES_PATH, IMPORT_HEADERS, entryToCsvRow, readEntriesFile } from './lib/dictionary.mjs'

const outputPath = process.argv[2] ?? 'data/dictionary/import.csv'

const data = readEntriesFile()
const rows = data.entries.map(entryToCsvRow)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
writeCsvFile(outputPath, IMPORT_HEADERS, rows)

console.log(`已导出 ${rows.length} 条到 ${outputPath}`)
