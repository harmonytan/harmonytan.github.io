import { escapeAttribute, escapeHtml, formatDate, slugify } from "./utils.mjs";
import { renderSiteHeader, renderThemeBootstrap } from "./site-header.mjs";

export function renderHomePage(posts) {
  const articleList = posts.length
    ? posts.map(renderPostPreview).join("\n")
    : `<p class="publication-empty">No published articles yet.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Articles by Hongming Tan.">
  <title>Hongming Tan · Articles</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <script>${renderThemeBootstrap()}</script>
  <link rel="stylesheet" href="styles/site-header.css">
  <link rel="stylesheet" href="styles/home-index.css">
  <script type="module" src="scripts/header.js" defer></script>
</head>
<body class="publication-home">
  ${renderSiteHeader({ homeHref: "./" })}

  <main class="publication-main">
    <h1 class="visually-hidden">Articles by Hongming Tan</h1>
    <section class="posts-list" aria-label="Published articles">
${articleList}
    </section>
  </main>

  <footer class="journal-footer">
    <div class="journal-footer__inner">
      <p><strong>Hongming Tan</strong> writes to make technical and economic ideas clearer.</p>
      <nav aria-label="Footer links">
        <a href="https://github.com/harmonytan" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}

function renderPostPreview(post, index) {
  const category = post.category || "Notebook";
  const href = post.href || `articles/${encodeURIComponent(post.slug)}/`;
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
          <time datetime="${escapeAttribute(post.date)}">${escapeHtml(formatDate(post.date))}</time>
          <span class="post-tag post-tag--${escapeAttribute(slugify(category))}">${escapeHtml(category)}</span>
        </div>
        <a class="post-preview__link" href="${escapeAttribute(href)}">
          <div class="post-preview__description">
            <h2>${escapeHtml(post.title)}</h2>
            <p class="post-preview__authors">${escapeHtml(post.author || "Hongming Tan")}</p>${summary}
          </div>${thumbnail}
        </a>
      </article>`;
}
