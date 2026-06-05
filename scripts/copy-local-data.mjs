/**
 * 构建前将 data/local/ 复制到 public/local/，供静态部署读取
 */
import fs from 'node:fs'
import path from 'node:path'

const SOURCE = path.resolve('data/local')
const TARGET = path.resolve('public/local')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true })
    return
  }

  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else if (entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

copyDir(SOURCE, TARGET)
console.log('已同步 data/local → public/local')
