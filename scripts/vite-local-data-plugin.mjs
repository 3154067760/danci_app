/**
 * 开发/预览时提供本地文件读写 API，数据保存在 data/local/ 与 public/dictionary/
 */
import fs from 'node:fs'
import path from 'node:path'
import { syncDictionaryAudio } from './lib/sync-dictionary-audio-core.mjs'
import { loadEnv } from './lib/load-env.mjs'
import { enrichImagesFromFolder } from './lib/enrich-from-image.mjs'
import { aiImportImages, parseMultipartAiImport } from './lib/ai-import-images.mjs'
import {
  batchImportWords,
  parseMultipartBatchImport,
  readEntriesForApi,
} from './lib/batch-import-words.mjs'

const LOCAL_DIR = path.resolve('data/local')
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..')
loadEnv(PROJECT_ROOT)
const DICT_IMAGES = path.resolve('public/dictionary/images')
const DICT_WORD_AUDIO = path.resolve('public/dictionary/audio/words')
const DICT_SENTENCE_AUDIO = path.resolve('public/dictionary/audio/sentences')

const ALLOWED_KEYS = new Set([
  'custom-words',
  'dictionaries',
  'check-ins',
  'study-records',
  'favorites',
  'theme',
])

/** 非 JSON 文件类 API，不应落入 generic key 路由 */
const API_ACTIONS = new Set([
  'health',
  'asset',
  'sync-audio',
  'batch-import',
  'enrich-from-images',
  'ai-import-images',
  'entries',
])

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function slugify(word) {
  return (
    word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'word'
  )
}

function extFromMime(mime) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
  }
  return map[mime] ?? '.bin'
}

function readJsonFile(key) {
  const filePath = path.join(LOCAL_DIR, `${key}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJsonFile(key, data) {
  ensureDir(LOCAL_DIR)
  const filePath = path.join(LOCAL_DIR, `${key}.json`)
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

async function handleAiImportImages(req, res) {
  const wantsStream = req.headers.accept?.includes('text/event-stream')

  try {
    const payload = await parseMultipartAiImport(req)

    if (wantsStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })

      const result = await aiImportImages({
        ...payload,
        onProgress: (event) => sendSse(res, event),
      })

      sendSse(res, { phase: 'complete', result: { ok: true, ...result } })
      res.end()
      return
    }

    const result = await aiImportImages(payload)
    sendJson(res, 200, { ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 图片导入失败'
    if (wantsStream && !res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })
    }
    if (res.headersSent) {
      sendSse(res, { phase: 'fatal', error: message })
      res.end()
    } else {
      sendJson(res, 400, { error: message })
    }
  }
}

function saveAsset({ wordId, word, type, dataUrl }) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('无效的数据 URL')

  const mime = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  const ext = extFromMime(mime)
  const slug = slugify(word)
  const shortId = String(wordId).split('-').pop() ?? 'x'

  let dir
  let fileName
  let publicUrl

  if (type === 'image') {
    dir = DICT_IMAGES
    fileName = `custom-${slug}-${shortId}${ext}`
    publicUrl = `/dictionary/images/${fileName}`
  } else if (type === 'word-audio') {
    dir = DICT_WORD_AUDIO
    fileName = `custom-${slug}-${shortId}-word${ext}`
    publicUrl = `/dictionary/audio/words/${fileName}`
  } else if (type === 'sentence-audio') {
    dir = DICT_SENTENCE_AUDIO
    fileName = `custom-${slug}-${shortId}-sentence${ext}`
    publicUrl = `/dictionary/audio/sentences/${fileName}`
  } else {
    throw new Error(`未知资源类型: ${type}`)
  }

  ensureDir(dir)
  fs.writeFileSync(path.join(dir, fileName), buffer)
  return { url: publicUrl }
}

let syncAudioRunning = false

async function handleSyncAudio(req, res, body) {
  if (syncAudioRunning) {
    sendJson(res, 409, { error: '正在同步中，请稍后再试' })
    return
  }

  syncAudioRunning = true
  try {
    const payload = body?.trim() ? JSON.parse(body) : {}
    const force = payload.force === true
    const sentencesOnly = payload.sentencesOnly !== false

    const result = await syncDictionaryAudio({
      force,
      sentencesOnly,
      onLog: (line) => console.log(`[sync-audio] ${line}`),
    })

    sendJson(res, 200, {
      ok: true,
      stats: result.stats,
      customWordsUpdated: result.customWordsUpdated,
      voice: result.voice,
      message: `成功 ${result.stats.ok}，跳过 ${result.stats.skip}，失败 ${result.stats.fail}`,
    })
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : '同步失败',
    })
  } finally {
    syncAudioRunning = false
  }
}

async function handleLocalDataRequest(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const pathname = url.pathname

  if (pathname === '/api/local-data/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (pathname === '/api/local-data/asset' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req))
      const result = saveAsset(body)
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : '保存失败' })
    }
    return
  }

  if (pathname === '/api/local-data/sync-audio' && req.method === 'POST') {
    const body = await readBody(req)
    await handleSyncAudio(req, res, body)
    return
  }

  if (pathname === '/api/local-data/batch-import' && req.method === 'POST') {
    try {
      const payload = await parseMultipartBatchImport(req)
      const result = batchImportWords(payload)
      sendJson(res, 200, {
        ok: true,
        message: `导入完成：新增 ${result.created}，更新 ${result.updated}，词库共 ${result.entryCount} 条`,
        ...result,
      })
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : '导入失败' })
    }
    return
  }

  if (pathname === '/api/local-data/enrich-from-images' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const payload = body?.trim() ? JSON.parse(body) : {}
      const dir = payload.dir ? path.resolve(payload.dir) : path.join(PROJECT_ROOT, 'data/dictionary/image-inbox')
      const outputPath = payload.output
        ? path.resolve(payload.output)
        : path.join(dir, 'words-from-images.xlsx')
      const limit = Number.isFinite(payload.limit) ? payload.limit : undefined

      const result = await enrichImagesFromFolder({ dir, outputPath, limit })
      sendJson(res, 200, {
        ok: true,
        message: `已生成 ${result.success} 条，Excel 保存在 ${path.relative(PROJECT_ROOT, result.outputPath)}`,
        outputPath: result.outputPath,
        ...result,
      })
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'AI 识图失败' })
    }
    return
  }

  if (pathname === '/api/local-data/ai-import-images' && req.method === 'POST') {
    await handleAiImportImages(req, res)
    return
  }

  if (pathname === '/api/local-data/entries' && req.method === 'GET') {
    sendJson(res, 200, readEntriesForApi())
    return
  }

  const keyMatch = pathname.match(/^\/api\/local-data\/([a-z-]+)$/)
  if (!keyMatch) {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  const key = keyMatch[1]
  if (API_ACTIONS.has(key)) {
    sendJson(res, 503, {
      error: 'AI 导入接口未加载，请重启开发服务：终端 Ctrl+C 停止后重新运行 npm run dev',
    })
    return
  }
  if (!ALLOWED_KEYS.has(key)) {
    sendJson(res, 400, { error: '无效的数据键' })
    return
  }

  if (req.method === 'GET') {
    const data = readJsonFile(key)
    if (data === null) {
      sendJson(res, 404, { error: '文件不存在' })
      return
    }
    sendJson(res, 200, data)
    return
  }

  if (req.method === 'PUT') {
    try {
      const body = JSON.parse(await readBody(req))
      writeJsonFile(key, body)
      sendJson(res, 200, { ok: true })
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : '写入失败' })
    }
    return
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}

function attachMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith('/api/local-data')) {
      next()
      return
    }
    void handleLocalDataRequest(req, res)
  })
}

export function localDataPlugin() {
  return {
    name: 'local-data',
    configureServer(server) {
      attachMiddleware(server)
    },
    configurePreviewServer(server) {
      attachMiddleware(server)
    },
  }
}
