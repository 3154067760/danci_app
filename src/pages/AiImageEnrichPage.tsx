import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useWordBank } from '../context/WordBankContext'
import {
  aiImportImages,
  isLocalDataApiAvailable,
  type AiImportProgressEvent,
} from '../utils/localData'
import { sortImageFiles } from '../utils/parseExcelWords'
import './AiImageEnrichPage.css'

export default function AiImageEnrichPage() {
  const navigate = useNavigate()
  const { dictionaries, activeDictionary, reloadDictionaryState } = useDictionaries()
  const { reloadBuiltinWords } = useWordBank()

  const [canRun, setCanRun] = useState<boolean | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [targetDictId, setTargetDictId] = useState(activeDictionary.id)
  const [submitting, setSubmitting] = useState(false)
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressDone, setProgressDone] = useState(0)
  const [progressOk, setProgressOk] = useState(0)
  const [progressFail, setProgressFail] = useState(0)
  const [progressSkip, setProgressSkip] = useState(0)
  const [progressWord, setProgressWord] = useState('')
  const [progressPhase, setProgressPhase] = useState<'idle' | 'scan' | 'save' | 'done'>('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState<Array<{ word: string; example_en: string; definition: string }>>([])
  const [failures, setFailures] = useState<Array<{ word: string; error: string }>>([])

  const progressPercent = useMemo(() => {
    if (progressPhase === 'save') return 98
    if (progressTotal <= 0) return 0
    if (progressPhase === 'done') return 100
    return Math.min(97, Math.round((progressDone / progressTotal) * 100))
  }, [progressDone, progressTotal, progressPhase])

  const progressLabel = useMemo(() => {
    if (progressPhase === 'save') return '正在写入词库…'
    if (progressPhase === 'done') return '导入完成'
    if (progressTotal <= 0) return '准备中…'
    if (progressWord) return `识图中：${progressWord}（${progressDone}/${progressTotal}）`
    return `处理中 ${progressDone}/${progressTotal}`
  }, [progressDone, progressPhase, progressTotal, progressWord])

  useEffect(() => {
    void isLocalDataApiAvailable().then(setCanRun)
  }, [])

  useEffect(() => {
    setTargetDictId(activeDictionary.id)
  }, [activeDictionary.id])

  const resetProgress = () => {
    setProgressTotal(0)
    setProgressDone(0)
    setProgressOk(0)
    setProgressFail(0)
    setProgressSkip(0)
    setProgressWord('')
    setProgressPhase('idle')
  }

  const handleProgress = (event: AiImportProgressEvent) => {
    if (event.phase === 'start' && event.total) {
      setProgressTotal(event.total)
      setProgressPhase('scan')
      setProgressWord(event.word ?? '')
    } else if (event.phase === 'skip') {
      setProgressDone(event.index ?? progressDone + 1)
      setProgressSkip((count) => count + 1)
      setProgressWord(event.word ?? '')
    } else if (event.phase === 'done') {
      setProgressDone(event.index ?? progressDone + 1)
      setProgressOk((count) => count + 1)
      setProgressWord(event.word ?? '')
    } else if (event.phase === 'error') {
      setProgressDone(event.index ?? progressDone + 1)
      setProgressFail((count) => count + 1)
      setProgressWord(event.word ?? '')
    } else if (event.phase === 'saving') {
      setProgressPhase('save')
      setProgressWord('')
    } else if (event.phase === 'complete') {
      setProgressPhase('done')
      setProgressDone(event.result?.aiTotal ?? progressTotal)
    }
  }

  const handleImagesChange = (files: FileList | null) => {
    setError('')
    setSuccess('')
    setPreview([])
    setFailures([])
    resetProgress()
    if (!files) {
      setImageFiles([])
      return
    }
    setImageFiles(sortImageFiles(Array.from(files)))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setPreview([])
    setFailures([])
    resetProgress()

    if (imageFiles.length === 0) {
      setError('请选择图片文件夹')
      return
    }

    setSubmitting(true)
    setProgressTotal(imageFiles.length)
    setProgressPhase('scan')

    try {
      const formData = new FormData()
      formData.append('dictionaryId', targetDictId)
      imageFiles.forEach((file) => formData.append('images', file, file.name))

      const result = await aiImportImages(formData, handleProgress)
      if (!result.ok) {
        setError(result.error ?? '导入失败')
        return
      }

      await Promise.all([reloadBuiltinWords(), reloadDictionaryState()])
      setSuccess(result.message ?? '导入成功')
      setPreview(result.rows?.slice(0, 8) ?? [])
      setFailures(result.errors ?? [])
      setProgressOk(result.aiSuccess ?? progressOk)
      setProgressFail(result.aiFailed ?? progressFail)
      setProgressSkip(result.aiSkipped ?? progressSkip)
      setProgressPhase('done')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page ai-enrich-page">
      <header className="ai-enrich-header">
        <button type="button" className="ai-enrich-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="ai-enrich-title">AI 图片导入</h1>
        <p className="ai-enrich-subtitle">
          只需选择图片文件夹，<strong>文件名即单词</strong>（如 <code>grape.png</code>）。
          系统自动识图、补全例句并写入词库，<strong>无需 Excel</strong>。
        </p>
      </header>

      {canRun === false && (
        <p className="ai-enrich-warn">
          需在 dev / PM2 模式下运行，且项目根目录配置 <code>.env</code>（参考 <code>.env.example</code>）。
        </p>
      )}

      <section className="ai-enrich-section">
        <h2>要求</h2>
        <ul className="ai-enrich-steps">
          <li>图片格式：png / jpg / webp，单张 ≤ 2MB（建议 640×400）</li>
          <li>命名：<code>单词.扩展名</code> 或 <code>01-单词.png</code></li>
          <li>词库中<strong>已有</strong>的单词会自动跳过，不重复识图</li>
        </ul>
      </section>

      <form className="ai-enrich-form" onSubmit={(e) => void handleSubmit(e)}>
        <section className="ai-enrich-block">
          <h2>1. 选择图片文件夹</h2>
          <label className="ai-enrich-file">
            <span>选择文件夹</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => handleImagesChange(e.target.files)}
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            />
          </label>
          {imageFiles.length > 0 && (
            <p className="ai-enrich-meta">已选 {imageFiles.length} 张图片</p>
          )}
        </section>

        <section className="ai-enrich-block">
          <h2>2. 导入到词书</h2>
          <label className="ai-enrich-field">
            <span>目标词书</span>
            <select value={targetDictId} onChange={(e) => setTargetDictId(e.target.value)}>
              {dictionaries.map((dict) => (
                <option key={dict.id} value={dict.id}>
                  {dict.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        {(submitting || progressPhase === 'done') && progressTotal > 0 && (
          <div className="ai-enrich-progress-wrap" aria-live="polite">
            <div className="ai-enrich-progress-head">
              <span>{progressLabel}</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              className="ai-enrich-progress-bar"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="ai-enrich-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="ai-enrich-progress-stats">
              成功 {progressOk} · 跳过 {progressSkip} · 失败 {progressFail} · 共 {progressTotal} 张
            </p>
          </div>
        )}

        {error && <p className="ai-enrich-error">{error}</p>}
        {success && <p className="ai-enrich-success">{success}</p>}

        {preview.length > 0 && (
          <ul className="ai-enrich-preview">
            {preview.map((row) => (
              <li key={row.word}>
                <strong>{row.word}</strong>
                <span>{row.definition}</span>
                <span>{row.example_en}</span>
              </li>
            ))}
          </ul>
        )}

        {failures.length > 0 && (
          <ul className="ai-enrich-failures">
            {failures.map((item) => (
              <li key={`${item.word}-${item.error}`}>
                {item.word}：{item.error}
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          className="ai-enrich-submit"
          disabled={submitting || canRun === false || imageFiles.length === 0}
        >
          {submitting ? '导入进行中…' : '开始 AI 导入'}
        </button>
      </form>
    </div>
  )
}
