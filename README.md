# Harmony Tan Blog

Minimal three-page blog with a centered home intro, an article index, and Markdown-driven posts sourced from Markdown front matter.

## 快速开始

1. 在 `posts/` 目录中新建 `.md` 文件撰写文章内容，文件名即文章的 slug。
2. 在每篇 Markdown 顶部添加 front matter：

   ```markdown
   ---
   title: Title Here
   date: 2024-05-01
   summary: One-line description
   ---
   ```

3. 在 `data/posts.json` 中追加对应的 slug（例如 `"new-post-slug"`）。
4. 同步文章索引（任选其一）：
   - `node tools/update-posts-index.js`
   - `python tools/update_posts_index.py`
5. 文章列表会在 `articles.html` 自动呈现；访问 `article.html?post=your-slug` 查看渲染结果。

## 结构一览

- `index.html`：首页，集中展示自我介绍与文章入口
- `articles.html`：文章目录页，根据 Markdown front matter 渲染列表
- `article.html`：文章详情页，通过查询参数加载 Markdown
- `contact.html`：联系方式与外部链接
- `styles/main.css`：全局样式与排版
- `scripts/`：页面逻辑与 Markdown 渲染
- `posts/`：Markdown 原文
- `data/posts.json`：文章元数据索引

欢迎基于此模板继续拓展。
