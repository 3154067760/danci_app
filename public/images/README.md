# 已弃用

此目录为旧版「源图」位置，**新流程请勿使用**。

请改用：

- **批量导入 / 手动添加**：直接写入 `public/dictionary/images/`
- **按单词名换图**：放到 `data/dictionary/image-inbox/{word}.png`，运行 `npm run dict:sync-images`

若此目录仍有文件，运行 `npm run dict:sync-images` 会自动迁移到词库目录并移走，不保留副本。
