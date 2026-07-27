import { escapeAttribute, escapeHtml, formatDate, slugify } from "./utils.ts";
import { renderSiteHeader, renderThemeBootstrap } from "./site-header.ts";

export interface PostEntry {
  slug: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  category: string;
  image: string;
  theme: string;
  href: string;
  visibility: "public" | "draft" | "private";
}

export interface HomePageOptions {
  localPreview?: boolean;
}

export function renderHomePage(
  posts: readonly PostEntry[],
  { localPreview = false }: HomePageOptions = {}
): string {
  const articleList = posts.length
    ? posts.map((post, index) =>
      renderPostPreview(post, index, localPreview)
    ).join("\n")
    : `<p class="publication-empty">${
      localPreview ? "No local articles yet." : "No published articles yet."
    }</p>`;
  const localMetadata = localPreview
    ? `  <meta name="robots" content="noindex, nofollow">
  <meta name="color-scheme" content="light dark">
`
    : "";
  const localStyles = localPreview
    ? '  <link rel="stylesheet" href="styles/home-local.css">\n'
    : "";
  const localNotice = localPreview
    ? `    <aside class="local-preview-notice" aria-label="Local authoring preview">
      <div>
        <span>Local authoring index</span>
        <strong>Public, draft, and private writing</strong>
      </div>
      <p>This page exists only in the private development server. Private entries are never written to the public homepage or production output.</p>
      <code>:5174</code>
    </aside>
`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${localMetadata}  <meta name="description" content="Articles by Hongming Tan.">
  <title>${localPreview ? "Local Library" : "Hongming Tan · Articles"}</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <script>${renderThemeBootstrap()}</script>
  <link rel="stylesheet" href="styles/site-header.css">
  <link rel="stylesheet" href="styles/home-index.css">
${localStyles}  <script type="module" src="scripts/header.ts" defer></script>
</head>
<body class="publication-home${localPreview ? " publication-home--local" : ""}">
  ${renderSiteHeader({ homeHref: "./" })}

  <main class="publication-main">
${localNotice}    <h1 class="visually-hidden">${
      localPreview ? "Local articles by Hongming Tan" : "Articles by Hongming Tan"
    }</h1>
    <section class="posts-list" aria-label="${
      localPreview ? "Local article previews" : "Published articles"
    }">
${articleList}
    </section>
  </main>

  <footer class="journal-footer">
    <div class="journal-footer__inner">
      <p><strong>Hongming Tan’s personal blog</strong> for recording articles and information.</p>
      <nav aria-label="Footer links">
        <a href="https://github.com/harmonytan" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}

function renderPostPreview(
  post: PostEntry,
  index: number,
  localPreview: boolean
): string {
  const category = post.category;
  const href = post.href || `articles/${encodeURIComponent(post.slug)}/`;
  const categoryTag = category
    ? `
          <span class="post-tag post-tag--${escapeAttribute(slugify(category))}">${escapeHtml(category)}</span>`
    : "";
  const visibilityTag = localPreview && post.visibility !== "public"
    ? `
          <span class="post-visibility post-visibility--${
            escapeAttribute(post.visibility)
          }">${
            post.visibility === "private"
              ? "Private · local only"
              : "Draft · not published"
          }</span>`
    : "";
  const summary = post.summary
    ? `
            <p class="post-preview__abstract">${escapeHtml(post.summary)}</p>`
    : "";
  const thumbnail = post.image
    ? `
          <figure class="post-preview__thumbnail">
          <img src="${escapeAttribute(post.image)}" alt="" loading="lazy" decoding="async">
        </figure>`
    : "";

  return `      <article class="post-preview${post.image ? " post-preview--with-image" : ""}" style="--post-order: ${index}">
        <div class="post-preview__metadata">
          <time datetime="${escapeAttribute(post.date)}">${escapeHtml(formatDate(post.date))}</time>${visibilityTag}${categoryTag}
        </div>
        <a class="post-preview__link" href="${escapeAttribute(href)}">
          <div class="post-preview__description">
            <h2>${escapeHtml(post.title)}</h2>
            <p class="post-preview__authors">${escapeHtml(post.author || "Hongming Tan")}</p>${summary}
          </div>${thumbnail}
        </a>
      </article>`;
}
