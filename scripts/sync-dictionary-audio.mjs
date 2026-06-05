/**
 * 批量生成离线发音（Microsoft Edge TTS，国内可用）
 *
 *   npm run dict:sync-audio
 *   npm run dict:sync-audio -- --force          覆盖已有文件
 *   npm run dict:sync-audio -- --limit 10       只处理前 10 条（测试用）
 *   npm run dict:sync-audio -- --sentences-only  只生成例句发音（跳过已有文件）
 */
import { syncDictionaryAudio } from './lib/sync-dictionary-audio-core.mjs'

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function getLimit() {
  const index = process.argv.indexOf('--limit')
  if (index === -1) return Infinity
  return Number.parseInt(process.argv[index + 1] ?? '', 10) || Infinity
}

async function main() {
  const force = hasFlag('--force')
  const sentencesOnly = hasFlag('--sentences-only')
  const limit = getLimit()

  await syncDictionaryAudio({
    force,
    sentencesOnly,
    limit,
    onLog: (line) => console.log(line),
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
