import { forwardRef } from 'react'
import type { ShareLibraryImage } from '../data/shareImageLibrary'
import './SharePoster.css'

export interface SharePosterData {
  streak: number
  totalWordsLearned: number
  todayWordCount: number
  todayTotal: number
  dictionaryName: string
  wordLabels: string[]
  dateLabel: string
  background: ShareLibraryImage
}

interface SharePosterProps {
  data: SharePosterData
}

const SharePoster = forwardRef<HTMLDivElement, SharePosterProps>(function SharePoster({ data }, ref) {
  const wordsText = data.wordLabels.length > 0 ? data.wordLabels.join(' · ') : '继续加油，明天见'
  const studyLine = `今日学习 ${data.todayWordCount} 个单词，共 ${data.todayTotal} 次`

  return (
    <div className="share-poster" ref={ref}>
      <img
        src={data.background.url}
        alt=""
        aria-hidden
        className="share-poster-bg"
        crossOrigin="anonymous"
      />
      <div className="share-poster-overlay" aria-hidden />

      <div className="share-poster-inner">
        <header className="share-poster-header">
          <div className="share-poster-avatar" aria-hidden>
            📚
          </div>
          <div className="share-poster-stats">
            <p>
              坚持打卡 <strong>{data.streak}</strong> 天 · 学习单词 <strong>{data.totalWordsLearned}</strong> 个
            </p>
            <p className="share-poster-date">
              单词学习打卡 · {data.dateLabel}
            </p>
          </div>
        </header>

        <div className="share-poster-body">
          <div className="share-poster-sticky">
            <p className="share-poster-sticky-title">{data.background.quote}</p>
            <p className="share-poster-sticky-en">{data.background.quoteEn}</p>
            <div className="share-poster-sticky-divider" />
            <p className="share-poster-sticky-study">{studyLine}</p>
            <p className="share-poster-sticky-words">{wordsText}</p>
            <p className="share-poster-sticky-dict">词书：{data.dictionaryName}</p>
          </div>
        </div>

        <footer className="share-poster-footer">
          <div className="share-poster-brand">
            <strong>单词学习 App</strong>
            <span>学英语背单词，坚持打卡每一天 →</span>
          </div>
          <div className="share-poster-qr" aria-hidden>
            <svg viewBox="0 0 80 80" className="share-poster-qr-svg">
              <rect width="80" height="80" fill="#fff" />
              <rect x="8" y="8" width="20" height="20" fill="#111" />
              <rect x="52" y="8" width="20" height="20" fill="#111" />
              <rect x="8" y="52" width="20" height="20" fill="#111" />
              <rect x="36" y="36" width="8" height="8" fill="#111" />
              <rect x="52" y="52" width="8" height="8" fill="#111" />
              <rect x="64" y="52" width="8" height="8" fill="#111" />
              <rect x="52" y="64" width="8" height="8" fill="#111" />
            </svg>
            <span>扫码学习</span>
          </div>
        </footer>
      </div>
    </div>
  )
})

export default SharePoster
