import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDictionaries } from '../context/DictionaryContext'
import { useStudy } from '../context/StudyContext'
import { useWordBank } from '../context/WordBankContext'
import { isLocalDataApiAvailable, syncSentenceAudio } from '../utils/localData'
import { formatDisplayDate } from '../utils/studyRecords'
import './ProfilePage.css'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { overview, todaySummary, recentDays, hasCheckedInToday, checkInToday, checkInStreak } = useStudy()
  const { activeDictionary } = useDictionaries()
  const { getWordById, reloadCustomWords } = useWordBank()
  const navigate = useNavigate()

  const [canSyncAudio, setCanSyncAudio] = useState<boolean | null>(null)
  const [syncingAudio, setSyncingAudio] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    void isLocalDataApiAvailable().then(setCanSyncAudio)
  }, [])

  const todayWords = useMemo(
    () =>
      todaySummary.words.map((item) => ({
        ...item,
        word: getWordById(item.wordId),
      })),
    [todaySummary.words, getWordById],
  )

  const maxRecentCount = Math.max(...recentDays.map((day) => day.totalCount), 1)

  const handleSyncSentenceAudio = async (force = false) => {
    setSyncError('')
    setSyncMessage('')
    setSyncingAudio(true)

    try {
      const result = await syncSentenceAudio({ force })
      if (!result.ok) {
        setSyncError(result.error ?? '同步失败')
        return
      }

      if (result.customWordsUpdated) {
        await reloadCustomWords()
      }

      setSyncMessage(result.message ?? '同步完成')
    } finally {
      setSyncingAudio(false)
    }
  }

  return (
    <div className="page profile-page">
      <header className="profile-header">
        <h1 className="profile-title">我的</h1>
        <p className="profile-subtitle">学习记录与统计</p>
      </header>

      <section className="profile-section">
        <h2 className="section-title">打卡与分享</h2>
        <div className="checkin-panel">
          <p className="checkin-panel-text">
            {hasCheckedInToday
              ? `已完成今日打卡，连续 ${checkInStreak} 天。分享请在本页操作。`
              : overview.todayTotal > 0
                ? `今日已学习 ${overview.todayWordCount} 个单词，学完后可在此打卡分享`
                : '今天还没有学习记录，先去「学习」页背单词吧'}
          </p>
          {!hasCheckedInToday ? (
            <button
              type="button"
              className="checkin-panel-btn"
              disabled={overview.todayTotal === 0}
              onClick={() => {
                const success = checkInToday({ dictionaryName: activeDictionary.name })
                if (success) navigate('/share')
              }}
            >
              完成今日打卡
            </button>
          ) : (
            <div className="checkin-panel-actions">
              <button type="button" className="checkin-panel-btn" onClick={() => navigate('/share')}>
                查看分享卡片
              </button>
              <button type="button" className="checkin-panel-btn checkin-panel-btn--secondary" onClick={() => navigate('/share')}>
                分享到微信
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="profile-section">
        <h2 className="section-title">词库维护</h2>
        <div className="sync-audio-panel">
          <p className="sync-audio-text">
            {canSyncAudio === null
              ? '正在检测本地服务…'
              : canSyncAudio
                ? '为缺失的例句生成英式离线发音，并写入电脑上的 public/dictionary/audio/sentences/（等同 npm run dict:sync-audio -- --sentences-only）'
                : '当前为纯静态访问，无法从手机写入电脑文件。请用 npm run dev 启动，手机与电脑连同一 WiFi 后访问 Network 地址。'}
          </p>
          <div className="sync-audio-actions">
            <button
              type="button"
              className="sync-audio-btn"
              disabled={!canSyncAudio || syncingAudio}
              onClick={() => void handleSyncSentenceAudio(false)}
            >
              {syncingAudio ? '同步中…' : '同步例句离线发音'}
            </button>
            {canSyncAudio && (
              <button
                type="button"
                className="sync-audio-btn sync-audio-btn--secondary"
                disabled={syncingAudio}
                onClick={() => void handleSyncSentenceAudio(true)}
              >
                强制全部重新生成
              </button>
            )}
          </div>
          {syncMessage && <p className="sync-audio-success">{syncMessage}</p>}
          {syncError && <p className="sync-audio-error">{syncError}</p>}
        </div>
      </section>

      <section className="profile-section">
        <h2 className="section-title">今日概览</h2>
        <div className="stats-grid">
          <StatCard label="学习次数" value={overview.todayTotal} />
          <StatCard label="学习单词" value={overview.todayWordCount} />
          <StatCard label="累计天数" value={overview.totalDays} />
          <StatCard label="累计次数" value={overview.totalSessions} />
        </div>
      </section>

      <section className="profile-section">
        <h2 className="section-title">今日单词明细</h2>
        {todayWords.length > 0 ? (
          <ul className="word-stats-list">
            {todayWords.map((item) => (
              <li key={item.wordId}>
                <button
                  type="button"
                  className="word-stats-item"
                  onClick={() => item.word && navigate(`/study/detail/${item.word.id}`)}
                >
                  <div className="word-stats-main">
                    <span className="word-stats-word">{item.word?.word ?? `单词 #${item.wordId}`}</span>
                    <span className="word-stats-definition">{item.word?.definition ?? '—'}</span>
                  </div>
                  <span className="word-stats-count">{item.count} 次</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-empty">今天还没有学习记录，去「学习」页看看吧</p>
        )}
      </section>

      <section className="profile-section">
        <h2 className="section-title">近 7 日统计</h2>
        <div className="recent-chart">
          {[...recentDays].reverse().map((day) => (
            <div key={day.date} className="recent-chart-item">
              <div className="recent-chart-bar-wrap">
                <div
                  className="recent-chart-bar"
                  style={{ height: `${Math.max((day.totalCount / maxRecentCount) * 100, day.totalCount > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span className="recent-chart-count">{day.totalCount}</span>
              <span className="recent-chart-label">{formatDisplayDate(day.date)}</span>
            </div>
          ))}
        </div>
        <ul className="recent-summary-list">
          {recentDays.map((day) => (
            <li key={day.date} className="recent-summary-item">
              <span>{formatDisplayDate(day.date)}</span>
              <span>
                {day.wordCount} 个单词 · {day.totalCount} 次
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="profile-section">
        <h2 className="section-title">累计统计</h2>
        <div className="total-summary">
          <div className="total-summary-row">
            <span>累计学习单词</span>
            <strong>{overview.totalWordsLearned} 个</strong>
          </div>
          <div className="total-summary-row">
            <span>累计学习次数</span>
            <strong>{overview.totalSessions} 次</strong>
          </div>
          <div className="total-summary-row">
            <span>累计学习天数</span>
            <strong>{overview.totalDays} 天</strong>
          </div>
        </div>
      </section>
    </div>
  )
}
