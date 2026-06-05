# 本地应用数据

运行 `npm run dev` 时，应用数据会自动读写此目录下的 JSON 文件：

| 文件 | 说明 |
|------|------|
| `custom-words.json` | 手动添加的自定义单词 |
| `dictionaries.json` | 词书配置 |
| `check-ins.json` | 打卡记录 |
| `study-records.json` | 学习统计 |
| `favorites.json` | 收藏 |
| `theme.json` | 主题偏好 |

自定义单词的图片、音频会保存到 `public/dictionary/images/` 与 `public/dictionary/audio/`。

首次启动若浏览器里已有旧数据（localStorage），会自动迁移到此目录。

构建前会同步到 `public/local/` 供静态读取。
