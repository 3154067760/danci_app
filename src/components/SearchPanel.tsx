import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useFavorites } from '../context/FavoritesContext'
import { searchWords } from '../utils/searchWords'
import './SearchPanel.css'

type SearchFilter = 'all' | 'favorites'

interface SearchPanelProps {
  onClose: () => void
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const navigate = useNavigate()
  const { activeWords } = useDictionaries()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')

  const results = useMemo(() => {
    const matched = searchWords(query, activeWords)
    if (filter === 'favorites') {
      return matched.filter((item) => favorites.includes(item.id))
    }
    return matched
  }, [query, filter, favorites, activeWords])

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleSelect = (id: string) => {
    navigate(`/study/detail/${id}`)
    onClose()
  }

  const emptyMessage =
    filter === 'favorites' && favorites.length === 0
      ? '还没有收藏的单词'
      : '未找到相关单词'

  return (
    <div className="search-panel" role="dialog" aria-modal="true" aria-label="搜索单词">
      <button type="button" className="search-backdrop" aria-label="关闭搜索" onClick={onClose} />

      <div className="search-sheet">
        <div className="search-bar">
          <span className="search-bar-icon" aria-hidden>
            ⌕
          </span>
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="搜索单词或释义"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="清空搜索"
              onClick={() => setQuery('')}
            >
              ×
            </button>
          )}
          <button type="button" className="search-cancel" onClick={onClose}>
            取消
          </button>
        </div>

        <div className="search-filters">
          <button
            type="button"
            className={`search-filter ${filter === 'all' ? 'search-filter--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            type="button"
            className={`search-filter ${filter === 'favorites' ? 'search-filter--active' : ''}`}
            onClick={() => setFilter('favorites')}
          >
            我的收藏{favorites.length > 0 ? ` (${favorites.length})` : ''}
          </button>
        </div>

        <div className="search-results">
          {results.length > 0 ? (
            <ul className="search-list">
              {results.map((item) => {
                const favorited = isFavorite(item.id)
                return (
                  <li key={item.id}>
                    <button type="button" className="search-item" onClick={() => handleSelect(item.id)}>
                      <div className="search-item-top">
                        <div className="search-item-main">
                          <span className="search-item-word">{item.word}</span>
                          <span className="search-item-pos">{item.partOfSpeech}</span>
                        </div>
                        <button
                          type="button"
                          className={`search-favorite-btn ${favorited ? 'search-favorite-btn--active' : ''}`}
                          aria-label={favorited ? '取消收藏' : '收藏'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                        >
                          {favorited ? '★' : '☆'}
                        </button>
                      </div>
                      <span className="search-item-phonetic">{item.phonetic}</span>
                      <p className="search-item-definition">{item.definition}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="search-empty">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
