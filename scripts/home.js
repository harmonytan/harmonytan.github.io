import { updateCurrentYear, formatDate, escapeHtml } from "./site.js";

updateCurrentYear();

const listElement = document.querySelector("[data-post-list]");

async function loadPosts() {
  if (!listElement) {
    return;
  }

  try {
    const response = await fetch("data/posts.json");
    if (!response.ok) {
      throw new Error(`Failed to load posts: ${response.status}`);
    }

    const posts = await response.json();
    renderPosts(posts);
  } catch (error) {
    console.error(error);
    listElement.innerHTML = `<p class="muted">Unable to load posts right now. Try again soon.</p>`;
  }
}

function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    listElement.innerHTML = `<p class="muted">Empty for now. The first post will land here.</p>`;
    return;
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf()
  );

  const items = sorted.slice(0, 3).map((post) => {
    const { title, summary, date, slug } = post;
    const formattedDate = formatDate(date);
    const url = `article.html?post=${encodeURIComponent(slug)}`;
    const safeTitle = escapeHtml(title);
    const safeSummary = escapeHtml(summary ?? "");

    return `
      <a class="post-card" href="${url}">
        <time datetime="${date}">${formattedDate}</time>
        <h3>${safeTitle}</h3>
        <p>${safeSummary}</p>
      </a>
    `;
  });

  listElement.innerHTML = items.join("");
}

loadPosts();
