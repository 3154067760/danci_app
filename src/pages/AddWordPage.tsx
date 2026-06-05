import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useWordBank } from '../context/WordBankContext'
import { aiAddWord, isLocalDataApiAvailable } from '../utils/localData'
import './AddWordPage.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export default function AddWordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dictId = searchParams.get('dictId')
  const { reloadBuiltinWords } = useWordBank()
  const { dictionaries, reloadDictionaryState } = useDictionaries()

  const targetDictionary = useMemo(
    () => dictionaries.find((item) => item.id === dictId),
    [dictionaries, dictId],
  )

  const [word, setWord] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [syncGit, setSyncGit] = useState(true)
  const [canRun, setCanRun] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'idle' | 'ai' | 'save' | 'git' | 'done'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{
    phonetic: string
    definition: string
    example_en: string
    example_zh: string
  } | null>(null)

  useEffect(() => {
    void isLocalDataApiAvailable().then(setCanRun)
  }, [])

  const handleImageChange = (file: File | null) => {
    setImageFile(file)
    setPreview(null)
    if (!file) {
      setImagePreview(null)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageFile(null)
      setImagePreview(null)
      setError(`图片过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请压缩到 ≤2MB`)
      return
    }
    setError('')
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setPreview(null)
    setPhase('ai')
    setSubmitting(true)

    const trimmedWord = word.trim()
    if (!trimmedWord) {
      setError('请填写单词')
      setSubmitting(false)
      setPhase('idle')
      return
    }
    if (!imageFile) {
      setError('请上传配图')
      setSubmitting(false)
      setPhase('idle')
      return
    }

    try {
      const ext = imageFile.name.match(/\.(png|jpe?g|webp)$/i)?.[0] ?? '.png'
      const formData = new FormData()
      formData.append('word', trimmedWord)
      formData.append('image', imageFile, `${trimmedWord}${ext}`)
      formData.append('syncGit', syncGit ? 'true' : 'false')
      if (targetDictionary) {
        formData.append('dictionaryId', targetDictionary.id)
      }

      setPhase('ai')
      const result = await aiAddWord(formData)
      if (!result.ok) {
        setError(result.error ?? '添加失败')
        setPhase('idle')
        return
      }

      setPhase('save')
      if (result.row) {
        setPreview({
          phonetic: result.row.phonetic,
          definition: result.row.definition,
          example_en: result.row.example_en,
          example_zh: result.row.example_zh,
        })
      }

      await Promise.all([reloadBuiltinWords(), reloadDictionaryState()])

      if (syncGit) setPhase('git')
      setPhase('done')

      const wordId = result.wordId
      if (wordId) {
        navigate(`/study/detail/${wordId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setPhase('idle')
    } finally {
      setSubmitting(false)
    }
  }

  const phaseLabel = useMemo(() => {
    if (phase === 'ai') return 'AI 识图中，正在生成音标、释义与例句…'
    if (phase === 'save') return '写入词库…'
    if (phase === 'git') return '同步到 GitHub…'
    if (phase === 'done') return '完成'
    return ''
  }, [phase])

  return (
    <div className="page add-word-page">
      <header className="add-word-header">
        <button type="button" className="add-word-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="add-word-title">添加单词</h1>
        <p className="add-word-subtitle">
          只需填写<strong>单词</strong>并上传<strong>配图</strong>，音标、释义、例句由 AI 自动生成并写入词库
          {targetDictionary ? `，并加入「${targetDictionary.name}」` : ''}。
        </p>
      </header>

      {canRun === false && (
        <p className="add-word-warn">
          需在 dev / PM2 模式下运行，且项目根目录配置 <code>.env</code>（参考 <code>.env.example</code>）。
        </p>
      )}

      <form className="add-word-form" onSubmit={(e) => void handleSubmit(e)}>
        <section className="add-word-section">
          <h2 className="add-word-section-title">单词与配图</h2>
          <label className="add-word-field">
            <span>单词 *</span>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="如 ladder"
              required
              autoComplete="off"
            />
          </label>
          <label className="add-word-file">
            <span>配图 *（png / jpg / webp，≤ 2MB，建议 640×400）</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {imagePreview && (
            <div className="add-word-image-preview">
              <img src={imagePreview} alt="预览" />
            </div>
          )}
        </section>

        <section className="add-word-section">
          <label className="add-word-checkbox">
            <input
              type="checkbox"
              checked={syncGit}
              onChange={(e) => setSyncGit(e.target.checked)}
            />
            <span>保存后自动提交并推送到 GitHub</span>
          </label>
          <p className="add-word-hint">会提交 entries.json、import.csv 与新图片；需本机已配置 Git 远程与登录。</p>
        </section>

        {phaseLabel && submitting && (
          <p className="add-word-phase" aria-live="polite">
            {phaseLabel}
          </p>
        )}

        {preview && (
          <section className="add-word-section add-word-preview">
            <h2 className="add-word-section-title">AI 生成预览</h2>
            <p>
              <strong>{word.trim()}</strong> {preview.phonetic}
            </p>
            <p>{preview.definition}</p>
            <p>{preview.example_en}</p>
            <p className="add-word-muted">{preview.example_zh}</p>
          </section>
        )}

        {error && <p className="add-word-error">{error}</p>}

        <button
          type="submit"
          className="add-word-submit"
          disabled={submitting || canRun === false || !word.trim() || !imageFile}
        >
          {submitting ? 'AI 生成并保存中…' : 'AI 生成并保存'}
        </button>
      </form>
    </div>
  )
}
