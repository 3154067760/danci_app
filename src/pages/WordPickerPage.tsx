import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useWordBank } from '../context/WordBankContext'
import './WordPickerPage.css'

export default function WordPickerPage() {
  const { dictId } = useParams()
  const navigate = useNavigate()
  const { wordBank } = useWordBank()
  const { dictionaries, addWordsToDictionary, isWordInDictionary } = useDictionaries()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const dictionary = dictionaries.find((item) => item.id === dictId)

  const filteredWords = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return wordBank
    return wordBank.filter(
      (word) =>
        word.word.toLowerCase().includes(trimmed) ||
        word.definition.includes(query.trim()) ||
        word.example.toLowerCase().includes(trimmed),
    )
  }, [query, wordBank])

  if (!dictionary) {
    return (
      <div className="page word-picker-page">
        <p className="picker-empty">词书不存在</p>
      </div>
    )
  }

  const toggleWord = (wordId: string) => {
    if (isWordInDictionary(dictionary.id, wordId)) return
    setSelected((prev) => (prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]))
  }

  const handleAdd = () => {
    if (selected.length === 0) return
    addWordsToDictionary(dictionary.id, selected)
    navigate(`/dictionaries/${dictionary.id}`)
  }

  return (
    <div className="page word-picker-page">
      <header className="picker-header">
        <button type="button" className="picker-back-btn" onClick={() => navigate(`/dictionaries/${dictionary.id}`)}>
          ← 返回
        </button>
        <div>
          <h1 className="picker-title">从词库选词</h1>
          <p className="picker-subtitle">{dictionary.name}</p>
        </div>
      </header>

      <div className="picker-search-wrap">
        <input
          className="picker-search"
          placeholder="搜索词库中的单词或释义"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="picker-add-word-btn"
          onClick={() => navigate(`/words/add?dictId=${dictionary.id}`)}
        >
          + 添加
        </button>
      </div>

      <p className="picker-tip">已选 {selected.length} 个 · 已在词书中的单词不可重复添加</p>

      <ul className="picker-list">
        {filteredWords.map((word) => {
          const alreadyInDict = isWordInDictionary(dictionary.id, word.id)
          const checked = selected.includes(word.id)
          return (
            <li key={word.id}>
              <button
                type="button"
                className={`picker-item ${alreadyInDict ? 'picker-item--disabled' : ''} ${checked ? 'picker-item--selected' : ''}`}
                onClick={() => toggleWord(word.id)}
                disabled={alreadyInDict}
              >
                <span className={`picker-check ${checked ? 'picker-check--on' : ''}`} aria-hidden>
                  {alreadyInDict ? '✓' : checked ? '✓' : ''}
                </span>
                <div className="picker-item-main">
                  <div className="picker-item-top">
                    <span className="picker-word">{word.word}</span>
                    <span className="picker-pos">{word.partOfSpeech}</span>
                  </div>
                  <span className="picker-definition">{word.definition}</span>
                </div>
                {alreadyInDict && <span className="picker-added-tag">已添加</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <footer className="picker-footer">
        <button type="button" className="picker-add-btn" disabled={selected.length === 0} onClick={handleAdd}>
          添加 {selected.length > 0 ? `${selected.length} 个单词` : '到词书'}
        </button>
      </footer>
    </div>
  )
}
