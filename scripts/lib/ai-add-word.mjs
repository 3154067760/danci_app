import Busboy from 'busboy'
import path from 'node:path'
import { batchImportWords } from './batch-import-words.mjs'
import { enrichWordFromBuffer } from './enrich-from-image.mjs'
import { syncDictionaryToGit } from './git-sync-dictionary.mjs'

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i

function stripVisionFields(row) {
  const { _vision, ...rest } = row
  return rest
}

/**
 * AI 识图补全单个单词并写入词库
 * @param {{ word: string, buffer: Buffer, filename: string, dictionaryId?: string, syncGit?: boolean }} input
 */
export async function aiAddWord(input) {
  const word = String(input.word ?? '').trim()
  const { buffer, filename } = input

  if (!word) throw new Error('请填写单词')
  if (!buffer?.length) throw new Error('请上传图片')
  if (!IMAGE_EXT.test(filename)) {
    throw new Error('图片格式须为 png / jpg / webp')
  }

  const row = stripVisionFields(
    await enrichWordFromBuffer({
      word,
      buffer,
      filename: path.basename(filename),
    }),
  )

  if (!row.definition || !row.example_en || !row.example_zh) {
    throw new Error('AI 返回字段不完整，请重试')
  }

  const importResult = batchImportWords({
    rows: [row],
    images: [{ buffer, filename }],
    dictionaryId: input.dictionaryId,
  })

  let gitResult = null
  if (input.syncGit) {
    gitResult = syncDictionaryToGit({
      message: `dict: add ${word}`,
    })
  }

  const wordId = importResult.importedIds[0]
  const action = importResult.created > 0 ? '新增' : '更新'

  return {
    word,
    wordId,
    row,
    git: gitResult,
    message: `${action}「${word}」成功${gitResult?.pushed ? '，已同步 GitHub' : gitResult?.ok ? '' : gitResult?.error ? `（Git：${gitResult.error}）` : ''}`,
    ...importResult,
  }
}

export function parseMultipartAiAddWord(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    let imageBuffer = null
    let imageFilename = ''
    let word = ''
    let dictionaryId = ''
    let syncGit = true
    let pending = 0
    let busboyFinished = false

    function tryResolve() {
      if (!busboyFinished || pending > 0) return
      if (!imageBuffer?.length) {
        reject(new Error('请上传图片'))
        return
      }
      resolve({
        word: word.trim(),
        buffer: imageBuffer,
        filename: imageFilename,
        dictionaryId: dictionaryId.trim() || undefined,
        syncGit: syncGit !== 'false' && syncGit !== '0',
      })
    }

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname !== 'image') {
        file.resume()
        return
      }
      pending += 1
      const chunks = []
      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => {
        imageBuffer = Buffer.concat(chunks)
        imageFilename = info.filename
        pending -= 1
        tryResolve()
      })
    })

    busboy.on('field', (name, value) => {
      if (name === 'word') word = value
      if (name === 'dictionaryId') dictionaryId = value
      if (name === 'syncGit') syncGit = value
    })

    busboy.on('finish', () => {
      busboyFinished = true
      tryResolve()
    })

    busboy.on('error', reject)
    req.pipe(busboy)
  })
}
