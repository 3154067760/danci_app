let currentAudio: HTMLAudioElement | null = null
let voicesReady = false
let audioUnlocked = false

export const ENGLISH_LANG = 'en-GB'

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function isHuaweiDevice() {
  return /Huawei|Honor|HONOR|HUAWEI/i.test(navigator.userAgent)
}

function shouldPreferExternalTts() {
  return isMobileDevice() || isHuaweiDevice() || !window.isSecureContext
}

function isSingleWord(text: string) {
  return /^[a-zA-Z'-]+$/.test(text.trim())
}

function isSentence(text: string) {
  return /\s/.test(text.trim())
}

/** 安卓/Huawei 首次需用户交互解锁音频 */
export function unlockAudio() {
  if (audioUnlocked) return
  audioUnlocked = true

  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) void new Ctx().resume()
  } catch {
    // ignore
  }

  const silent = new Audio(
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
  )
  silent.volume = 0.01
  void silent.play().catch(() => {})
}

function getEnglishVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices()
  const isBritish = lang.toLowerCase().includes('gb')

  if (isBritish) {
    return (
      voices.find((voice) => voice.lang === 'en-GB') ??
      voices.find((voice) => /en-GB|british|uk/i.test(voice.name)) ??
      voices.find((voice) => voice.lang.startsWith('en-GB')) ??
      voices.find((voice) => voice.lang.startsWith('en'))
    )
  }

  const langPrefix = lang.split('-')[0]
  return (
    voices.find((voice) => voice.lang === lang) ??
    voices.find((voice) => voice.lang.startsWith(langPrefix)) ??
    voices.find((voice) => voice.lang.startsWith('en'))
  )
}

function speakWithWebSpeech(text: string, lang: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(false)
      return
    }

    const synth = window.speechSynthesis

    const doSpeak = () => {
      synth.cancel()
      if (synth.paused) synth.resume()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.88

      const voice = getEnglishVoice(lang)
      if (voice) utterance.voice = voice

      let settled = false
      const done = (ok: boolean) => {
        if (settled) return
        settled = true
        resolve(ok)
      }

      utterance.onend = () => done(true)
      utterance.onerror = () => done(false)

      synth.speak(utterance)

      window.setTimeout(() => {
        if (!settled && (synth.speaking || synth.pending)) done(true)
      }, 400)
    }

    if (voicesReady && synth.getVoices().length > 0) {
      doSpeak()
      return
    }

    const onVoicesChanged = () => {
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      voicesReady = true
      doSpeak()
    }

    synth.addEventListener('voiceschanged', onVoicesChanged)
    window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      if (!voicesReady) {
        voicesReady = true
        doSpeak()
      }
    }, 300)
  })
}

async function playAudioUrl(url: string): Promise<boolean> {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.removeAttribute('src')
    currentAudio.load()
    currentAudio = null
  }

  return new Promise((resolve) => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = 1
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')

    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok)
    }

    const timer = window.setTimeout(() => done(false), 12000)

    audio.onerror = () => done(false)
    audio.onstalled = () => done(false)

    audio.onplaying = () => {
      if (audio.duration > 0 || Number.isNaN(audio.duration)) {
        done(true)
      }
    }

    audio.src = url
    currentAudio = audio

    audio.play().catch(() => done(false))
  })
}

function getYoudaoUrl(text: string, lang: string) {
  const type = lang.toLowerCase().includes('gb') ? 2 : 1
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text.trim())}&type=${type}`
}

function getGoogleTtsUrl(text: string, lang: string) {
  const tl = lang.toLowerCase().includes('gb') ? 'en-GB' : 'en'
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&q=${encodeURIComponent(text.trim())}&tl=${tl}`
}

async function fetchDictionaryAudioUrl(word: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`,
    )
    if (!response.ok) return null

    const data = (await response.json()) as Array<{ phonetics?: Array<{ audio?: string }> }>
    const phonetics = data[0]?.phonetics ?? []
    const ukAudio = phonetics.find((item) => item.audio?.includes('-uk'))?.audio
    const anyAudio = phonetics.find((item) => item.audio)?.audio
    return ukAudio || anyAudio || null
  } catch {
    return null
  }
}

/** 单词：有道 → 词典 API → Web Speech */
async function playWordTts(text: string, lang: string) {
  unlockAudio()

  if (await playAudioUrl(getYoudaoUrl(text, lang))) return

  const dictUrl = await fetchDictionaryAudioUrl(text)
  if (dictUrl) {
    const fullUrl = dictUrl.startsWith('//') ? `https:${dictUrl}` : dictUrl
    if (await playAudioUrl(fullUrl)) return
  }

  if (await speakWithWebSpeech(text, lang)) return

  await playAudioUrl(getYoudaoUrl(text, lang))
}

/** 例句：Google TTS → Web Speech → 有道（例句有道常无效） */
async function playSentenceTts(text: string, lang: string) {
  unlockAudio()

  if (await playAudioUrl(getGoogleTtsUrl(text, lang))) return

  if (await speakWithWebSpeech(text, lang)) return

  await playAudioUrl(getYoudaoUrl(text, lang))
}

export function speakText(
  text: string,
  lang = ENGLISH_LANG,
  options?: { localAudioUrl?: string },
) {
  const trimmed = text.trim()
  if (!trimmed) return

  unlockAudio()

  if (options?.localAudioUrl) {
    void playAudioUrl(options.localAudioUrl).then((ok) => {
      if (ok) return

      if (isSentence(trimmed)) {
        void playSentenceTts(trimmed, lang)
        return
      }

      if (shouldPreferExternalTts() || !isSingleWord(trimmed)) {
        void playWordTts(trimmed, lang)
        return
      }

      void speakWithWebSpeech(trimmed, lang).then((speechOk) => {
        if (!speechOk) void playWordTts(trimmed, lang)
      })
    })
    return
  }

  if (isSentence(trimmed)) {
    void playSentenceTts(trimmed, lang)
    return
  }

  if (shouldPreferExternalTts() || !isSingleWord(trimmed)) {
    void playWordTts(trimmed, lang)
    return
  }

  void speakWithWebSpeech(trimmed, lang).then((ok) => {
    if (!ok) void playWordTts(trimmed, lang)
  })
}

if (typeof window !== 'undefined') {
  const unlockOnce = () => {
    unlockAudio()
    window.removeEventListener('touchstart', unlockOnce)
    window.removeEventListener('click', unlockOnce)
  }
  window.addEventListener('touchstart', unlockOnce, { passive: true })
  window.addEventListener('click', unlockOnce)

  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voicesReady = true
    })
  }
}
