# danci-app 操作文档

本文档面向日常使用人员，说明如何在浏览器中操作本应用，以及如何通过命令行维护词库。

---

## 1. 访问应用

| 环境 | 地址 |
|------|------|
| 本地开发 | http://localhost:5173 |
| 生产 / 服务器 | http://服务器IP:3002 |
| 手机（同 WiFi） | http://电脑IP:5173 或 :3002 |

底部导航：**学习** · **词书** · **我的**

---

## 2. 学习单词

### 2.1 学习页

路径：**学习**（`/study/detail/:id`）

| 功能 | 操作 |
|------|------|
| 听单词发音 | 点击单词旁喇叭 |
| 看释义 | 页面中部显示词性、中文释义 |
| 看例句 | 点击「点击显示例句」 |
| 听例句 | 例句旁喇叭 |
| 下一个 | 底部绿色按钮 |
| 太简单 | 右上角按钮，从**当前词书**移除该词（不删总词库） |
| 进度 | 标签显示 `当前序号/词书总数`，如 `1/4` |

### 2.2 顶部工具栏

- 搜索：查找单词
- 月亮：切换深色 / 浅色主题
- 星标：收藏当前单词

---

## 3. 词书管理

路径：**词书**（`/dictionaries`）

### 3.1 创建词书

1. 在「创建词书」输入名称
2. 点击「创建」
3. 进入词书详情后「选词」加入单词

### 3.2 切换当前词书

在词书列表中点击某本词书进入详情；学习页会使用**当前激活词书**中的单词。

### 3.3 添加单词的三种方式

| 方式 | 入口 | 适用场景 |
|------|------|----------|
| 手动添加 | 词书页 → 手动添加单词 | 单个词，可上传配图/音频 |
| 批量导入 | 词书页 → 批量导入（Excel + 图片） | 一次导入多个词 |
| 从词库选词 | 词书详情 → 选词 | 已有词条加入词书 |

### 3.4 手动添加单词

路径：`/words/add`

必填：单词、中文释义  
选填：音标、词性、例句、配图（最大 2MB）、mp3 发音  

保存后写入服务器 `data/local/custom-words.json`，图片进 `public/dictionary/images/`。

### 3.5 批量导入（Excel + 图片）

路径：`/words/batch-import`

**前提**：应用需通过 `npm run dev` 或 `npm run start` 运行（不能是离线打开的 html）。

#### 步骤

1. 准备 **Excel**（.xlsx / .xls），第一行为表头，与 `import.csv` 字段一致（**不含 image_file**，图片由文件夹按序匹配）：

   | 列 | 必填 | 示例表头 |
   |----|------|----------|
   | 单词 | 是 | word / 单词 |
   | 音标 | 建议 | phonetic / 音标 |
   | 词性 | 建议 | partOfSpeech / 词性 |
   | 释义 | 是 | definition / 释义 |
   | 英文例句 | 是 | example_en / 英文例句 |
   | 例句翻译 | 是 | example_zh / 例句翻译 |
   | 图片说明 | 否 | image_caption / 图片说明 |
   | 标签 | 否 | tags / 标签 |
   | 难度 | 否 | level / 难度 |

   **注意**：释义是中文词义（如「葡萄」），例句翻译是例句的中文（如「这些葡萄又甜又多汁。」），请勿混用。

2. 准备 **图片文件夹**  
   - 图片数量必须与 Excel 有效行数**一致**  
   - 按**文件名排序**后与 Excel **第 1 行、第 2 行…** 一一对应  
   - 建议命名：`01.png`、`02.png`…（原文件名任意，顺序要对）  
   - 支持 png / jpg / webp / svg  

3. 在页面选择 Excel、选择图片文件夹、选择目标词书  

4. 点击「开始导入」  

#### 导入后会发生什么

- 图片直接保存到 `public/dictionary/images/w{编号}-{单词}.{ext}`（唯一存储）
- 更新总词库与所选词书
- 页面自动刷新，无需手动 rebuild

5. （建议）到 **我的 → 词库维护 → 同步例句离线发音** 生成 mp3

---

### 3.6 AI 图片导入（仅图片文件夹，无需 Excel）

路径：`/words/ai-enrich` 或 `npm run dict:ai-import-images`

1. 配置 `.env`（DeepSeek + 硅基流动 API Key）
2. 图片命名：`grape.png`、`01-apple.jpg`（文件名即单词）
3. **应用内**：词书 → **AI 图片导入** → 选择文件夹 → 选词书 → 开始导入  
   **或命令行**：把图放到 `data/dictionary/image-inbox/` 后运行 `npm run dict:ai-import-images`

每张图约 10–20 秒。单张 ≤ 2MB，建议 640×400。

---

## 4. 更换单词配图

### 内置词（entries.json 中的词，如 ability）

**方法一（推荐）**

1. 将新图放到 `data/dictionary/image-inbox/ability.png`（文件名 = 单词小写 + 扩展名）
2. 运行：`npm run dict:sync-images`
3. 刷新浏览器

**方法二**

直接覆盖 `public/dictionary/images/w002-ability.png`（需与 entries.json 中 `image.file` 一致）

### 自定义词（手动添加的词，如 plum）

1. 将图片放到 `data/dictionary/image-inbox/plum.png`，运行 `npm run dict:sync-images`  
   或在添加单词页面上传（保存到 `public/dictionary/images/`）  
   或重新批量导入

---

## 5. 我的（统计与维护）

路径：**我的**（`/me`）

| 模块 | 功能 |
|------|------|
| 打卡与分享 | 今日学习完成后打卡，生成分享卡片 |
| 今日概览 | 学习次数、单词数 |
| 今日单词明细 | 点击可跳转该词 |
| 近 7 日统计 | 柱状图与列表 |
| 词库维护 | **同步例句离线发音**（等同 `npm run dict:sync-audio -- --sentences-only`） |

> 词库维护按钮仅在服务端 API 可用时启用（dev / PM2 start 模式）。

---

## 6. 命令行词库维护（Windows / 服务器）

在项目根目录打开终端：

```bash
# 安装依赖（首次）
npm install

# 从 CSV 导入词库（合并模式）
npm run dict:import -- data/dictionary/import.csv

# 全量替换词库（慎用）
npm run dict:import -- data/dictionary/import.csv --replace

# 同步 public/images 下的图片到词库
npm run dict:sync-images

# 生成离线发音（仅补缺失例句）
npm run dict:sync-audio -- --sentences-only

# 强制重新生成全部例句发音
npm run dict:sync-audio -- --sentences-only --force

# 导出 CSV
npm run dict:export

# 从词表 + ECDICT 自动补全 CSV
npm run dict:download-ecdict
npm run dict:enrich -- data/dictionary/word-list.csv
npm run dict:import -- data/dictionary/import.csv
```

### CSV 注意

- 必须使用 **UTF-8** 编码保存  
- Excel 请选择「CSV UTF-8」；否则中文会变成乱码

---

## 7. 常见问题

| 问题 | 原因 | 处理 |
|------|------|------|
| 图片不显示 | 路径不对或未 sync | 检查 `public/dictionary/images/`，运行 sync-images |
| 批量导入失败 | 未开 Node 服务 | 使用 `npm run dev` 或 `npm run start` |
| 图片数量不一致 | 文件夹图片数 ≠ Excel 行数 | 核对顺序与数量 |
| 导入后词书没有新词 | 未选目标词书 | 导入时选择词书，或手动选词 |
| 例句无离线发音 | 未生成 mp3 | 我的 → 同步例句离线发音 |
| 手机打不开 | 防火墙 / 未同 WiFi | 放行端口，使用局域网 IP |
| plum 等自定义词图不同步 | 应用了 sync-images 但未放 public/images | 自定义词用 `单词.png` 命名后 sync |

---

## 8. 数据文件位置（备份建议）

| 内容 | 路径 |
|------|------|
| 用户词书、打卡、统计 | `data/local/*.json` |
| 内置词库 | `src/data/offlineDictionary/entries.json` |
| 词库 CSV | `data/dictionary/import.csv` |
| 配图 | `public/dictionary/images/` |
| 发音 | `public/dictionary/audio/` |
| 源图 | `public/images/` |

定期备份以上目录即可保留全部学习数据与词库。
