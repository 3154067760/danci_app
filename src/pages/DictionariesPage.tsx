import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import './DictionariesPage.css'

export default function DictionariesPage() {
  const navigate = useNavigate()
  const { dictionaries, activeDictionary, createDictionary, setActiveDictionary } = useDictionaries()
  const [name, setName] = useState('')

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    const dictionary = createDictionary(name)
    setName('')
    navigate(`/dictionaries/${dictionary.id}`)
  }

  return (
    <div className="page dictionaries-page">
      <header className="dict-page-header">
        <h1 className="dict-page-title">词书</h1>
        <p className="dict-page-subtitle">创建自定义词书，从词库中选词学习</p>
      </header>

      <section className="dict-section">
        <h2 className="dict-section-title">添加单词</h2>
        <div className="dict-add-actions">
          <button type="button" className="dict-secondary-btn dict-add-word-btn" onClick={() => navigate('/words/add')}>
            手动添加单词
          </button>
          <button
            type="button"
            className="dict-secondary-btn dict-add-word-btn"
            onClick={() => navigate('/words/batch-import')}
          >
            批量导入（Excel + 图片）
          </button>
          <button
            type="button"
            className="dict-secondary-btn dict-add-word-btn"
            onClick={() => navigate('/words/ai-enrich')}
          >
            AI 图片导入
          </button>
        </div>
      </section>

      <section className="dict-section">
        <h2 className="dict-section-title">创建词书</h2>
        <form className="create-dict-form" onSubmit={handleCreate}>
          <input
            className="create-dict-input"
            placeholder="输入词书名称，如：四级核心词汇"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />
          <button type="submit" className="create-dict-btn" disabled={!name.trim()}>
            创建
          </button>
        </form>
      </section>

      <section className="dict-section">
        <h2 className="dict-section-title">我的词书</h2>
        <ul className="dict-list">
          {dictionaries.map((dictionary) => {
            const isActive = dictionary.id === activeDictionary.id
            return (
              <li key={dictionary.id}>
                <button
                  type="button"
                  className={`dict-card ${isActive ? 'dict-card--active' : ''}`}
                  onClick={() => navigate(`/dictionaries/${dictionary.id}`)}
                >
                  <div className="dict-card-main">
                    <span className="dict-card-name">{dictionary.name}</span>
                    <span className="dict-card-meta">{dictionary.wordIds.length} 个单词</span>
                  </div>
                  <div className="dict-card-actions">
                    {isActive && <span className="dict-badge">当前学习</span>}
                    {dictionary.isBuiltin && <span className="dict-badge dict-badge--muted">内置</span>}
                  </div>
                </button>
                {!isActive && (
                  <button
                    type="button"
                    className="dict-set-active-btn"
                    onClick={() => setActiveDictionary(dictionary.id)}
                  >
                    设为当前
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
