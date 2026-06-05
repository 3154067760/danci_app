import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const TRACKED_PATHS = [
  'src/data/offlineDictionary/entries.json',
  'data/dictionary/import.csv',
  'public/dictionary/images',
  'data/local/dictionaries.json',
  'public/local/dictionaries.json',
]

function runGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/**
 * 提交词库变更并推送到 GitHub
 * @param {{ message?: string, projectRoot?: string }} options
 */
export function syncDictionaryToGit(options = {}) {
  const root = options.projectRoot ?? path.resolve(import.meta.dirname, '../..')
  const message = options.message?.trim() || 'chore: update dictionary entries'

  if (!fs.existsSync(path.join(root, '.git'))) {
    return { ok: false, error: '当前目录不是 Git 仓库' }
  }

  try {
    for (const rel of TRACKED_PATHS) {
      const abs = path.join(root, rel)
      if (fs.existsSync(abs)) {
        runGit(root, ['add', rel])
      }
    }

    const status = runGit(root, ['status', '--porcelain'])
    if (!status) {
      return { ok: true, pushed: false, message: '词库无变更，无需提交' }
    }

    runGit(root, ['commit', '-m', message])
    runGit(root, ['push'])
    return { ok: true, pushed: true, message: '已提交并推送到 GitHub' }
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? ''
    const stdout = error?.stdout?.toString?.() ?? ''
    const detail = (stderr || stdout || error.message || 'Git 操作失败').trim()
    return { ok: false, error: detail }
  }
}
