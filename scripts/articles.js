import { formatDate, escapeHtml, BASE_URL } from "./site.js";

const listElement = document.querySelector("[data-article-list]");

async function loadIndex() {
  if (!listElement) {
    return;
  }

  try {
    const posts = await loadPosts();
    renderList(posts);
  } catch (error) {
    console.error(error);
    listElement.innerHTML = `<p class="muted">Unable to load articles right now.</p>`;
  }
}

async function loadPosts() {
  const response = await fetch(`${BASE_URL}/data/posts.json`);
  if (!response.ok) {
    throw new Error(`Failed to load posts index: ${response.status}`);
  }
  const posts = await response.json();
  if (!Array.isArray(posts)) {
    return [];
  }
  return posts
    .map((post) => ({
      slug: post.slug,
      title: post.title ?? post.slug,
      summary: post.summary ?? "",
      date: post.date ?? "",
    }))
    .filter((post) => post.slug && post.title);
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
      const href = `${BASE_URL}/article.html?post=${encodeURIComponent(
        post.slug
      )}`;

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

loadIndex();
