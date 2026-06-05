import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SharePoster, { type SharePosterData } from '../components/SharePoster'
import { useDictionaries } from '../context/DictionaryContext'
import { useStudy } from '../context/StudyContext'
import { useWordBank } from '../context/WordBankContext'
import { pickRandomShareImage, shareImageLibrary } from '../data/shareImageLibrary'
import { formatShareDate } from '../utils/checkIn'
import {
  dataUrlToBlob,
  downloadPosterImage,
  generatePosterImage,
  openWeChatApp,
} from '../utils/sharePoster'
import './SharePage.css'

export default function SharePage() {
  const navigate = useNavigate()
  const posterRef = useRef<HTMLDivElement>(null)
  const { activeDictionary, activeWords } = useDictionaries()
  const {
    todayCheckIn,
    todaySummary,
    checkInStreak,
    hasCheckedInToday,
    overview,
    buildTodayShareText,
  } = useStudy()
  const { getWordById } = useWordBank()

  const [background, setBackground] = useState(() => pickRandomShareImage())
  const [posterUrl, setPosterUrl] = useState<string | null>(null)

  const handleShuffleBackground = () => {
    setBackground(pickRandomShareImage())
    setPosterUrl(null)
  }
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const [wechatTip, setWechatTip] = useState(false)

  const todayWords = useMemo(
    () =>
      todaySummary.words
        .map((item) => getWordById(item.wordId))
        .filter((word): word is NonNullable<typeof word> => Boolean(word)),
    [todaySummary.words, getWordById],
  )

  const record = todayCheckIn ?? {
    date: todaySummary.date,
    totalCount: todaySummary.totalCount,
    wordCount: todaySummary.wordCount,
    dictionaryName: activeDictionary.name,
    checkedInAt: Date.now(),
  }

  const shareText = buildTodayShareText(todayWords.map((word) => word.word))
  const studyPath = activeWords[0] ? `/study/detail/${activeWords[0].id}` : '/study/detail/1'

  const posterData: SharePosterData = {
    streak: checkInStreak,
    totalWordsLearned: overview.totalWordsLearned,
    todayWordCount: record.wordCount,
    todayTotal: record.totalCount,
    dictionaryName: record.dictionaryName,
    wordLabels: todayWords.map((word) => word.word),
    dateLabel: formatShareDate(record.date),
    background,
  }

  const ensurePoster = async () => {
    if (posterUrl) return posterUrl
    if (!posterRef.current) throw new Error('poster not ready')

    setGenerating(true)
    try {
      const url = await generatePosterImage(posterRef.current)
      setPosterUrl(url)
      return url
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveImage = async () => {
    try {
      const url = await ensurePoster()
      await downloadPosterImage(url, `单词打卡-${record.date}.png`)
      setShareError('')
    } catch {
      setShareError('图片生成失败，请重试')
    }
  }

  const handleShareWeChat = async () => {
    try {
      const url = await ensurePoster()
      await downloadPosterImage(url, `单词打卡-${record.date}.png`)

      const opened = openWeChatApp()
      setWechatTip(true)
      setShareError('')

      if (!opened) {
        setShareError('图片已保存，请在微信中选择图片发送给好友')
      }
    } catch {
      setShareError('分享图片生成失败，请重试')
    }
  }

  const handleNativeShare = async () => {
    try {
      const url = await ensurePoster()

      if (navigator.share && navigator.canShare) {
        const blob = await dataUrlToBlob(url)
        const file = new File([blob], `单词打卡-${record.date}.png`, { type: 'image/png' })
        const payload = { title: '今日单词打卡', text: shareText, files: [file] }

        if (navigator.canShare(payload)) {
          await navigator.share(payload)
          return
        }
      }

      await handleShareWeChat()
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setShareError('分享失败，请尝试保存图片后手动分享')
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setShareError('')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError('复制失败，请手动长按复制')
    }
  }

  if (!hasCheckedInToday && todaySummary.totalCount === 0) {
    return (
      <div className="share-page share-page--empty">
        <p>今天还没有学习记录，先去学习再来打卡吧</p>
        <button type="button" className="share-action-btn" onClick={() => navigate(studyPath)}>
          去学习
        </button>
      </div>
    )
  }

  return (
    <div className="share-page">
      <div className="share-page-top">
        <button type="button" className="share-close-btn" onClick={() => navigate(studyPath)}>
          ← 返回
        </button>
      </div>

      <p className="share-page-tip">
        分享图已从 {shareImageLibrary.length} 张背景中随机选取，学习记录已叠加在图片上
        <button type="button" className="share-shuffle-btn" onClick={handleShuffleBackground}>
          换一张
        </button>
      </p>

      <div className="share-poster-preview">
        <SharePoster ref={posterRef} data={posterData} />
      </div>

      {posterUrl && (
        <div className="share-generated-preview">
          <img src={posterUrl} alt="生成的分享图片" className="share-generated-image" />
        </div>
      )}

      <div className="share-actions">
        <button
          type="button"
          className="share-action-btn share-action-btn--wechat"
          disabled={generating}
          onClick={handleShareWeChat}
        >
          {generating ? '生成中…' : '分享到微信'}
        </button>
        <button
          type="button"
          className="share-action-btn share-action-btn--primary"
          disabled={generating}
          onClick={handleNativeShare}
        >
          生成并分享图片
        </button>
        <button type="button" className="share-action-btn" disabled={generating} onClick={handleSaveImage}>
          保存图片
        </button>
        <button type="button" className="share-action-btn" onClick={handleCopy}>
          {copied ? '已复制文案' : '复制文案'}
        </button>
      </div>

      {wechatTip && (
        <div className="share-wechat-tip">
          <p>图片已保存到相册/下载文件夹</p>
          <p>打开微信 → 选择好友或朋友圈 → 发送图片即可</p>
        </div>
      )}

      {(copied || shareError) && (
        <p className={`share-feedback ${shareError ? 'share-feedback--error' : ''}`}>
          {shareError || '分享文案已复制到剪贴板'}
        </p>
      )}
    </div>
  )
}
