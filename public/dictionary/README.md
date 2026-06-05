# 离线词典资源目录

词条数据最终写入 `src/data/offlineDictionary/entries.json`。  
批量维护请使用 `data/dictionary/` 下的 CSV 工作流。

## 目录结构

```
public/dictionary/
├── images/          # 配图
├── audio/
│   ├── words/       # 单词发音
│   └── sentences/   # 例句发音
└── README.md

data/dictionary/
├── dictionary-template.csv   # 完整字段模板（1 行示例）
├── word-list.example.csv     # 仅单词列表（给 ECDICT 合并用）
├── import.example.csv        # 当前 8 词的完整 CSV 示例
└── ecdict.csv                # 自行下载，不提交 Git
```

## 批量导入流程

### 1. 准备词表（仅单词）

复制 `data/dictionary/word-list.example.csv`，每行一个 `word`：

```csv
word,tags,level
abandon,CET4,basic
ability,CET4,basic
```

### 2. 用 ECDICT 补全释义

从仓库根目录下载 `ecdict.csv`（**不是 Releases 页**，那里是空的）：

- https://github.com/skywind3000/ECDICT
- 或运行 `npm run dict:download-ecdict`

放到 `data/dictionary/ecdict.csv`，然后：

```bash
npm run dict:enrich -- data/dictionary/word-list.csv
```

生成 `data/dictionary/import.csv`（含音标、词性、中文释义）。

### 3. 补全例句（Excel / WPS / Cursor 编辑 CSV）

在 `import.csv` 中补充 `example_en`、`example_zh`。  
**图片无需手填 `image_file`**，见下方「添加配图」。

### 4. 导入到应用

```bash
npm run dict:import -- data/dictionary/import.csv
```

- 默认 **merge**：相同单词更新，新单词追加
- `--replace`：全量替换现有词条

### 5. 生成离线发音

```bash
npm run dict:sync-audio
```

### 6. 添加配图（自动更新 CSV）

1. 图片放到 `data/dictionary/image-inbox/`，**文件名 = 单词**，如 `mulberry.png`
2. 运行：

```bash
npm run dict:sync-images
```

会自动：
- **移入** `public/dictionary/images/w011-mulberry.png`（不保留副本）
- 更新 `entries.json` 和 `import.csv` 里的 `image_file`（含正确扩展名）

也可直接覆盖 `public/dictionary/images/` 下已有文件。

### 7. 发音

## 其他命令

```bash
# 把现有 entries.json 导出为 CSV（方便二次编辑）
npm run dict:export -- data/dictionary/import.csv
```

## CSV 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| word | 是 | 英文单词 |
| definition | 是 | 中文释义 |
| phonetic | 否 | 音标，如 `/ə'bændən/` |
| partOfSpeech | 否 | 词性，如 `n.` |
| example_en | 否 | 英文例句 |
| example_zh | 否 | 例句翻译 |
| image_file | 否 | 图片文件名 |
| image_caption | 否 | 图片标题 |
| tags | 否 | 多个标签用 `\|` 分隔 |
| level | 否 | 难度 |

## 在代码中使用

```typescript
import { getWordById, wordBank, searchOfflineWords } from '@/data/wordBank'
```

## 版权提示

- **ECDICT**：GPL 协议，商用请注意
- **Tatoeba 例句**：CC BY，需署名
- 自写释义/例句：最省心
