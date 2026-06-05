# 配图收件箱

将待导入的图片放在此目录，**文件名 = 单词小写 + 扩展名**，例如：

- `grape.png`
- `ability.jpg`

## AI 图片导入（推荐，无需 Excel）

1. 配置 `.env`（见项目根目录 `.env.example`）
2. **应用内**：词书 → **AI 图片导入** → 选择本文件夹 → 开始导入  
   **或命令行**：`npm run dict:ai-import-images`

系统自动识图（底部例句）+ 补全释义，直接写入词库。

## 手动换图（词库已有该词）

```bash
npm run dict:sync-images
```

脚本会把本目录图片**移入** `public/dictionary/images/`（不保留副本）。

## 可选：仅生成 Excel

```bash
npm run dict:enrich-from-images
```

生成 `words-from-images.xlsx` 后，可到「批量导入」手动导入。
