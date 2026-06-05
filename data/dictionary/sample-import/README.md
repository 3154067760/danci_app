# 批量导入示例数据

## 文件说明

- `words-import-template.xlsx` — 10 个水果类单词，表头与 `import.csv` 一致（不含 image_file）
- `images/` — 10 张图片，**按文件名排序后与 Excel 行顺序一致**

## Excel 表头

`word, phonetic, partOfSpeech, definition, example_en, example_zh, image_caption, tags, level`

**释义**（definition）是中文词义，**例句翻译**（example_zh）是例句中文，请勿混用。

## 导入步骤

1. 启动应用：`npm run dev` 或 `npm run start`
2. 打开 **词书 → 批量导入（Excel + 图片）**
3. 选择本目录下的 `words-import-template.xlsx`
4. 选择 `images` 文件夹
5. 选择目标词书 → 开始导入

## 单词列表（与图片顺序）

1. apple（苹果）← 01-apple.png
2. banana（香蕉）← 02-banana.png
3. orange（橙子；橙黄色）← 03-orange.png
4. grape（葡萄）← 04-grape.png
5. mango（芒果）← 05-mango.png
6. peach（桃子）← 06-peach.png
7. lemon（柠檬）← 07-lemon.png
8. cherry（樱桃）← 08-cherry.png
9. melon（甜瓜；瓜）← 09-melon.png
10. kiwi（猕猴桃）← 10-kiwi.png
