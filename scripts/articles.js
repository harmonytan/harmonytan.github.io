import { formatDate, escapeHtml, BASE_URL, parseDateInput } from "./site.js";

const tableElement = document.querySelector("[data-article-table]");
const searchInput = document.querySelector("[data-article-search]");
let cachedPosts = [];

function applyImageFallback(imageNode) {
  if (!imageNode || imageNode.dataset.fallbackBound === "true") {
    return;
  }
  imageNode.dataset.fallbackBound = "true";
  imageNode.addEventListener("error", () => {
    const current = imageNode.getAttribute("src") ?? "";
    if (!current) {
      return;
    }
    const url = new URL(current, window.location.href);
    const pathname = url.pathname;
    const extMatch = pathname.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    const candidates = ["jpg", "jpeg", "png", "webp"];
    const remaining = candidates.filter((item) => item !== ext);
    let attempt = Number(imageNode.dataset.fallbackAttempt ?? "0");
    if (attempt >= remaining.length) {
      return;
    }
    const nextExt = remaining[attempt];
    const nextPath = extMatch
      ? pathname.replace(/\.[a-z0-9]+$/i, `.${nextExt}`)
      : `${pathname}.${nextExt}`;
    url.pathname = nextPath;
    imageNode.dataset.fallbackAttempt = String(attempt + 1);
    imageNode.src = url.toString();
  });
}

function applyImageFallbacks(container) {
  if (!container) {
    return;
  }
  container.querySelectorAll("img").forEach((img) => {
    applyImageFallback(img);
  });
}

async function loadIndex() {
  if (!tableElement) {
    return;
  }

  try {
    const posts = await loadPosts();
    cachedPosts = posts;
    bindSearch();
    renderTable(posts);
  } catch (error) {
    console.error(error);
    tableElement.innerHTML = `<p class="muted">Unable to load articles right now.</p>`;
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
      category: post.category ?? "",
    }))
    .filter((post) => post.slug && post.title);
}

function renderTable(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    tableElement.innerHTML = `<p class="muted">No articles yet. Drafts are in progress.</p>`;
    return;
  }

  const toTimestamp = (value) => {
    const date = parseDateInput(value);
    return date ? date.valueOf() : 0;
  };

  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.date) - toTimestamp(a.date)
  );

  const rows = sorted
    .map((post) => {
      const safeTitle = escapeHtml(post.title);
      const safeCategory = escapeHtml(post.category || "—");
      const date = formatDate(post.date);
      const href = `${BASE_URL}/article.html?post=${encodeURIComponent(
        post.slug
      )}`;
      return `
        <div class="article-row" role="link" tabindex="0" data-href="${href}">
          <div class="article-cell date">
            <time datetime="${post.date}">${date}</time>
          </div>
          <div class="article-cell category">${safeCategory}</div>
          <div class="article-cell title">${safeTitle}</div>
        </div>
      `;
    })
    .join("");

  tableElement.innerHTML = `
    <div class="article-table-head">
      <div class="article-cell date">Date</div>
      <div class="article-cell category">Category</div>
      <div class="article-cell title">Title</div>
    </div>
    <div class="article-table-body">
      ${rows}
    </div>
  `;

  tableElement.querySelectorAll(".article-row").forEach((row) => {
    const href = row.getAttribute("data-href");
    if (!href) return;
    row.addEventListener("click", () => {
      window.location.href = href;
    });
    row.addEventListener("keypress", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = href;
      }
    });
  });

  applyImageFallbacks(tableElement);
}

function bindSearch() {
  if (!searchInput) {
    return;
  }
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderTable(cachedPosts);
      return;
    }
    const filtered = cachedPosts.filter((post) => {
      const haystack = `${post.title} ${post.summary ?? ""} ${
        post.category ?? ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
    renderTable(filtered);
  });
}

loadIndex();
