# danci-app 技术文档

## 1. 项目概述

**danci-app** 是一款面向移动端的英语单词学习 Web 应用，支持词书管理、单词学习、打卡统计、分享海报、离线配图与发音等功能。

| 项目 | 说明 |
|------|------|
| 技术栈 | React 19 + TypeScript + Vite 6 + React Router 7 |
| 运行形态 | SPA（单页应用）+ Vite 中间件提供本地数据 API |
| 数据存储 | 服务端 JSON 文件 + 浏览器 localStorage 缓存 |
| 发音 | 离线 mp3（Edge TTS 生成）+ 在线 TTS 回退 |

---

## 2. 目录结构

```
danci_app/
├── src/                          # 前端源码
│   ├── pages/                    # 页面组件
│   ├── components/               # 通用组件
│   ├── context/                  # React Context 状态
│   ├── data/offlineDictionary/   # 内置词库 entries.json
│   ├── utils/                    # 工具函数
│   └── styles/                   # 全局样式
├── public/
│   ├── dictionary/               # 词库资源（图片、音频）
│   │   ├── images/
│   │   └── audio/words|sentences/
│   ├── images/                   # 图片源目录（sync-images 输入）
│   ├── local/                    # 构建时同步的用户数据副本
│   └── share-images/             # 分享海报背景图
├── data/
│   ├── local/                    # 用户运行时数据（JSON）
│   └── dictionary/               # CSV 词表、ECDICT 等
├── scripts/                      # Node 脚本与 Vite 插件
│   ├── lib/                      # 共享逻辑
│   └── vite-local-data-plugin.mjs
├── docs/                         # 文档
├── dist/                         # 构建产物
├── vite.config.ts
├── ecosystem.config.cjs          # PM2 配置
└── package.json
```

---

## 3. 前端架构

### 3.1 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/study/detail/:id` | DetailPage | 单词学习主界面 |
| `/dictionaries` | DictionariesPage | 词书列表 |
| `/dictionaries/:dictId` | DictionaryDetailPage | 词书详情 |
| `/dictionaries/:dictId/pick` | WordPickerPage | 从总词库选词 |
| `/words/add` | AddWordPage | 手动添加单词 |
| `/words/batch-import` | BatchImportPage | Excel + 图片批量导入 |
| `/me` | ProfilePage | 我的 / 统计 / 词库维护 |
| `/share` | SharePage | 打卡分享海报 |

### 3.2 Context 层

| Context | 职责 |
|---------|------|
| `LocalDataProvider` | 启动时从服务端/文件 hydrate 本地数据 |
| `ThemeProvider` | 深色 / 浅色主题 |
| `FavoritesProvider` | 收藏单词 ID 列表 |
| `WordBankProvider` | 内置词库 + 自定义词库合并 |
| `DictionaryProvider` | 词书 CRUD、当前词书、词书内单词 |
| `StudyProvider` | 学习次数、打卡、统计 |

### 3.3 词库合并逻辑

```
总词库 wordBank = 内置词条（entries.json，可运行时 API 刷新）
                + 自定义词条（custom-words.json）
                - 同名单词时自定义优先
```

词书（`dictionaries.json`）仅保存 **单词 ID 列表**，不重复存储单词内容。

### 3.4 数据持久化（localData.ts）

| 模式 | 读取 | 写入 |
|------|------|------|
| 开发 / PM2 预览 | `/api/local-data/*` | PUT / POST |
| 纯静态 | `/local/*.json` | 仅 localStorage |
| 回退 | localStorage | localStorage |

localStorage 键与 `data/local/*.json` 一一对应，启动时自动迁移。

---

## 4. 内置词库数据模型

文件：`src/data/offlineDictionary/entries.json`

```json
{
  "meta": { "version": 1, "name": "...", "entryCount": 12 },
  "entries": [
    {
      "id": "1",
      "word": "abandon",
      "phonetic": "/ə'bændən/",
      "partOfSpeech": "vt.",
      "definition": "放弃；抛弃",
      "example": { "en": "...", "zh": "..." },
      "image": { "file": "w001-abandon.svg", "caption": "..." },
      "audio": { "wordFile": "w001-abandon.mp3", "sentenceFile": "w001-abandon.mp3" },
      "tags": ["CET4"],
      "level": "basic"
    }
  ]
}
```

运行时通过 `entryToWord()` 转为前端 `Word` 类型，资源 URL 前缀为 `/dictionary/`。

---

## 5. 本地数据 API

由 `scripts/vite-local-data-plugin.mjs` 在 **dev** 与 **preview** 模式下挂载。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/local-data/health` | 健康检查 |
| GET/PUT | `/api/local-data/{key}` | 读写 JSON（custom-words、dictionaries 等） |
| POST | `/api/local-data/asset` | 保存自定义词图片/音频（base64） |
| POST | `/api/local-data/sync-audio` | 触发例句离线发音同步 |
| POST | `/api/local-data/batch-import` | Excel + 图片批量导入（multipart） |
| GET | `/api/local-data/entries` | 读取最新 entries.json（导入后刷新词库） |

允许的 `key`：`custom-words`、`dictionaries`、`check-ins`、`study-records`、`favorites`、`theme`。

---

## 6. 脚本与 CLI

| 命令 | 脚本 | 功能 |
|------|------|------|
| `npm run dev` | vite | 开发服务器，端口 5173 |
| `npm run build` | copy-local + tsc + vite build | 生产构建 |
| `npm run start` | vite preview | 生产预览/部署，端口 3002 |
| `npm run dict:import` | import-dictionary-csv.mjs | CSV → entries.json |
| `npm run dict:export` | export-dictionary-csv.mjs | entries.json → CSV |
| `npm run dict:sync-images` | sync-dictionary-images.mjs | image-inbox → dictionary/images（移入，不复制） |
| `npm run dict:sync-audio` | sync-dictionary-audio.mjs | Edge TTS 生成 mp3 |
| `npm run dict:enrich` | enrich-csv-from-ecdict.mjs | 词表 + ECDICT → import.csv |
| `npm run dict:download-ecdict` | download-ecdict.mjs | 下载 ECDICT 词典 |

### 6.1 图片命名约定

| 目录 | 命名 | 用途 |
|------|------|------|
| `data/dictionary/image-inbox/` | `{word}.png` | 待同步收件箱，sync-images 移入词库 |
| `public/dictionary/images/` | `w{nnn}-{word}.png` | **唯一存储**，应用实际读取 |
| 自定义词 | `custom-{word}-{id}.png` | 手动添加的单词 |

### 6.2 批量导入流程（batch-import-words.mjs）

1. 解析 Excel（xlsx）→ 行数据
2. 图片按上传顺序与行一一对应
3. 直接写入 `public/dictionary/images/w{nnn}-{slug}.{ext}`
4. 合并写入 `entries.json`、`import.csv`
5. 可选：将新词 ID 加入指定词书 `dictionaries.json`

### 6.3 离线发音

- 引擎：`node-edge-tts`（Microsoft Edge TTS）
- 默认音色：`en-GB-SoniaNeural`（英式）
- 输出：`public/dictionary/audio/words/`、`sentences/`

---

## 7. 音频播放策略（audio.ts）

| 场景 | 优先级 |
|------|--------|
| 有本地 mp3 | 先播本地文件 |
| 单词 | 有道 → 词典 API → Web Speech |
| 例句 | Google TTS → Web Speech → 有道 |
| 移动端 | 倾向外部 TTS，首次点击解锁音频 |

---

## 8. 主要依赖

| 包 | 用途 |
|----|------|
| react / react-dom | UI |
| react-router-dom | 路由 |
| vite / @vitejs/plugin-react | 构建与 dev server |
| xlsx | Excel 解析 |
| busboy | multipart 上传解析 |
| html-to-image | 分享海报生成 |
| node-edge-tts | 离线发音生成（devDependency，脚本用） |

---

## 9. 类型定义

- `src/types/word.ts` — 前端 Word
- `src/types/dictionary.ts` — 词书
- `src/types/dictionaryEntry.ts` — entries.json 条目
- `src/types/study.ts` / `checkIn.ts` — 学习统计

---

## 10. 构建与限制

- **构建时**：`entries.json` 会被打包进 JS bundle；运行时可通过 `/api/local-data/entries` 刷新。
- **纯静态部署**（无 Node）：无法写入文件，批量导入、添加单词、同步发音等 API 功能不可用。
- **推荐部署**：`npm run build` + `vite preview`（或 PM2 跑 `npm run start`），保留 local-data 插件。

---

## 11. 扩展开发建议

| 需求 | 建议修改位置 |
|------|--------------|
| 新增页面 | `src/pages/` + `App.tsx` 路由 |
| 新增 API | `vite-local-data-plugin.mjs` + `localData.ts` |
| 调整词库字段 | `dictionary.mjs` + `entries.json` 结构 + `Word` 类型 |
| 新增 CLI | `scripts/` + `package.json` scripts |
