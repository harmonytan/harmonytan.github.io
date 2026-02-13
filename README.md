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
   image: assets/your-cover.jpg   # Optional 16:9-ish hero cover (relative path)
   ---
   ```

3. Regenerate the article index so the list and hero metadata stay in sync:
   ```bash
   python tools/update_posts_index.py
   # or
   node tools/update-posts-index.js
   ```
   Both scripts scan `posts/`, parse each front matter block (including `image`), and rewrite `data/posts.json` with sorted metadata.

Optional local drafts workflow:

- Keep in-progress files in `drafts/` (ignored by git by default in this repo).
- Generate a local drafts index for `editor.html`:
  ```bash
  node tools/update-drafts-index.js
  ```
- In `editor.html`, switch `Source` to `drafts/` and use `Load`.

4. Optimize images (convert to JPG + resize + update front matter + refresh index):
   ```bash
   python tools/optimize_images.py assets/images/reward-hacking-in-life
   # or a single file
   python tools/optimize_images.py assets/images/reward-hacking-in-life/main.png
   ```
   Defaults: longest edge 1200px, JPEG quality 82. Use `--max-size` and `--quality` to adjust.

5. Inject content-hash versions into local CSS/JS references before deploy:
   ```bash
   node tools/build-site.js
   ```
   Optional check mode (fails with non-zero exit code if files need updates):
   ```bash
   node tools/build-site.js --check
   ```

6. Serve the site (for example, `python3 -m http.server`) and visit:
   - `articles.html` for the index
   - `article.html?post=your-slug` for the reading view
   - `editor.html` for a local Markdown editor with live preview and local file open/save

### Deploy checklist

- Required when post metadata/content changed:
  ```bash
  node tools/update-posts-index.js
  ```
- Required before every deploy (refresh CSS/JS cache-busting hashes in HTML):
  ```bash
  node tools/build-site.js
  ```
- Optional (only when you process images):
  ```bash
  python tools/optimize_images.py <file-or-dir>
  ```

CI automation:

- `.github/workflows/site-consistency.yml` runs on push/PR and checks generated files are committed.
- It verifies the outputs of:
  - `node tools/update-posts-index.js`
  - `node tools/build-site.js`

> When deploying to GitHub Pages, nothing special is required. `scripts/site.js` infers the correct base path, but you can override it by defining `window.__BLOG_BASE_PATH__` before loading the scripts.

### Local editor workflow

- Open `editor.html` while running the local server.
- Write Markdown on the left; preview updates on the right using the same renderer as `article.html`.
- `Source` + `Load` can import entries from either `posts/` (`data/posts.json`) or `drafts/` (`data/drafts.json`).
- `Open` / `Save` / `Save As` use the browser File System Access API when available (Chrome/Edge recommended).
- On browsers without write access, the editor falls back to opening via file input and saving via file download.
- The latest draft is cached in `localStorage` so accidental refreshes are recoverable.

### References & citation

- Inline citations: write `[1]` in the text, and add definitions anywhere in the file as `[1]: Author, Title. Journal/Year. URL`.
- The renderer will auto-link citations to a References list at the bottom and link back to the first cite.
- A “Citation” block is auto-generated before References with a copyable human-readable string and BibTeX.
- All code blocks and citation blocks have a hover “Copy” button.

### Assets & covers

- Put shared images (e.g., hero covers) in `assets/` and reference them with a relative path in front matter, e.g. `image: assets/cover-name.jpg`.
- If you move an image, re-run the index script so `data/posts.json` stays in sync with the new path.
- The favicon lives at `favicon.svg` and is linked from the HTML pages.

## Project map

- `index.html` — home hero and intro
- `articles.html` — article index populated from `data/posts.json`
- `article.html` — Markdown-rendered post with reading stats, hero, and TOC
- `editor.html` — local-only Markdown editor with live preview and file open/save
- `contact.html` — contact links
- `styles/main.css` — shared typography, parchment styling, and layout
- `scripts/` — helper modules (`article.js`, `articles.js`, `markdown.js`, `header.js`, etc.), includes search + TOC logic
- `scripts/editor.js` — editor actions, local draft persistence, and live Markdown rendering
- `posts/` — raw Markdown sources
- `data/posts.json` — generated metadata index (do not edit by hand)
- `assets/` — optional cover images and static assets
- `favicon.svg` — site icon

Feel free to fork and adapt the layout, fonts, or scripts to suit your own publishing style.
