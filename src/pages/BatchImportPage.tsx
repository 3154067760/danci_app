import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useWordBank } from '../context/WordBankContext'
import { batchImportWords, isLocalDataApiAvailable } from '../utils/localData'
import { parseExcelFile, sortImageFiles, type ExcelWordRow } from '../utils/parseExcelWords'
import './BatchImportPage.css'

export default function BatchImportPage() {
  const navigate = useNavigate()
  const { dictionaries, activeDictionary, reloadDictionaryState } = useDictionaries()
  const { reloadBuiltinWords } = useWordBank()

  const [canImport, setCanImport] = useState<boolean | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewRows, setPreviewRows] = useState<ExcelWordRow[]>([])
  const [targetDictId, setTargetDictId] = useState(activeDictionary.id)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void isLocalDataApiAvailable().then(setCanImport)
  }, [])

  useEffect(() => {
    setTargetDictId(activeDictionary.id)
  }, [activeDictionary.id])

  const imageCount = imageFiles.length
  const rowCount = previewRows.length
  const countMismatch = imageCount > 0 && imageCount !== rowCount

  const previewItems = useMemo(
    () =>
      previewRows.slice(0, 8).map((row, index) => ({
        row,
        imageName: imageFiles[index]?.name ?? '—',
      })),
    [previewRows, imageFiles],
  )

  const handleExcelChange = async (file: File | null) => {
    setExcelFile(file)
    setError('')
    setSuccess('')
    if (!file) {
      setPreviewRows([])
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      setPreviewRows(parseExcelFile(buffer))
    } catch (err) {
      setPreviewRows([])
      setError(err instanceof Error ? err.message : 'Excel 解析失败')
    }
  }

  const handleImagesChange = (files: FileList | null) => {
    setError('')
    setSuccess('')
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

    if (!excelFile) {
      setError('请选择 Excel 文件')
      return
    }
    if (previewRows.length === 0) {
      setError('Excel 中没有有效单词')
      return
    }
    if (imageCount === 0) {
      setError('请选择图片文件夹')
      return
    }
    if (countMismatch) {
      setError(`图片数量（${imageCount}）与单词行数（${rowCount}）不一致`)
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('excel', excelFile)
      formData.append('dictionaryId', targetDictId)
      imageFiles.forEach((file) => formData.append('images', file, file.name))

      const result = await batchImportWords(formData)
      if (!result.ok) {
        setError(result.error ?? '导入失败')
        return
      }

      await Promise.all([reloadBuiltinWords(), reloadDictionaryState()])
      setSuccess(result.message ?? '导入成功')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page batch-import-page">
      <header className="batch-import-header">
        <button type="button" className="batch-import-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="batch-import-title">批量导入单词</h1>
        <p className="batch-import-subtitle">
          上传 Excel 与图片文件夹，按行顺序一一对应（第 1 行单词对应第 1 张图）
        </p>
      </header>

      {canImport === false && (
        <p className="batch-import-warn">
          当前环境无法写入服务器，请使用 PM2 运行的服务（npm run start）后再导入。
        </p>
      )}

      <form className="batch-import-form" onSubmit={(e) => void handleSubmit(e)}>
        <section className="batch-import-section">
          <h2>1. Excel 表格</h2>
          <p className="batch-import-hint">
            表头与 <code>import.csv</code> 一致（<strong>不含 image_file</strong>，图片由文件夹按序匹配）：
          </p>
          <table className="batch-import-table">
            <thead>
              <tr>
                <th>列</th>
                <th>必填</th>
                <th>表头（中 / 英）</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>单词</td><td>是</td><td>单词 / word</td></tr>
              <tr><td>音标</td><td>建议</td><td>音标 / phonetic</td></tr>
              <tr><td>词性</td><td>建议</td><td>词性 / partOfSpeech</td></tr>
              <tr><td>释义</td><td>是</td><td>释义 / definition</td></tr>
              <tr><td>英文例句</td><td>是</td><td>英文例句 / example_en</td></tr>
              <tr><td>例句翻译</td><td>是</td><td>例句翻译 / example_zh</td></tr>
              <tr><td>图片说明</td><td>否</td><td>图片说明 / image_caption</td></tr>
              <tr><td>标签</td><td>否</td><td>标签 / tags</td></tr>
              <tr><td>难度</td><td>否</td><td>难度 / level</td></tr>
            </tbody>
          </table>
          <p className="batch-import-hint batch-import-hint--note">
            释义是中文词义（如「葡萄」），例句翻译是例句的中文（如「这些葡萄又甜又多汁。」），请勿混用。
          </p>
          <label className="batch-import-file">
            <span>选择 Excel 文件</span>
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => void handleExcelChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {excelFile && <p className="batch-import-meta">已选：{excelFile.name}（{rowCount} 个单词）</p>}
        </section>

        <section className="batch-import-section">
          <h2>2. 图片文件夹</h2>
          <p className="batch-import-hint">
            选择整个文件夹，图片按文件名排序后与 Excel 行顺序对应。导入后直接保存到
            <strong> public/dictionary/images/</strong>（词库唯一存储，不保留副本）。
          </p>
          <label className="batch-import-file">
            <span>选择图片文件夹</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              multiple
              onChange={(e) => handleImagesChange(e.target.files)}
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            />
          </label>
          {imageCount > 0 && (
            <p className={`batch-import-meta ${countMismatch ? 'batch-import-meta--error' : ''}`}>
              已选 {imageCount} 张图片
              {countMismatch ? `（与 ${rowCount} 个单词不一致）` : ''}
            </p>
          )}
        </section>

        <section className="batch-import-section">
          <h2>3. 导入到词书</h2>
          <label className="batch-import-field">
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

        {previewItems.length > 0 && (
          <section className="batch-import-section">
            <h2>预览（前 {previewItems.length} 条）</h2>
            <ul className="batch-import-preview">
              {previewItems.map((item, index) => (
                <li key={`${item.row.word}-${index}`}>
                  <strong>{item.row.word}</strong>
                  <span>{item.row.phonetic || '—'}</span>
                  <span className="batch-import-preview-def">{item.row.definition}</span>
                  <span className="batch-import-preview-image">{item.imageName}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && <p className="batch-import-error">{error}</p>}
        {success && <p className="batch-import-success">{success}</p>}

        <button
          type="submit"
          className="batch-import-submit"
          disabled={submitting || canImport === false || countMismatch}
        >
          {submitting ? '导入中…' : '开始导入'}
        </button>
      </form>
    </div>
  )
}
