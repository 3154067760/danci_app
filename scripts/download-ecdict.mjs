/**
 * 下载 ECDICT 词库到 data/dictionary/ecdict.csv
 * npm run dict:download-ecdict
 */
import fs from 'node:fs'
import path from 'node:path'

const URL = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv'
const DEST = path.resolve('data/dictionary/ecdict.csv')

async function main() {
  if (fs.existsSync(DEST) && fs.statSync(DEST).size > 1_000_000) {
    console.log(`已存在: ${DEST}`)
    console.log('如需重新下载，请先删除该文件')
    return
  }

  fs.mkdirSync(path.dirname(DEST), { recursive: true })
  console.log('正在下载 ECDICT（约 22MB）...')
  console.log(URL)

  const response = await fetch(URL)
  if (!response.ok) {
    throw new Error(`下载失败: HTTP ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(DEST, buffer)
  console.log(`已保存: ${DEST} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
}

main().catch((error) => {
  console.error(error.message)
  console.error('\n手动下载:')
  console.error('  https://github.com/skywind3000/ECDICT')
  console.error('  点击 ecdict.csv → Download raw file')
  process.exit(1)
})
