import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { useTheme } from '../context/ThemeContext'
import SearchPanel from './SearchPanel'
import './Header.css'

interface HeaderProps {
  showBack?: boolean
  onBack?: () => void
  wordId?: string
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="header-icon" aria-hidden>{children}</span>
}

export default function Header({ showBack = true, onBack, wordId }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [searchOpen, setSearchOpen] = useState(false)

  const favorited = wordId ? isFavorite(wordId) : false

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  const handleFavorite = () => {
    if (wordId) toggleFavorite(wordId)
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          {showBack && (
            <button type="button" className="header-btn" aria-label="返回" onClick={handleBack}>
              <Icon>←</Icon>
            </button>
          )}
        </div>
        <div className="header-center">
          <button type="button" className="header-btn" aria-label="AI 助手">
            <Icon>✦</Icon>
          </button>
        </div>
        <div className="header-right">
          <button type="button" className="header-btn" aria-label="搜索" onClick={() => setSearchOpen(true)}>
            <Icon>⌕</Icon>
          </button>
          <button
            type="button"
            className="header-btn header-btn--theme"
            aria-label={theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'}
            onClick={toggleTheme}
          >
            <Icon>{theme === 'dark' ? '☀' : '☾'}</Icon>
          </button>
          <button
            type="button"
            className={`header-btn ${favorited ? 'header-btn--favorite' : ''}`}
            aria-label={favorited ? '取消收藏' : '收藏'}
            aria-pressed={favorited}
            disabled={!wordId}
            onClick={handleFavorite}
          >
            <Icon>{favorited ? '★' : '☆'}</Icon>
          </button>
        </div>
      </header>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
    </>
  )
}
