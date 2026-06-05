import { ENGLISH_LANG, speakText } from '../utils/audio'
import './SpeakButton.css'

interface SpeakButtonProps {
  text: string
  lang?: string
  size?: 'sm' | 'md'
  label?: string
  /** 优先播放的本地离线音频 */
  audioUrl?: string
}

export default function SpeakButton({
  text,
  lang = ENGLISH_LANG,
  size = 'md',
  label = '播放发音',
  audioUrl,
}: SpeakButtonProps) {
  return (
    <button
      type="button"
      className={`speak-btn speak-btn--${size}`}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        speakText(text, lang, { localAudioUrl: audioUrl })
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
    </button>
  )
}
