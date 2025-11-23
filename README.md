# Hongming Tan Blog

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
   author: Hongming Tan
   image: /assets/your-cover.jpg   # Optional 16:9-ish hero cover
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

### References & citation

- Inline citations: write `[1]` in the text, and add definitions anywhere in the file as `[1]: Author, Title. Journal/Year. URL`.
- The renderer will auto-link citations to a References list at the bottom and link back to the first cite.
- A “Citation” block is auto-generated before References with a copyable human-readable string and BibTeX.
- All code blocks and citation blocks have a hover “Copy” button.

### Assets & covers

- Put shared images (e.g., hero covers) in `assets/` and reference them with an absolute path in front matter, e.g. `image: /assets/cover-name.jpg`.
- The favicon lives at `favicon.svg` and is linked from the HTML pages.

## Project map

- `index.html` — home hero and intro
- `articles.html` — article index populated from `data/posts.json`
- `article.html` — Markdown-rendered post with reading stats, hero, and TOC
- `contact.html` — contact links
- `styles/main.css` — shared typography, parchment styling, and layout
- `scripts/` — helper modules (`article.js`, `articles.js`, `markdown.js`, `header.js`, etc.), includes search + TOC logic
- `posts/` — raw Markdown sources
- `data/posts.json` — generated metadata index (do not edit by hand)
- `assets/` — optional cover images and static assets
- `favicon.svg` — site icon

Feel free to fork and adapt the layout, fonts, or scripts to suit your own publishing style.
