import { requireEnv } from './load-env.mjs'

const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com'
const SILICONFLOW_BASE = process.env.SILICONFLOW_BASE_URL?.trim() || 'https://api.siliconflow.cn/v1'

export const DEEPSEEK_TEXT_MODEL = process.env.DEEPSEEK_TEXT_MODEL?.trim() || 'deepseek-v4-flash'
export const SILICONFLOW_VISION_MODEL =
  process.env.SILICONFLOW_VISION_MODEL?.trim() || 'Qwen/Qwen3.5-9B'

async function chatCompletion({ baseUrl, apiKey, body }) {
  let response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`网络请求失败：${reason}`)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || response.statusText || 'API 请求失败'
    throw new Error(message)
  }

  const message = payload?.choices?.[0]?.message
  const content = String(message?.content || message?.reasoning_content || '').trim()
  if (!content) throw new Error('模型未返回内容')
  return content
}

/** DeepSeek 文本补全（例句扩写、释义等） */
export async function deepseekChat(messages, options = {}) {
  const apiKey = requireEnv('DEEPSEEK_API_KEY')
  return chatCompletion({
    baseUrl: DEEPSEEK_BASE,
    apiKey,
    body: {
      model: options.model || DEEPSEEK_TEXT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      thinking: { type: 'disabled' },
    },
  })
}

/** 硅基流动 Qwen 识图 */
export async function siliconflowVisionChat({ imageDataUrl, text, options = {} }) {
  const apiKey = requireEnv('SILICONFLOW_API_KEY')
  return chatCompletion({
    baseUrl: SILICONFLOW_BASE,
    apiKey,
    body: {
      model: options.model || SILICONFLOW_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail: 'high',
              },
            },
            { type: 'text', text },
          ],
        },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      chat_template_kwargs: { enable_thinking: false },
    },
  })
}
