# Harmony Tan Blog

一个极简的三页式个人博客，包含 Home、Articles 与 Contact 页面，支持以 Markdown 撰写文章。

## 快速开始

1. 在 `posts/` 目录中新建 `.md` 文件撰写文章内容，文件名即文章的 slug。
2. 在 `data/posts.json` 中追加一条记录，填写 `slug`、`title`、`date` 和 `summary`。
3. GitHub Pages 会自动加载最新的文章列表；访问 `article.html?post=your-slug` 查看渲染结果。

## 结构一览

- `index.html`：首页，展示简介与最近三篇文章
- `article.html`：文章详情页，通过查询参数加载 Markdown
- `contact.html`：联系方式与外部链接
- `styles/main.css`：全局样式与排版
- `scripts/`：页面逻辑与 Markdown 渲染
- `posts/`：Markdown 原文
- `data/posts.json`：文章元数据索引

欢迎基于此模板继续拓展。
