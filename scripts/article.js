import { updateCurrentYear, formatDate, setDocumentTitle, parseFrontMatter } from "./site.js";
import { renderMarkdown } from "./markdown.js";

updateCurrentYear();

const titleNode = document.querySelector("[data-article-title]");
const dateNode = document.querySelector("[data-article-date]");
const contentNode = document.querySelector("[data-article-content]");

async function loadArticle() {
  try {
    const slugs = await loadSlugs();
    if (!slugs || slugs.length === 0) {
      renderEmptyState("No posts yet. Check back soon.");
      return;
    }

    const targetSlug = resolveSlug(slugs);
    if (!targetSlug) {
      renderEmptyState("We couldn't find that article.");
      return;
    }

    const { attributes, body } = await fetchMarkdown(targetSlug);
    renderArticle(
      {
        slug: targetSlug,
        title: attributes.title ?? targetSlug,
        date: attributes.date ?? "",
      },
      body
    );
  } catch (error) {
    console.error(error);
    renderEmptyState("Article failed to load. Please try again later.");
  }
}

async function loadSlugs() {
  const response = await fetch("data/posts.json");
  if (!response.ok) {
    throw new Error(`Failed to load post list: ${response.status}`);
  }
  return response.json();
}

function resolveSlug(slugs) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("post");
  if (slug && slugs.includes(slug)) {
    return slug;
  }
  return slugs[0];
}

async function fetchMarkdown(slug) {
  const response = await fetch(`posts/${encodeURIComponent(slug)}.md`);
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
