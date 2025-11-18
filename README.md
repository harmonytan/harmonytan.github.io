# Harmony Tan Blog

Minimal static blog with an airy hero, a frosted article outline, and Markdown posts rendered into a stylized parchment reading view.

## Quick start

1. Create a new Markdown file in `posts/`. The filename becomes the article slug (e.g., `hello-world.md` → `?post=hello-world`).
2. Add front matter to every file:

   ```markdown
   ---
   title: Title Here
   date: 2025-10-25
   summary: One-line description
   category: Notebook
   subtitle: Optional hero strapline
   author: Harmony Tan
   ---
   ```

3. Regenerate the article index so the list and hero metadata stay in sync:
   ```bash
   python tools/update_posts_index.py
   # or
   node tools/update-posts-index.js
   ```
   Both scripts scan `posts/`, parse each front matter block, and rewrite `data/posts.json` with sorted metadata.

4. Serve the site (for example, `python3 -m http.server`) and visit:
   - `articles.html` for the index
   - `article.html?post=your-slug` for the reading view

> When deploying to GitHub Pages, nothing special is required. `scripts/site.js` infers the correct base path, but you can override it by defining `window.__BLOG_BASE_PATH__` before loading the scripts.

## Project map

- `index.html` — home hero and intro
- `articles.html` — article index populated from `data/posts.json`
- `article.html` — Markdown-rendered post with reading stats, hero, and TOC
- `contact.html` — contact links
- `styles/main.css` — shared typography, parchment styling, and layout
- `scripts/` — helper modules (`article.js`, `articles.js`, `markdown.js`, `header.js`, etc.)
- `posts/` — raw Markdown sources
- `data/posts.json` — generated metadata index (do not edit by hand)

Feel free to fork and adapt the layout, fonts, or scripts to suit your own publishing style.
