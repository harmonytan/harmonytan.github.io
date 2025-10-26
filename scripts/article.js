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
      renderEmptyState("No posts yet. Check back soon.");
      return;
    }

    const targetSlug = resolveSlug(posts);
    const post = posts.find((item) => item.slug === targetSlug) ?? posts[0];
    if (!post) {
      renderEmptyState("We couldn't find that article.");
      return;
    }

    const markdown = await fetchMarkdown(post.slug);
    renderArticle(post, markdown);
  } catch (error) {
    console.error(error);
    renderEmptyState("Article failed to load. Please try again later.");
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
    titleNode.textContent = "No article selected";
  }
  if (dateNode) {
    dateNode.textContent = "";
  }
  if (contentNode) {
    contentNode.innerHTML = `<p class="muted">${message}</p>`;
  }
}

loadArticle();
