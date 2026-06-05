import { FormEvent, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useWordBank } from '../context/WordBankContext'
import { readFileAsDataUrl } from '../utils/customWords'
import './AddWordPage.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_AUDIO_BYTES = 2 * 1024 * 1024

export default function AddWordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dictId = searchParams.get('dictId')
  const { addCustomWord } = useWordBank()
  const { dictionaries, addWordsToDictionary, setActiveDictionary } = useDictionaries()

  const targetDictionary = useMemo(
    () => dictionaries.find((item) => item.id === dictId),
    [dictionaries, dictId],
  )

  const [word, setWord] = useState('')
  const [phonetic, setPhonetic] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('n.')
  const [definition, setDefinition] = useState('')
  const [example, setExample] = useState('')
  const [exampleTranslation, setExampleTranslation] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [wordAudioFile, setWordAudioFile] = useState<File | null>(null)
  const [sentenceAudioFile, setSentenceAudioFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = async (file: File | null) => {
    setImageFile(file)
    if (!file) {
      setImagePreview(null)
      return
    }
    try {
      const url = await readFileAsDataUrl(file, MAX_IMAGE_BYTES)
      setImagePreview(url)
      setError('')
    } catch (err) {
      setImageFile(null)
      setImagePreview(null)
      setError(err instanceof Error ? err.message : '图片读取失败')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let imageUrl = ''
      if (imageFile) {
        imageUrl = await readFileAsDataUrl(imageFile, MAX_IMAGE_BYTES)
      }

      let wordAudioUrl: string | undefined
      if (wordAudioFile) {
        wordAudioUrl = await readFileAsDataUrl(wordAudioFile, MAX_AUDIO_BYTES)
      }

      let sentenceAudioUrl: string | undefined
      if (sentenceAudioFile) {
        sentenceAudioUrl = await readFileAsDataUrl(sentenceAudioFile, MAX_AUDIO_BYTES)
      }

      const entry = addCustomWord({
        word,
        phonetic,
        partOfSpeech,
        definition,
        example,
        exampleTranslation,
        imageCaption: imageCaption || word.trim(),
        imageUrl,
        wordAudioUrl,
        sentenceAudioUrl,
      })

      if (targetDictionary) {
        addWordsToDictionary(targetDictionary.id, [entry.id])
        setActiveDictionary(targetDictionary.id)
        navigate(`/study/detail/${entry.id}`)
        return
      }

      navigate(`/study/detail/${entry.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page add-word-page">
      <header className="add-word-header">
        <button type="button" className="add-word-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="add-word-title">添加单词</h1>
        <p className="add-word-subtitle">
          {targetDictionary
            ? `将保存到本地文件（data/local/），并加入「${targetDictionary.name}」`
            : '保存到本地文件（data/local/），可在词书中选词使用'}
        </p>
      </header>

      <form className="add-word-form" onSubmit={handleSubmit}>
        <section className="add-word-section">
          <h2 className="add-word-section-title">基本信息</h2>
          <label className="add-word-field">
            <span>单词 *</span>
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="如 ladder" required />
          </label>
          <div className="add-word-row">
            <label className="add-word-field">
              <span>音标</span>
              <input
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="/ˈlædə(r)/"
              />
            </label>
            <label className="add-word-field add-word-field--short">
              <span>词性</span>
              <input value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)} placeholder="n." />
            </label>
          </div>
          <label className="add-word-field">
            <span>中文释义 *</span>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="梯子；阶梯"
              rows={2}
              required
            />
          </label>
        </section>

        <section className="add-word-section">
          <h2 className="add-word-section-title">例句</h2>
          <label className="add-word-field">
            <span>英文例句</span>
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="He climbed the ladder to fix the roof."
              rows={2}
            />
          </label>
          <label className="add-word-field">
            <span>例句翻译</span>
            <textarea
              value={exampleTranslation}
              onChange={(e) => setExampleTranslation(e.target.value)}
              placeholder="他爬上梯子修理屋顶。"
              rows={2}
            />
          </label>
        </section>

        <section className="add-word-section">
          <h2 className="add-word-section-title">配图</h2>
          <label className="add-word-field">
            <span>图片说明</span>
            <input
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Climb the Ladder"
            />
          </label>
          <label className="add-word-file">
            <span>上传图片（选填，最大 2MB）</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => void handleImageChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {imagePreview && (
            <div className="add-word-image-preview">
              <img src={imagePreview} alt="预览" />
            </div>
          )}
        </section>

        <section className="add-word-section">
          <h2 className="add-word-section-title">发音（选填）</h2>
          <p className="add-word-hint">不上传时将使用英式 TTS 在线播放</p>
          <label className="add-word-file">
            <span>单词发音 mp3</span>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
              onChange={(e) => setWordAudioFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="add-word-file">
            <span>例句发音 mp3</span>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
              onChange={(e) => setSentenceAudioFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </section>

        {error && <p className="add-word-error">{error}</p>}

        <button type="submit" className="add-word-submit" disabled={submitting}>
          {submitting ? '保存中…' : '保存单词'}
        </button>
      </form>
    </div>
  )
}
