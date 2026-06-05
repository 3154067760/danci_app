import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import './DictionaryDetailPage.css'

export default function DictionaryDetailPage() {
  const { dictId } = useParams()
  const navigate = useNavigate()
  const {
    dictionaries,
    activeDictionary,
    setActiveDictionary,
    deleteDictionary,
    removeWordFromDictionary,
    getDictionaryWords,
  } = useDictionaries()

  const dictionary = dictionaries.find((item) => item.id === dictId)
  const words = useMemo(() => (dictId ? getDictionaryWords(dictId) : []), [dictId, getDictionaryWords])
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!dictionary) {
    return (
      <div className="page dictionary-detail-page">
        <p className="dict-empty">词书不存在</p>
        <button type="button" className="dict-primary-btn" onClick={() => navigate('/dictionaries')}>
          返回词书列表
        </button>
      </div>
    )
  }

  const isActive = dictionary.id === activeDictionary.id

  const handleStudy = () => {
    setActiveDictionary(dictionary.id)
    if (words.length > 0) {
      navigate(`/study/detail/${words[0].id}`)
    }
  }

  const handleDelete = () => {
    if (dictionary.isBuiltin) return
    deleteDictionary(dictionary.id)
    navigate('/dictionaries')
  }

  return (
    <div className="page dictionary-detail-page">
      <header className="dict-detail-header">
        <button type="button" className="dict-back-btn" onClick={() => navigate('/dictionaries')}>
          ← 返回
        </button>
        <div className="dict-detail-title-wrap">
          <h1 className="dict-detail-title">{dictionary.name}</h1>
          <p className="dict-detail-meta">{words.length} 个单词 · {isActive ? '当前学习' : '未启用'}</p>
        </div>
      </header>

      <div className="dict-detail-actions">
        <button type="button" className="dict-primary-btn" onClick={handleStudy} disabled={words.length === 0}>
          开始学习
        </button>
        <button type="button" className="dict-secondary-btn" onClick={() => navigate(`/dictionaries/${dictionary.id}/pick`)}>
          从词库选词
        </button>
        <button
          type="button"
          className="dict-secondary-btn"
          onClick={() => navigate(`/words/add?dictId=${dictionary.id}`)}
        >
          手动添加单词
        </button>
        {!isActive && (
          <button type="button" className="dict-secondary-btn" onClick={() => setActiveDictionary(dictionary.id)}>
            设为当前词书
          </button>
        )}
      </div>

      <section className="dict-section">
        <h2 className="dict-section-title">词书单词</h2>
        {words.length > 0 ? (
          <ul className="dict-word-list">
            {words.map((word) => (
              <li key={word.id} className="dict-word-item">
                <button
                  type="button"
                  className="dict-word-main"
                  onClick={() => navigate(`/study/detail/${word.id}`)}
                >
                  <span className="dict-word-text">{word.word}</span>
                  <span className="dict-word-definition">{word.definition}</span>
                </button>
                <button
                  type="button"
                  className="dict-word-remove"
                  aria-label={`从词书移除 ${word.word}`}
                  onClick={() => removeWordFromDictionary(dictionary.id, word.id)}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dict-empty">词书还是空的，点击「从词库选词」添加单词</p>
        )}
      </section>

      {!dictionary.isBuiltin && (
        <section className="dict-section dict-danger-section">
          {!confirmDelete ? (
            <button type="button" className="dict-danger-btn" onClick={() => setConfirmDelete(true)}>
              删除词书
            </button>
          ) : (
            <div className="dict-delete-confirm">
              <p>确定删除「{dictionary.name}」吗？</p>
              <div className="dict-delete-actions">
                <button type="button" className="dict-secondary-btn" onClick={() => setConfirmDelete(false)}>
                  取消
                </button>
                <button type="button" className="dict-danger-btn" onClick={handleDelete}>
                  确认删除
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
