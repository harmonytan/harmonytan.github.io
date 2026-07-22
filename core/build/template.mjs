import { escapeAttribute, escapeHtml, formatDate } from "./utils.mjs";
import { renderSiteHeader, renderThemeBootstrap } from "./site-header.mjs";

export function renderArticleDocument({
  article,
  contentHtml,
  appendixSections = [],
  footnotesHtml = "",
  referencesHtml = "",
  components,
  theme,
}) {
  const componentStyles = components
    .filter((item) => item.styleHref)
    .map((item) => `  <link rel="stylesheet" href="${escapeAttribute(item.styleHref)}">`)
    .join("\n");
  const published = formatDate(article.date);
  const description = article.summary || `An article by ${article.author}.`;
  const appendix = renderAppendix(article, appendixSections, footnotesHtml, referencesHtml);

  return `<!doctype html>
<html lang="en" data-color-theme="light" data-article-theme="${escapeAttribute(theme.id)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttribute(description)}">
  <title>${escapeHtml(article.title)} · Hongming Tan</title>
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <script>${renderThemeBootstrap()}</script>
  <link rel="stylesheet" href="../../themes/base.css">
  <link rel="stylesheet" href="../../themes/${escapeAttribute(theme.id)}/style.css">
  <link rel="stylesheet" href="../../styles/site-header.css">
${componentStyles}
  <script type="module" src="../../scripts/header.js" defer></script>
  <script type="module" src="./article-entry.js" defer></script>
</head>
<body class="article-page theme-${escapeAttribute(theme.id)}">
  ${renderSiteHeader({ homeHref: "../../" })}
  <main class="article-layout">
    <article class="article-shell" id="article-top">
      ${renderHero(article, published)}
      <div class="article-content">${contentHtml}</div>
      ${appendix}
    </article>
  </main>
  <dialog class="image-lightbox" data-lightbox-dialog aria-label="Image preview">
    <button type="button" data-lightbox-close aria-label="Close image preview">Close</button>
    <img alt="">
    <p></p>
  </dialog>
</body>
</html>
`;
}

function renderHero(article, published) {
  const summary = article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : "";
  return `<header class="article-hero article-hero--research">
    <p class="article-kicker">${escapeHtml(article.category)}</p>
    <h1>${escapeHtml(article.title)}</h1>
    ${summary}
    <div class="article-byline-grid">
      <div><span>Authors</span><strong>${escapeHtml(article.author)}</strong></div>
      <div><span>Affiliations</span><strong>${escapeHtml(article.affiliation)}</strong></div>
      <div><span>Published</span><time datetime="${escapeAttribute(article.date)}">${escapeHtml(published)}</time></div>
    </div>
  </header>`;
}

function renderAppendix(article, appendixSections, footnotesHtml, referencesHtml) {
  const hasCustomCitation = appendixSections.some((section) => section.id === "citation-information");
  const sections = [
    ...appendixSections.map((section) => section.html),
    hasCustomCitation ? "" : renderCitationInformation(article),
    footnotesHtml,
    referencesHtml,
  ].filter(Boolean).join("\n");

  return `<section class="article-appendix" aria-label="Article information">
    <div class="article-appendix__inner">
      ${sections}
      <footer class="article-footer"><a href="../../">← All articles</a></footer>
    </div>
  </section>`;
}

function renderCitationInformation(article) {
  const year = String(article.date).slice(0, 4);
  const citation = article.citation ?? {};
  const author = citation.author || article.author;
  const title = citation.title || article.title;
  const venue = citation.venue || "Hongming Tan";
  const url = citation.url || `https://harmonytan.github.io/articles/${article.slug}/`;
  const key = citation.key || `tan${year}${article.slug.replace(/[^a-z0-9]+/g, "")}`;
  const plainText = `${author}. “${title}.” ${venue}, ${year}. ${url}`;
  const bibtex = `@article{${key},\n  author = {${author}},\n  title = {${title}},\n  journal = {${venue}},\n  year = {${year}},\n  url = {${url}}\n}`;

  return `<section class="article-appendix__section article-citation-information" aria-labelledby="citation-information">
  <h3 id="citation-information">Citation Information</h3>
  <div class="article-appendix__content">
    <p>Please cite this article as:</p>
    <pre class="citation-record">${escapeHtml(plainText)}</pre>
    <p>BibTeX citation:</p>
    <pre class="citation-record">${escapeHtml(bibtex)}</pre>
  </div>
</section>`;
}
