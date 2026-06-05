#!/usr/bin/env node
/**
 * 提交词库变更并推送到 GitHub
 * 用法: npm run dict:git-sync [-- --message "dict: update words"]
 */
import { syncDictionaryToGit } from './lib/git-sync-dictionary.mjs'

const args = process.argv.slice(2)
let message = 'chore: update dictionary entries'

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--message' && args[i + 1]) {
    message = args[i + 1]
    break
  }
}

const result = syncDictionaryToGit({ message })

if (!result.ok) {
  console.error(result.error ?? 'Git 同步失败')
  process.exit(1)
}

console.log(result.message ?? '完成')
