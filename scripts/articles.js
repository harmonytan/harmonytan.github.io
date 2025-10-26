import { updateCurrentYear, formatDate, escapeHtml, parseFrontMatter } from "./site.js";

updateCurrentYear();

const listElement = document.querySelector("[data-article-list]");

async function loadIndex() {
  if (!listElement) {
    return;
  }

  try {
    const slugs = await loadSlugs();
    const posts = await loadPostsMetadata(slugs);
    renderList(posts);
  } catch (error) {
    console.error(error);
    listElement.innerHTML = `<p class="muted">Unable to load articles right now.</p>`;
  }
}

async function loadSlugs() {
  const response = await fetch("data/posts.json");
  if (!response.ok) {
    throw new Error(`Failed to load index: ${response.status}`);
  }
  return response.json();
}

async function loadPostsMetadata(slugs) {
  if (!Array.isArray(slugs)) {
    return [];
  }

  const posts = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const { attributes } = await fetchMarkdownWithMeta(slug);
        return {
          slug,
          title: attributes.title ?? slug,
          summary: attributes.summary ?? "",
          date: attributes.date ?? "",
        };
      } catch (error) {
        console.error(`Failed to load metadata for ${slug}`, error);
        return null;
      }
    })
  );

  return posts.filter((post) => post && post.title);
}

function renderList(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    listElement.innerHTML = `<p class="muted">No articles yet. Drafts are in progress.</p>`;
    return;
  }

  const toTimestamp = (value) => {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  };

  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.date) - toTimestamp(a.date)
  );

  const html = sorted
    .map((post) => {
      const safeTitle = escapeHtml(post.title);
      const safeSummary = escapeHtml(post.summary ?? "");
      const date = formatDate(post.date);
      const href = `article.html?post=${encodeURIComponent(post.slug)}`;

      return `
        <a class="post-card" href="${href}">
          <time datetime="${post.date}">${date}</time>
          <h3>${safeTitle}</h3>
          <p>${safeSummary}</p>
        </a>
      `;
    })
    .join("");

  listElement.innerHTML = html;
}

async function fetchMarkdownWithMeta(slug) {
  const response = await fetch(`posts/${encodeURIComponent(slug)}.md`);
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown for ${slug}`);
  }
  const raw = await response.text();
  return parseFrontMatter(raw);
}

loadIndex();
