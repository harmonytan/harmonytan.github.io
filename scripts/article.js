import { updateCurrentYear, formatDate, setDocumentTitle } from "./site.js";
import { renderMarkdown } from "./markdown.js";

updateCurrentYear();

const titleNode = document.querySelector("[data-article-title]");
const dateNode = document.querySelector("[data-article-date]");
const contentNode = document.querySelector("[data-article-content]");

async function loadArticle() {
  try {
    const posts = await loadPosts();
    if (!posts || posts.length === 0) {
      renderEmptyState("还没有文章，稍后再来看看。");
      return;
    }

    const targetSlug = resolveSlug(posts);
    const post = posts.find((item) => item.slug === targetSlug) ?? posts[0];
    if (!post) {
      renderEmptyState("未找到对应的文章。");
      return;
    }

    const markdown = await fetchMarkdown(post.slug);
    renderArticle(post, markdown);
  } catch (error) {
    console.error(error);
    renderEmptyState("文章加载失败，请稍后再试。");
  }
}

async function loadPosts() {
  const response = await fetch("data/posts.json");
  if (!response.ok) {
    throw new Error(`Failed to load posts meta: ${response.status}`);
  }
  return response.json();
}

function resolveSlug(posts) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("post");
  if (slug) {
    return slug;
  }
  return posts[0]?.slug;
}

async function fetchMarkdown(slug) {
  const response = await fetch(`posts/${encodeURIComponent(slug)}.md`);
  if (!response.ok) {
    throw new Error(`Failed to load markdown for: ${slug}`);
  }
  return response.text();
}

function renderArticle(post, markdown) {
  if (titleNode) {
    titleNode.textContent = post.title;
  }
  if (dateNode) {
    dateNode.textContent = formatDate(post.date);
    dateNode.setAttribute("datetime", post.date);
  }
  if (contentNode) {
    contentNode.innerHTML = renderMarkdown(markdown);
  }
  setDocumentTitle(post.title);
}

function renderEmptyState(message) {
  if (titleNode) {
    titleNode.textContent = "没有文章";
  }
  if (dateNode) {
    dateNode.textContent = "";
  }
  if (contentNode) {
    contentNode.innerHTML = `<p class="muted">${message}</p>`;
  }
}

loadArticle();
