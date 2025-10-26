import { formatDate, setDocumentTitle, parseFrontMatter, BASE_URL } from "./site.js";
import { renderMarkdown } from "./markdown.js";

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
    if (!targetSlug) {
      renderEmptyState("We couldn't find that article.");
      return;
    }

    const postMeta = posts.find((post) => post.slug === targetSlug);
    const { attributes, body } = await fetchMarkdown(targetSlug);
    const mergedMeta = {
      slug: targetSlug,
      title: postMeta?.title ?? attributes.title ?? targetSlug,
      date: postMeta?.date ?? attributes.date ?? "",
    };

    renderArticle(
      mergedMeta,
      body
    );
  } catch (error) {
    console.error(error);
    renderEmptyState("Article failed to load. Please try again later.");
  }
}

let cachedPosts = null;

async function loadPosts() {
  if (cachedPosts) {
    return cachedPosts;
  }
  const response = await fetch(`${BASE_URL}/data/posts.json`);
  if (!response.ok) {
    throw new Error(`Failed to load post list: ${response.status}`);
  }
  const posts = await response.json();
  if (!Array.isArray(posts)) {
    return [];
  }
  cachedPosts = posts.filter((post) => post && post.slug);
  return cachedPosts;
}

function resolveSlug(posts) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("post");
  if (slug) {
    const match = posts.find((post) => post.slug === slug);
    if (match) {
      return slug;
    }
  }
  return posts[0]?.slug;
}

async function fetchMarkdown(slug) {
  const response = await fetch(
    `${BASE_URL}/posts/${encodeURIComponent(slug)}.md`
  );
  if (!response.ok) {
    throw new Error(`Failed to load markdown for: ${slug}`);
  }
  const raw = await response.text();
  return parseFrontMatter(raw);
}

function renderArticle(post, markdownBody) {
  if (titleNode) {
    titleNode.textContent = post.title;
  }
  if (dateNode) {
    dateNode.textContent = formatDate(post.date);
    dateNode.setAttribute("datetime", post.date);
  }
  if (contentNode) {
    contentNode.innerHTML = renderMarkdown(markdownBody);
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
