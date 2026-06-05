/**
 * 从「文件名=单词」的图片文件夹 AI 识图并生成 Excel
 *
 * 1. 将图片放到 data/dictionary/image-inbox/，如 apple.png、grape.jpg
 * 2. 配置 .env（见 .env.example）
 * 3. npm run dict:enrich-from-images
 * 4. 用生成的 words-from-images.xlsx + 同一文件夹图片做批量导入
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './lib/load-env.mjs'
import { enrichImagesFromFolder } from './lib/enrich-from-image.mjs'
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
const output = readArg('--output') ? path.resolve(readArg('--output')) : path.join(dir, 'words-from-images.xlsx')
const limitRaw = readArg('--limit')
const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined

console.log('AI 识图生成词库 Excel')
console.log(`  图片目录: ${dir}`)
console.log(`  输出文件: ${output}`)
if (limit) console.log(`  限制数量: ${limit}`)
console.log('')

const result = await enrichImagesFromFolder({
  dir,
  outputPath: output,
  limit: Number.isFinite(limit) ? limit : undefined,
  onProgress(event) {
    if (event.phase === 'start') {
      console.log(`[${event.index}/${event.total}] 处理 ${event.word} (${event.file})…`)
    } else if (event.phase === 'error') {
      console.log(`  ✗ ${event.word}: ${event.error}`)
    } else if (event.phase === 'done') {
      console.log(`  ✓ ${event.word}: ${event.row.example_en}`)
    }
  },
})

console.log('')
console.log(`完成：成功 ${result.success}，失败 ${result.failed}`)
console.log(`Excel: ${result.outputPath}`)
console.log('')
console.log('下一步：打开「批量导入（Excel + 图片）」')
console.log(`  - Excel: ${path.basename(result.outputPath)}`)
console.log(`  - 图片文件夹: ${dir}`)

if (result.errors.length > 0) {
  console.log('\n失败条目:')
  for (const item of result.errors) {
    console.log(`  - ${item.word}: ${item.error}`)
  }
  process.exitCode = 1
}
