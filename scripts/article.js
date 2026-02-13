import { renderMarkdown } from "./markdown.js";
import {
  formatDate,
  setDocumentTitle,
  parseFrontMatter,
  parseDateInput,
  BASE_URL,
  escapeHtml,
} from "./site.js";

const titleNode = document.querySelector("[data-article-title]");
const dateNode = document.querySelector("[data-article-date]");
const contentNode = document.querySelector("[data-article-content]");
const tocNode = document.querySelector("[data-article-toc]");
const inlineTocContainer = document.querySelector("[data-article-inline-toc]");
const desktopTocContainer = document.querySelector("[data-desktop-toc]");
const desktopTocNode = document.querySelector("[data-article-desktop-toc]");
const readingTimeNode = document.querySelector("[data-article-reading-time]");
const tocLabelNode = document.querySelector(".toc-label");
const topicNode = document.querySelector("[data-article-topic]");
const strapNode = document.querySelector("[data-article-strap]");
const authorNode = document.querySelector("[data-article-author]");
const heroReadingNode = document.querySelector("[data-article-meta-reading]");
const heroImageContainer = document.querySelector("[data-hero-image]");
const heroImageNode = document.querySelector("[data-hero-image-img]");
const articleGrid = document.querySelector(".article-grid");
const sidebarHoverZone = document.querySelector(".sidebar-hover-zone");
const articleSidebar = document.querySelector(".article-sidebar");
const pendingMathTargets = [];
let mathRetryTimer = null;
const pendingHighlightTargets = [];
let highlightRetryTimer = null;
let highlightFallbackTimer = null;
const DESKTOP_TOC_MIN_WIDTH = 1250;
let desktopTocCleanup = null;

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
      topic: postMeta?.topic ?? attributes.category ?? "",
      subtitle: postMeta?.summary ?? attributes.subtitle ?? "",
      author: postMeta?.author ?? attributes.author ?? "Hongming Tan",
      image: postMeta?.image ?? attributes.image ?? attributes.cover ?? "",
      tocEnabled: parseFrontMatterBoolean(attributes.toc, false),
    };

    renderArticle(mergedMeta, body);
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
  let headings = [];
  if (contentNode) {
    contentNode.innerHTML = renderMarkdown(markdownBody);
    headings = prepareHeadingAnchors(contentNode);
    typesetMath(contentNode);
    highlightCodeBlocks(contentNode);
    applyImageFallbacks(contentNode);
  }
  buildTableOfContents(headings, post.tocEnabled);
  buildDesktopToc(headings);
  const textStats = computeTextStats(markdownBody);
  setArticleStatsDisplay(textStats);
  updateHeroMeta(post, textStats);
  updateHeroImage(post);
  setDocumentTitle(post.title);
  bindTocLabelScroll();
  renderCitationBlock(post);
  if (contentNode) {
    addCopyButtons(contentNode);
    initImageLightbox(contentNode);
    initReferenceLinkToggle(contentNode);
  }
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
  if (tocNode) {
    tocNode.innerHTML = `<p class="muted">Add headings (##, ###) to show a table of contents.</p>`;
  }
  if (inlineTocContainer) {
    inlineTocContainer.hidden = true;
  }
  if (desktopTocNode) {
    desktopTocNode.innerHTML = "";
  }
  if (desktopTocContainer) {
    desktopTocContainer.hidden = true;
    desktopTocContainer.classList.remove("is-visible");
  }
  if (desktopTocCleanup) {
    desktopTocCleanup();
    desktopTocCleanup = null;
  }
  if (topicNode) {
    topicNode.textContent = "Notebook";
  }
  if (strapNode) {
    strapNode.textContent = "";
    strapNode.style.display = "none";
  }
  if (authorNode) {
    authorNode.textContent = "Hongming Tan";
  }
  if (heroReadingNode) {
    heroReadingNode.textContent = "";
  }
  setArticleStatsDisplay();
}

let lightboxState = null;

function initImageLightbox(container) {
  const links = container.querySelectorAll(".md-figure-link");
  if (!links.length) {
    return;
  }
  const lightbox = getOrCreateLightbox();
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const img = link.querySelector("img");
      if (!img) {
        return;
      }
      const src = link.getAttribute("href") || img.getAttribute("src");
      const alt = img.getAttribute("alt") || "";
      const figure = link.closest("figure");
      const captionText = figure
        ? figure.querySelector(".md-figure-caption")?.textContent?.trim()
        : "";
      openLightbox(lightbox, { src, alt, caption: captionText || "" });
    });
  });
}

function getOrCreateLightbox() {
  if (lightboxState?.root) {
    return lightboxState;
  }
  const root = document.createElement("div");
  root.className = "image-lightbox";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <button class="image-lightbox-close" type="button" aria-label="Close image">×</button>
    <div class="image-lightbox-backdrop" data-lightbox-backdrop></div>
    <figure class="image-lightbox-content">
      <img alt="" />
      <figcaption class="image-lightbox-caption"></figcaption>
    </figure>
  `;
  document.body.appendChild(root);

  const backdrop = root.querySelector("[data-lightbox-backdrop]");
  const closeButton = root.querySelector(".image-lightbox-close");
  const close = () => closeLightbox(lightboxState);
  backdrop.addEventListener("click", close);
  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  lightboxState = {
    root,
    img: root.querySelector("img"),
    caption: root.querySelector(".image-lightbox-caption"),
  };
  return lightboxState;
}

function openLightbox(lightbox, { src, alt, caption }) {
  if (!lightbox || !src) {
    return;
  }
  lightbox.img.src = src;
  lightbox.img.alt = alt || "";
  if (caption) {
    lightbox.caption.textContent = caption;
    lightbox.caption.style.display = "block";
  } else {
    lightbox.caption.textContent = "";
    lightbox.caption.style.display = "none";
  }
  lightbox.root.classList.add("is-open");
  lightbox.root.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeLightbox(lightbox) {
  if (!lightbox?.root) {
    return;
  }
  lightbox.root.classList.remove("is-open");
  lightbox.root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lightbox.img.src = "";
}

function initReferenceLinkToggle(container) {
  container.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-ref-toggle]");
    if (!toggle) {
      return;
    }
    const wrapper = toggle.closest(".reference-link");
    if (!wrapper) {
      return;
    }
    const isOpen = wrapper.classList.toggle("is-open");
    toggle.textContent = isOpen ? "Collapse" : "Expand";
  });
}

function typesetMath(target) {
  if (!target) {
    return;
  }
  const mathJax = window.MathJax;
  if (mathJax?.typesetPromise) {
    mathJax
      .typesetPromise([target])
      .catch((error) => console.error("MathJax typeset failed:", error));
    return;
  }

  pendingMathTargets.push(target);
  if (mathRetryTimer) {
    return;
  }
  mathRetryTimer = window.setInterval(() => {
    const mj = window.MathJax;
    if (!mj?.typesetPromise) {
      return;
    }
    window.clearInterval(mathRetryTimer);
    mathRetryTimer = null;
    const nodes = pendingMathTargets.splice(0, pendingMathTargets.length);
    if (nodes.length === 0) {
      return;
    }
    mj.typesetPromise(nodes).catch((error) => {
      console.error("MathJax typeset failed after load:", error);
    });
  }, 150);
}

function prepareHeadingAnchors(root) {
  if (!root) {
    return [];
  }
  const headingNodes = Array.from(root.querySelectorAll("h2, h3, h4"));
  if (headingNodes.length === 0) {
    return [];
  }
  const slugCounts = Object.create(null);
  return headingNodes.map((node, index) => {
    const text = node.textContent?.trim() ?? `Section ${index + 1}`;
    const level = Number(node.tagName.replace("H", ""));
    const baseId = slugifyHeading(text) || `section-${index + 1}`;
    const id = ensureUniqueSlug(baseId, slugCounts);
    node.id = id;
    return { id, text, level };
  });
}

function buildTableOfContents(headings, isEnabled) {
  if (!tocNode || !inlineTocContainer) {
    return;
  }
  if (!isEnabled) {
    inlineTocContainer.hidden = true;
    tocNode.innerHTML = "";
    return;
  }
  if (!headings || headings.length === 0) {
    inlineTocContainer.hidden = false;
    tocNode.innerHTML =
      '<p class="muted">Use h2/h3 headings to auto-generate the outline.</p>';
    return;
  }
  const list = document.createElement("ol");
  list.className = "toc-list";
  const latestItemByLevel = {};

  headings.forEach((heading) => {
    if (heading.level < 2 || heading.level > 4) {
      return;
    }

    const item = document.createElement("li");
    item.className = `toc-item level-${heading.level}`;

    const row = document.createElement("div");
    row.className = "toc-row";

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.text;
    row.appendChild(link);
    item.appendChild(row);

    let targetList = list;
    if (heading.level > 2) {
      let parent = null;
      for (let level = heading.level - 1; level >= 2; level -= 1) {
        if (latestItemByLevel[level]) {
          parent = latestItemByLevel[level];
          break;
        }
      }
      if (parent) {
        let childList = parent.querySelector(`:scope > ol.toc-sublist.level-${heading.level}`);
        if (!childList) {
          childList = document.createElement("ol");
          childList.className = `toc-sublist level-${heading.level}`;
          if (heading.level > 3) {
            childList.hidden = true;
            const parentRow = parent.querySelector(":scope > .toc-row");
            if (parentRow && !parentRow.querySelector(".toc-toggle")) {
              const toggle = document.createElement("button");
              toggle.type = "button";
              toggle.className = "toc-toggle";
              toggle.setAttribute("aria-expanded", "false");
              toggle.setAttribute("aria-label", "Expand subsections");
              toggle.textContent = "▸";
              toggle.addEventListener("click", () => {
                const expanded = toggle.getAttribute("aria-expanded") === "true";
                toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
                toggle.setAttribute(
                  "aria-label",
                  expanded ? "Expand subsections" : "Collapse subsections"
                );
                toggle.textContent = expanded ? "▸" : "▾";
                childList.hidden = expanded;
              });
              parentRow.appendChild(toggle);
            }
          }
          parent.appendChild(childList);
        }
        targetList = childList;
      }
    }

    targetList.appendChild(item);
    latestItemByLevel[heading.level] = item;
    for (let level = heading.level + 1; level <= 6; level += 1) {
      delete latestItemByLevel[level];
    }
  });
  if (!list.hasChildNodes()) {
    inlineTocContainer.hidden = false;
    tocNode.innerHTML =
      '<p class="muted">Use h2/h3 headings to auto-generate the outline.</p>';
    return;
  }
  inlineTocContainer.hidden = false;
  tocNode.innerHTML = "";
  tocNode.appendChild(list);
}

function buildDesktopToc(headings) {
  if (!desktopTocContainer || !desktopTocNode) {
    return;
  }
  if (desktopTocCleanup) {
    desktopTocCleanup();
    desktopTocCleanup = null;
  }

  const topLevelHeadings = pickTopLevelHeadings(headings);
  if (topLevelHeadings.length === 0) {
    desktopTocNode.innerHTML = "";
    desktopTocContainer.hidden = true;
    desktopTocContainer.classList.remove("is-visible");
    return;
  }

  const list = document.createElement("ol");
  list.className = "desktop-toc-list";
  topLevelHeadings.forEach((heading) => {
    const item = document.createElement("li");
    item.className = "desktop-toc-item";
    const link = document.createElement("a");
    link.className = "desktop-toc-link";
    link.href = `#${heading.id}`;
    link.textContent = heading.text;
    item.appendChild(link);
    list.appendChild(item);
  });

  desktopTocNode.innerHTML = "";
  desktopTocNode.appendChild(list);
  desktopTocContainer.hidden = false;
  desktopTocCleanup = bindDesktopTocScroll(topLevelHeadings);
}

function pickTopLevelHeadings(headings) {
  if (!Array.isArray(headings) || headings.length === 0) {
    return [];
  }
  const minLevel = headings.reduce((minimum, heading) => {
    if (heading.level < minimum) {
      return heading.level;
    }
    return minimum;
  }, headings[0].level);
  return headings.filter((heading) => heading.level === minLevel);
}

function bindDesktopTocScroll(headings) {
  if (!desktopTocContainer || !desktopTocNode) {
    return null;
  }
  const links = Array.from(desktopTocNode.querySelectorAll(".desktop-toc-link"));
  const headingNodes = headings
    .map((heading) => document.getElementById(heading.id))
    .filter(Boolean);
  const articleBodyWrapNode =
    contentNode?.closest(".article-body-wrap") ??
    document.querySelector(".article-body-wrap") ??
    contentNode;

  if (links.length === 0 || headingNodes.length === 0 || !articleBodyWrapNode) {
    desktopTocContainer.hidden = true;
    desktopTocContainer.classList.remove("is-visible");
    return null;
  }

  const updateActive = (activeId) => {
    links.forEach((link) => {
      link.classList.toggle("is-active", activeId ? link.getAttribute("href") === `#${activeId}` : false);
    });
  };

  let ticking = false;
  const updateState = () => {
    ticking = false;
    const isDesktop = window.innerWidth >= DESKTOP_TOC_MIN_WIDTH;
    if (!isDesktop) {
      desktopTocContainer.classList.remove("is-visible");
      updateActive(null);
      return;
    }

    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const revealLine = headerHeight + 24;
    const bodyRect = articleBodyWrapNode.getBoundingClientRect();
    const revealThreshold = Math.max(revealLine + 24, window.innerHeight * 0.42);
    const shouldShow = bodyRect.top <= revealThreshold && bodyRect.bottom > revealLine + 140;
    desktopTocContainer.classList.toggle("is-visible", shouldShow);
    if (!shouldShow) {
      updateActive(null);
      return;
    }

    let activeId = headingNodes[0].id;
    headingNodes.forEach((headingNode) => {
      if (headingNode.getBoundingClientRect().top <= revealLine + 32) {
        activeId = headingNode.id;
      }
    });
    updateActive(activeId);
  };

  const requestUpdate = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(updateState);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();

  return () => {
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    desktopTocContainer.classList.remove("is-visible");
    updateActive(null);
  };
}

function parseFrontMatterBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function computeTextStats(markdown) {
  if (!markdown) {
    return null;
  }
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ");
  const wordUnits = cleaned
    .split(/\s+/)
    .filter(Boolean).length;
  const hanMatches = cleaned.match(/[\u4e00-\u9fff]/g) ?? [];
  const totalUnits = wordUnits + hanMatches.length;
  const formatter = new Intl.NumberFormat("en-US");
  const formatted = formatter.format(totalUnits);
  return {
    units: totalUnits,
    formatted,
    shortLabel: `${formatted} words`,
    sidebarLabel: `${formatted} words`,
  };
}

function setArticleStatsDisplay(info) {
  if (readingTimeNode) {
    readingTimeNode.textContent = info?.sidebarLabel ?? "";
  }
  if (heroReadingNode) {
    heroReadingNode.textContent = info?.shortLabel ?? "";
  }
}

function updateHeroMeta(post, textStats) {
  if (topicNode) {
    topicNode.textContent = post.topic || "Notebook";
  }
  if (strapNode) {
    if (post.subtitle) {
      strapNode.textContent = post.subtitle;
      strapNode.style.display = "block";
    } else {
      strapNode.textContent = "";
      strapNode.style.display = "none";
    }
  }
  if (authorNode) {
    authorNode.textContent = post.author || "Hongming Tan";
  }
  if (heroReadingNode && textStats?.shortLabel) {
    heroReadingNode.textContent = textStats.shortLabel;
  }
}

function updateHeroImage(post) {
  if (!heroImageContainer || !heroImageNode) {
    return;
  }
  const src = post.image;
  if (src) {
    heroImageNode.src = src;
    applyImageFallback(heroImageNode);
    heroImageNode.alt = post.title ? `${post.title} cover image` : "Article cover image";
    heroImageContainer.style.display = "block";
  } else {
    heroImageContainer.style.display = "none";
    heroImageNode.removeAttribute("src");
  }
}

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
    const nextPath = extMatch ? pathname.replace(/\.[a-z0-9]+$/i, `.${nextExt}`) : `${pathname}.${nextExt}`;
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

function slugifyHeading(text) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function ensureUniqueSlug(slug, counts) {
  if (!counts[slug]) {
    counts[slug] = 1;
    return slug;
  }
  const uniqueSlug = `${slug}-${counts[slug]}`;
  counts[slug] += 1;
  return uniqueSlug;
}

function bindTocLabelScroll() {
  if (!tocLabelNode) {
    return;
  }
  tocLabelNode.addEventListener("click", (event) => {
    const anchor = document.querySelector("#article-top");
    if (!anchor) {
      return;
    }
    event.preventDefault();
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function highlightCodeBlocks(root) {
  if (!root) {
    return;
  }
  const blocks = Array.from(root.querySelectorAll("pre code"));
  if (blocks.length === 0) {
    return;
  }
  const hljs = window.hljs;
  if (hljs?.highlightElement) {
    blocks.forEach((block) => {
      if (block.dataset.highlighted === "true") {
        return;
      }
      hljs.highlightElement(block);
      block.dataset.highlighted = "true";
    });
    return;
  }

  pendingHighlightTargets.push(...blocks);
  if (highlightRetryTimer) {
    return;
  }
  highlightRetryTimer = window.setInterval(() => {
    const highlighter = window.hljs;
    if (!highlighter?.highlightElement) {
      return;
    }
    window.clearInterval(highlightRetryTimer);
    highlightRetryTimer = null;
    const pending = pendingHighlightTargets.splice(0, pendingHighlightTargets.length);
    pending.forEach((block) => {
      if (block.dataset.highlighted === "true") {
        return;
      }
      highlighter.highlightElement(block);
      block.dataset.highlighted = "true";
    });
  }, 150);

  if (!highlightFallbackTimer) {
    highlightFallbackTimer = window.setTimeout(() => {
      if (window.hljs?.highlightElement) {
        return;
      }
      const pending = pendingHighlightTargets.splice(0, pendingHighlightTargets.length);
      pending.forEach((block) => {
        if (block.dataset.highlighted === "true") {
          return;
        }
        simpleFallbackHighlight(block);
        block.dataset.highlighted = "true";
      });
    }, 1200);
  }
}

function simpleFallbackHighlight(block) {
  const langClass = Array.from(block.classList).find((c) =>
    c.startsWith("language-")
  );
  const lang = langClass ? langClass.replace("language-", "").toLowerCase() : "";
  const code = block.textContent || "";
  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const specs =
    lang === "python" || lang === "py"
      ? getPythonSpecs()
      : getJSSpecs();

  const matches = [];
  specs.forEach(({ regex, cls }) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(code)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  });
  matches.sort((a, b) => (a.start - b.start) || (a.end - b.end));

  const merged = [];
  let cursor = 0;
  matches.forEach((token) => {
    if (token.start < cursor) {
      return;
    }
    const plain = code.slice(cursor, token.start);
    if (plain) {
      merged.push({ text: plain });
    }
    merged.push({
      text: code.slice(token.start, token.end),
      cls: token.cls,
    });
    cursor = token.end;
  });
  if (cursor < code.length) {
    merged.push({ text: code.slice(cursor) });
  }

  const html = merged
    .map((part) => {
      const safe = escapeHtml(part.text);
      if (!part.cls) {
        return safe;
      }
      return `<span class="hljs-${part.cls}">${safe}</span>`;
    })
    .join("");
  block.innerHTML = html;
  block.classList.add("hljs");
}

function getJSSpecs() {
  return [
    { regex: /\/\/.*$/gm, cls: "comment" },
    { regex: /\/\*[\s\S]*?\*\//g, cls: "comment" },
    { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, cls: "string" },
    { regex: /\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|class|new|try|catch|finally|throw|await|async|yield|of|in)\b/g, cls: "keyword" },
    { regex: /\b(?:true|false|null|undefined|NaN|Infinity)\b/g, cls: "literal" },
    { regex: /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b/g, cls: "number" },
    { regex: /\bconsole\b/g, cls: "built_in" },
  ];
}

function getPythonSpecs() {
  return [
    { regex: /#.*$/gm, cls: "comment" },
    { regex: /("""[\s\S]*?""")|('''[\s\S]*?''')/g, cls: "string" },
    { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, cls: "string" },
    { regex: /\b(?:def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|with|lambda|yield|in|is|not|and|or|pass|global|nonlocal|raise|assert|True|False|None)\b/g, cls: "keyword" },
    { regex: /\b(?:self|cls)\b/g, cls: "built_in" },
    { regex: /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b/g, cls: "number" },
  ];
}

function renderCitationBlock(post) {
  if (!contentNode || !post?.title || !post?.author || !post?.slug) {
    return;
  }

  const existing = contentNode.querySelector(".citation-block");
  if (existing) {
    existing.remove();
  }

  const dateParts = parseDateParts(post.date);
  const pageUrl = buildArticleUrl(post.slug);
  const blogName = "Hongming's Blog";

  const humanCitation = `${post.author}. "${post.title}." ${blogName}${
    dateParts?.human ? ` (${dateParts.human})` : ""
  }. ${pageUrl}`;

  const bibtexKey = buildBibtexKey(post.slug, dateParts?.year);
  const bibtex = [
    `@article{${bibtexKey},`,
    `  title = {${post.title}},`,
    `  author = {${post.author}},`,
    `  journal = {${blogName}},`,
    dateParts?.year ? `  year = {${dateParts.year}},` : null,
    dateParts?.month ? `  month = {${dateParts.month}},` : null,
    `  url = {${pageUrl}}`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");

  const section = document.createElement("section");
  section.className = "citation-block";
  section.innerHTML = `
    <h2 id="citation">Citation</h2>
    <p class="citation-lede">Please cite this work as:</p>
    <pre class="citation-code">${escapeHtml(humanCitation)}</pre>
    <p class="citation-lede">Or use the BibTeX citation:</p>
    <pre class="citation-code"><code>${escapeHtml(bibtex)}</code></pre>
  `;

  const referencesHeading = contentNode.querySelector("#references");
  if (referencesHeading?.parentNode) {
    referencesHeading.parentNode.insertBefore(section, referencesHeading);
  } else {
    contentNode.appendChild(section);
  }
}

function parseDateParts(iso) {
  if (!iso) {
    return null;
  }
  const date = parseDateInput(iso);
  if (!date) {
    return { human: iso };
  }
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return { human: `${month} ${year}`, month, year };
}

function buildArticleUrl(slug) {
  const path = `${BASE_URL}/article.html?post=${encodeURIComponent(slug)}`;
  try {
    const url = new URL(path, window.location.origin);
    return url.toString();
  } catch (error) {
    console.warn("Failed to build absolute article URL, using relative path.", error);
    return path;
  }
}

function buildBibtexKey(slug, year) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase() || "article";
  return year ? `${safeSlug}${year}` : safeSlug;
}

function addCopyButtons(root) {
  if (!root) {
    return;
  }
  const blocks = Array.from(root.querySelectorAll("pre"));
  blocks.forEach((pre) => {
    if (pre.querySelector(".copy-button")) {
      return;
    }
    const copyText = pre.textContent;
    pre.dataset.copyText = copyText;
    pre.classList.add("has-copy-button");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-button";
    btn.setAttribute("aria-label", "Copy to clipboard");
    btn.textContent = "Copy";
    btn.addEventListener("click", () => handleCopy(pre, btn));
    pre.appendChild(btn);
  });
}

async function handleCopy(pre, btn) {
  const text = pre.dataset.copyText ?? pre.textContent ?? "";
  const original = btn.textContent;
  try {
    await writeToClipboard(text);
    btn.textContent = "Copied!";
  } catch (error) {
    console.warn("Copy failed:", error);
    btn.textContent = "Copy failed";
  } finally {
    window.setTimeout(() => {
      btn.textContent = original;
    }, 1400);
  }
}

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        resolve();
      } else {
        reject(new Error("execCommand copy failed"));
      }
    } catch (error) {
      document.body.removeChild(textarea);
      reject(error);
    }
  });
}

loadArticle();
