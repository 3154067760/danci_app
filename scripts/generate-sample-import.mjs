/**
 * 生成批量导入示例：Excel + 10 张图片
 * 用法: node scripts/generate-sample-import.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import zlib from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'data/dictionary/sample-import')
const imagesDir = path.join(outDir, 'images')

/** 字段与 import.csv 一致（不含 image_file） */
const WORDS = [
  {
    word: 'apple',
    phonetic: "/ˈæpl/",
    partOfSpeech: 'n.',
    definition: '苹果',
    example_en: 'She ate a red apple for lunch.',
    example_zh: '她午餐吃了一个红苹果。',
    image_caption: 'Red Apple',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'banana',
    phonetic: "/bəˈnɑːnə/",
    partOfSpeech: 'n.',
    definition: '香蕉',
    example_en: 'Monkeys love to eat bananas.',
    example_zh: '猴子喜欢吃香蕉。',
    image_caption: 'Yellow Banana',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'orange',
    phonetic: "/ˈɒrɪndʒ/",
    partOfSpeech: 'n.',
    definition: '橙子；橙黄色',
    example_en: 'Fresh orange juice is full of vitamin C.',
    example_zh: '鲜榨橙汁富含维生素 C。',
    image_caption: 'Fresh Orange',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'grape',
    phonetic: "/ɡreɪp/",
    partOfSpeech: 'n.',
    definition: '葡萄',
    example_en: 'These grapes taste sweet and juicy.',
    example_zh: '这些葡萄又甜又多汁。',
    image_caption: 'Sweet Grapes',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'mango',
    phonetic: "/ˈmæŋɡəʊ/",
    partOfSpeech: 'n.',
    definition: '芒果',
    example_en: 'Mango is my favorite tropical fruit.',
    example_zh: '芒果是我最喜欢的热带水果。',
    image_caption: 'Tropical Mango',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'peach',
    phonetic: "/piːtʃ/",
    partOfSpeech: 'n.',
    definition: '桃子',
    example_en: 'The peach tree blooms in early spring.',
    example_zh: '桃树在早春开花。',
    image_caption: 'Peach Blossom',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'lemon',
    phonetic: "/ˈlemən/",
    partOfSpeech: 'n.',
    definition: '柠檬',
    example_en: 'Add a slice of lemon to the tea.',
    example_zh: '往茶里加一片柠檬。',
    image_caption: 'Fresh Lemon',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'cherry',
    phonetic: "/ˈtʃeri/",
    partOfSpeech: 'n.',
    definition: '樱桃',
    example_en: 'Cherry blossoms are beautiful in April.',
    example_zh: '四月的樱花很美。',
    image_caption: 'Cherry Blossom',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'melon',
    phonetic: "/ˈmelən/",
    partOfSpeech: 'n.',
    definition: '甜瓜；瓜',
    example_en: 'This melon is ripe and fragrant.',
    example_zh: '这个甜瓜熟了，很香。',
    image_caption: 'Ripe Melon',
    tags: 'CET4',
    level: 'basic',
  },
  {
    word: 'kiwi',
    phonetic: "/ˈkiːwi/",
    partOfSpeech: 'n.',
    definition: '猕猴桃',
    example_en: 'Kiwi fruit is rich in fiber.',
    example_zh: '猕猴桃富含膳食纤维。',
    image_caption: 'Kiwi Fruit',
    tags: 'CET4',
    level: 'basic',
  },
]

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crc)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makeColorPng(width, height, r, g, b) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < width; x += 1) {
      const i = rowStart + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = 255
    }
  }
  const compressed = zlib.deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const COLORS = [
  [220, 60, 60],
  [255, 210, 60],
  [255, 140, 40],
  [140, 80, 180],
  [255, 190, 80],
  [255, 170, 180],
  [255, 240, 80],
  [200, 40, 80],
  [160, 220, 120],
  [120, 180, 80],
]

const EXCEL_HEADERS = [
  'word',
  'phonetic',
  'partOfSpeech',
  'definition',
  'example_en',
  'example_zh',
  'image_caption',
  'tags',
  'level',
]

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeExcel() {
  const rows = [
    EXCEL_HEADERS,
    ...WORDS.map((item) => EXCEL_HEADERS.map((key) => item[key] ?? '')),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'words')
  const excelPath = path.join(outDir, 'words-import-template.xlsx')
  XLSX.writeFile(book, excelPath)
  return excelPath
}

function writeImages() {
  ensureDir(imagesDir)
  const files = []
  WORDS.forEach((item, index) => {
    const [r, g, b] = COLORS[index % COLORS.length]
    const fileName = `${String(index + 1).padStart(2, '0')}-${item.word}.png`
    const filePath = path.join(imagesDir, fileName)
    fs.writeFileSync(filePath, makeColorPng(640, 400, r, g, b))
    files.push(fileName)
  })
  return files
}

function writeReadme(imageFiles) {
  const readme = `# 批量导入示例数据

## 文件说明

- \`words-import-template.xlsx\` — 10 个水果类单词，表头与 \`import.csv\` 一致（不含 image_file）
- \`images/\` — 10 张图片，**按文件名排序后与 Excel 行顺序一致**

## Excel 表头

\`word, phonetic, partOfSpeech, definition, example_en, example_zh, image_caption, tags, level\`

**释义**（definition）是中文词义，**例句翻译**（example_zh）是例句中文，请勿混用。

## 导入步骤

1. 启动应用：\`npm run dev\` 或 \`npm run start\`
2. 打开 **词书 → 批量导入（Excel + 图片）**
3. 选择本目录下的 \`words-import-template.xlsx\`
4. 选择 \`images\` 文件夹
5. 选择目标词书 → 开始导入

## 单词列表（与图片顺序）

${WORDS.map((item, i) => `${i + 1}. ${item.word}（${item.definition}）← ${imageFiles[i]}`).join('\n')}
`
  fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf8')
}

ensureDir(outDir)
const excelPath = writeExcel()
const imageFiles = writeImages()
writeReadme(imageFiles)

console.log('示例数据已生成:')
console.log(`  Excel: ${excelPath}`)
console.log(`  图片:  ${imagesDir} (${imageFiles.length} 张)`)
