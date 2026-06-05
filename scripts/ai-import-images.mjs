/**
 * AI 识图并直接导入词库（无需 Excel）
 * 用法: npm run dict:ai-import-images [-- --limit 5 --dict builtin-cet4]
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './lib/load-env.mjs'
import { aiImportImagesFromDir } from './lib/ai-import-images.mjs'
import { IMAGE_INBOX_DIR } from './lib/word-images.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
loadEnv(root)

function readArg(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index >= process.argv.length - 1) return undefined
  return process.argv[index + 1]
}

const dir = readArg('--dir') ? path.resolve(readArg('--dir')) : IMAGE_INBOX_DIR
const dictionaryId = readArg('--dict')
const limitRaw = readArg('--limit')
const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined

console.log('AI 图片导入（无需 Excel）')
console.log(`  图片目录: ${dir}`)
if (dictionaryId) console.log(`  目标词书: ${dictionaryId}`)
if (limit) console.log(`  限制数量: ${limit}`)
console.log('')

const result = await aiImportImagesFromDir({
  dir,
  dictionaryId,
  limit: Number.isFinite(limit) ? limit : undefined,
  onProgress(event) {
    if (event.phase === 'start') {
      console.log(`[${event.index}/${event.total}] ${event.word} (${event.file})…`)
    } else if (event.phase === 'error') {
      console.log(`  ✗ ${event.error}`)
    } else if (event.phase === 'skip') {
      console.log(`  ○ ${event.word}: 词库已有，跳过`)
    } else if (event.phase === 'done') {
      console.log(`  ✓ ${event.row.example_en}`)
    }
  },
})

console.log('')
console.log(result.message)
console.log(`词库共 ${result.entryCount} 条`)

if (result.errors?.length) {
  console.log('\n失败:')
  for (const item of result.errors) {
    console.log(`  - ${item.word}: ${item.error}`)
  }
  process.exitCode = 1
}
