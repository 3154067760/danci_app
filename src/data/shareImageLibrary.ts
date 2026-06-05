export interface ShareLibraryImage {
  id: string
  /** 图片路径，放在 public/share-images/ 下 */
  url: string
  alt: string
  quote: string
  quoteEn: string
}

/** 励志文案池，与背景图随机组合 */
const shareQuotes: Pick<ShareLibraryImage, 'quote' | 'quoteEn'>[] = [
  { quote: '前程似海，来日方长。', quoteEn: 'The future is vast like the sea.' },
  { quote: '每天进步一点点，坚持就是胜利。', quoteEn: 'A little progress every day adds up.' },
  { quote: '今日所学，皆为明日之基。', quoteEn: "Today's learning builds tomorrow." },
  { quote: '不积跬步，无以至千里。', quoteEn: 'Great things come from small steps.' },
  { quote: '星光不问赶路人，时光不负有心人。', quoteEn: 'Effort never goes unnoticed.' },
  { quote: '书山有路勤为径，学海无涯苦作舟。', quoteEn: 'Diligence is the path to mastery.' },
  { quote: '千里之行，始于足下。', quoteEn: 'A journey of a thousand miles begins with a single step.' },
  { quote: '业精于勤，荒于嬉。', quoteEn: 'Excellence comes from practice.' },
  { quote: '学而不思则罔，思而不学则殆。', quoteEn: 'Learn deeply, think clearly.' },
  { quote: '宝剑锋从磨砺出，梅花香自苦寒来。', quoteEn: 'Growth comes through challenge.' },
  { quote: '欲穷千里目，更上一层楼。', quoteEn: 'Reach higher, see further.' },
  { quote: '少壮不努力，老大徒伤悲。', quoteEn: 'Make today count.' },
  { quote: '锲而不舍，金石可镂。', quoteEn: 'Persistence shapes success.' },
  { quote: '博观而约取，厚积而薄发。', quoteEn: 'Learn widely, apply wisely.' },
  { quote: '路漫漫其修远兮，吾将上下而求索。', quoteEn: 'Keep exploring, keep learning.' },
]

/**
 * 分享图片库（文件名列表）
 * 新增图片：放入 public/share-images/ 并在下方追加文件名即可
 */
const shareImageFiles = [
  'ocean.svg',
  'sunrise.svg',
  'study-desk.svg',
  'mountain.svg',
  'star-night.svg',
  '学习 背景 励志 唯美_18.jpg',
  '学习 背景 励志 唯美_19.jpg',
  '学习 背景 励志 唯美_20.jpg',
  '学习 背景 励志 唯美_21.jpg',
  '学习 背景 励志 唯美_22.jpg',
  '学习 背景 励志 唯美_23.jpg',
  '学习 背景 励志 唯美_24.jpg',
  '学习 背景 励志 唯美_25.jpg',
  '学习 背景 励志 唯美_26.jpg',
  '学习 背景 励志 唯美_27.jpg',
  '学习 背景 励志 唯美_28.jpg',
  '学习 背景 励志 唯美_29.jpg',
  '学习 背景 励志 唯美_30.jpg',
  '学习 背景 励志 唯美_31.jpg',
  '学习 背景 励志 唯美_32.jpg',
  '学习 背景 励志 唯美_33.jpg',
  '学习 背景 励志 唯美_34.jpg',
  '学习 背景 励志 唯美_35.jpg',
  '学习 背景 励志 唯美_36.jpg',
  '学习 背景 励志 唯美_37.jpg',
  '学习 背景 励志 唯美_38.jpg',
  '学习 背景 励志 唯美_39.jpg',
]

function buildShareImageUrl(filename: string) {
  return `/share-images/${encodeURIComponent(filename)}`
}

function filenameToId(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/\s+/g, '-')
}

function buildShareImage(filename: string, quoteIndex?: number): ShareLibraryImage {
  const quote =
    quoteIndex !== undefined
      ? shareQuotes[quoteIndex % shareQuotes.length]
      : shareQuotes[Math.floor(Math.random() * shareQuotes.length)]

  return {
    id: filenameToId(filename),
    url: buildShareImageUrl(filename),
    alt: filename.endsWith('.svg') ? filename.replace('.svg', '') : '学习励志背景',
    ...quote,
  }
}

/** 兼容旧代码的静态列表 */
export const shareImageLibrary: ShareLibraryImage[] = shareImageFiles.map((file, index) =>
  buildShareImage(file, index),
)

export function pickRandomShareImage(): ShareLibraryImage {
  const filename = shareImageFiles[Math.floor(Math.random() * shareImageFiles.length)]
  return buildShareImage(filename)
}

export function getShareImageById(id: string) {
  const filename = shareImageFiles.find((file) => filenameToId(file) === id)
  if (filename) return buildShareImage(filename)
  return shareImageLibrary[0]
}
