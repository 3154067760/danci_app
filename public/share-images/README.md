# 分享图片库

将分享背景图放在此目录，然后在 `src/data/shareImageLibrary.ts` 的 `shareImageFiles` 数组中追加文件名即可。

## 添加步骤

1. 上传图片到本目录（支持 `.jpg`、`.png`、`.webp`、`.svg`）
2. 编辑 `src/data/shareImageLibrary.ts`，在 `shareImageFiles` 里追加一行文件名，例如：

```typescript
'my-photo.jpg',
```

3. 刷新页面，每次进入分享页会随机选一张背景；也可点「换一张」重新随机

## 当前图片

- 5 张 SVG 插画（ocean、sunrise、study-desk、mountain、star-night）
- 22 张 JPG 励志背景（学习 背景 励志 唯美_18 ~ _39）

文案从内置励志语池中随机搭配，无需为每张图单独配置。
