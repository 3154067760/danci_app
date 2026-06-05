# 单词学习 App

响应式单词学习网页，参考墨墨背单词风格，支持手机与电脑端。

## 功能

- **详情页**：词典切换、释义例句（点击展开）、配图卡片、下一个
- **模拟发音**：浏览器 Web Speech API 朗读
- **模拟配图**：SVG 场景插图

## 运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 自动跳转到第一个单词 |
| `/detail/:id` | 单词详情页 |

## 技术栈

React 19 + TypeScript + Vite + React Router
