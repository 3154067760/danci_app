import fs from 'node:fs'
import path from 'node:path'

/** 从项目根目录加载 .env（不依赖 dotenv 包） */
export function loadEnv(root = process.cwd()) {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return

  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

export function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`缺少环境变量 ${name}，请在项目根目录 .env 中配置（参考 .env.example）`)
  return value
}
