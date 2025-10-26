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
    listElement.innerHTML = `<p class="muted">暂时无法加载文章，请稍后再试。</p>`;
  }
}

function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    listElement.innerHTML = `<p class="muted">写点什么吧，第一篇文章会出现在这里。</p>`;
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
