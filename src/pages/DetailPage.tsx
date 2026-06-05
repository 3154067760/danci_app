import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import SpeakButton from '../components/SpeakButton'
import { useDictionaries } from '../context/DictionaryContext'
import { useStudy } from '../context/StudyContext'
import './DetailPage.css'

function highlightWord(sentence: string, word: string) {
  const regex = new RegExp(`(${word})`, 'gi')
  const parts = sentence.split(regex)
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <mark key={i} className="word-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeDictionary, activeWords, removeWordFromDictionary } = useDictionaries()
  const { recordStudy, getWordCountToday } = useStudy()
  const [showExample, setShowExample] = useState(false)
  const lastRecordedRef = useRef<{ id: string; at: number } | null>(null)

  useEffect(() => {
    setShowExample(false)
  }, [id])

  useEffect(() => {
    if (!id) return

    const now = Date.now()
    const last = lastRecordedRef.current
    if (last?.id === id && now - last.at < 800) return

    lastRecordedRef.current = { id, at: now }
    recordStudy(id)
  }, [id, recordStudy])

  const wordIndex = activeWords.findIndex((w) => w.id === id)
  const word = activeWords[wordIndex >= 0 ? wordIndex : 0]
  const todayCount = word ? getWordCountToday(word.id) : 0
  const wordPosition = wordIndex >= 0 ? wordIndex + 1 : 1
  const totalWords = activeWords.length

  const handleNext = () => {
    if (activeWords.length === 0) return
    const nextIndex = (wordIndex + 1) % activeWords.length
    navigate(`/study/detail/${activeWords[nextIndex].id}`)
  }

  const handleMarkTooEasy = () => {
    if (!word) return

    let nextId: string | null = null
    if (activeWords.length > 1) {
      const nextIndex = (wordIndex + 1) % activeWords.length
      nextId = activeWords[nextIndex].id
      if (nextId === word.id) {
        nextId = activeWords[(wordIndex + 2) % activeWords.length]?.id ?? null
      }
    }

    removeWordFromDictionary(activeDictionary.id, word.id)

    if (nextId) {
      navigate(`/study/detail/${nextId}`, { replace: true })
    }
  }

  if (activeWords.length === 0) {
    return (
      <div className="page detail-page">
        <Header showBack={false} />
        <div className="study-empty">
          <h2>当前词书还没有单词</h2>
          <p>「{activeDictionary.name}」是空的，去词库选词后再开始学习吧</p>
          <button type="button" className="next-btn" onClick={() => navigate('/dictionaries')}>
            去词书选词
          </button>
        </div>
      </div>
    )
  }

  if (!word) {
    navigate(`/study/detail/${activeWords[0].id}`, { replace: true })
    return null
  }

  return (
    <div className="page detail-page">
      <Header showBack={false} wordId={word.id} />

      <div className="page-content detail-layout">
        <div className="detail-scroll">
          <section className="detail-hero">
            <div className="detail-hero-top">
              <div className="detail-word-block">
                <div className="detail-word-row">
                  <h1 className="word-title">{word.word}</h1>
                  <SpeakButton text={word.word} audioUrl={word.wordAudioUrl} />
                </div>
                <div className="detail-meta">
                  <span className="phonetic">{word.phonetic}</span>
                  <div className="detail-tags">
                    <span
                      className="word-progress-tag"
                      aria-label={`词书第 ${wordPosition} 个，共 ${totalWords} 个`}
                    >
                      {wordPosition}/{totalWords}
                    </span>
                    <span className="active-dict-tag">{activeDictionary.name}</span>
                    {todayCount > 0 && <span className="today-study-tag">今日已学 {todayCount} 次</span>}
                  </div>
                </div>
              </div>

              <div className="detail-quick-actions">
                <button
                  type="button"
                  className="quick-action quick-action--easy"
                  onClick={handleMarkTooEasy}
                  aria-label={`将「${word.word}」从「${activeDictionary.name}」移除`}
                >
                  <span aria-hidden>🗑</span>
                  太简单
                </button>
              </div>
            </div>
          </section>

          <section className="detail-text">
            <div className="definition-block">
              <span className="pos">{word.partOfSpeech}</span>
              <p className="definition">{word.definition}</p>
            </div>

            <div className="example-section">
              <div className="example-header">
                <span className="example-label">【例句】</span>
                <SpeakButton text={word.example} audioUrl={word.sentenceAudioUrl} size="sm" label="播放例句" />
              </div>

              {showExample ? (
                <div className="example-block">
                  <p className="example-sentence">{highlightWord(word.example, word.word)}</p>
                  <p className="example-translation">{word.exampleTranslation}</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="example-reveal"
                  onClick={() => setShowExample(true)}
                  aria-label="点击查看例句"
                >
                  点击显示例句
                </button>
              )}
            </div>
          </section>

          {word.imageUrl ? (
            <section className="visual-card">
              <div className="visual-card-inner">
                <h3 className="visual-caption">{word.imageCaption}</h3>
                <div className="visual-image-wrap">
                  <img src={word.imageUrl} alt={word.imageCaption} className="visual-image" />
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="detail-footer">
          <button type="button" className="next-btn" onClick={handleNext}>
            下一个
          </button>
        </footer>
      </div>
    </div>
  )
}
