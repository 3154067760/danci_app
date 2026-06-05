import { StrictMode } from 'react'
import { LocalDataProvider } from './context/LocalDataProvider'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DictionaryProvider } from './context/DictionaryContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { StudyProvider } from './context/StudyContext'
import { ThemeProvider } from './context/ThemeContext'
import { WordBankProvider } from './context/WordBankContext'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocalDataProvider>
      <ThemeProvider>
        <FavoritesProvider>
          <WordBankProvider>
            <DictionaryProvider>
              <StudyProvider>
                <App />
              </StudyProvider>
            </DictionaryProvider>
          </WordBankProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </LocalDataProvider>
  </StrictMode>,
)
