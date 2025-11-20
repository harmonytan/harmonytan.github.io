import {
  formatDate,
  setDocumentTitle,
  parseFrontMatter,
  BASE_URL,
} from "./site.js";
import { renderMarkdown } from "./markdown.js";

const titleNode = document.querySelector("[data-article-title]");
const dateNode = document.querySelector("[data-article-date]");
const contentNode = document.querySelector("[data-article-content]");
const tocNode = document.querySelector("[data-article-toc]");
const readingTimeNode = document.querySelector("[data-article-reading-time]");
const tocLabelNode = document.querySelector(".toc-label");
const topicNode = document.querySelector("[data-article-topic]");
const strapNode = document.querySelector("[data-article-strap]");
const authorNode = document.querySelector("[data-article-author]");
const heroReadingNode = document.querySelector("[data-article-meta-reading]");
const pendingMathTargets = [];
let mathRetryTimer = null;
const pendingHighlightTargets = [];
let highlightRetryTimer = null;
let highlightFallbackTimer = null;

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
      author: postMeta?.author ?? attributes.author ?? "Harmony Tan",
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
  }
  buildTableOfContents(headings);
  const textStats = computeTextStats(markdownBody);
  setArticleStatsDisplay(textStats);
  updateHeroMeta(post, textStats);
  setDocumentTitle(post.title);
  bindTocLabelScroll();
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
  if (topicNode) {
    topicNode.textContent = "Notebook";
  }
  if (strapNode) {
    strapNode.textContent = "";
    strapNode.style.display = "none";
  }
  if (authorNode) {
    authorNode.textContent = "Harmony Tan";
  }
  if (heroReadingNode) {
    heroReadingNode.textContent = "";
  }
  setArticleStatsDisplay();
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

function buildTableOfContents(headings) {
  if (!tocNode) {
    return;
  }
  if (!headings || headings.length === 0) {
    tocNode.innerHTML =
      '<p class="muted">Use h2/h3 headings to auto-generate the outline.</p>';
    return;
  }
  const list = document.createElement("ol");
  list.className = "toc-list";
  headings.forEach((heading) => {
    if (heading.level < 2 || heading.level > 3) {
      return;
    }
    const item = document.createElement("li");
    item.className = `toc-item level-${heading.level}`;
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.text;
    item.appendChild(link);
    list.appendChild(item);
  });
  if (!list.hasChildNodes()) {
    tocNode.innerHTML =
      '<p class="muted">Use h2/h3 headings to auto-generate the outline.</p>';
    return;
  }
  tocNode.innerHTML = "";
  tocNode.appendChild(list);
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
    authorNode.textContent = post.author || "Harmony Tan";
  }
  if (heroReadingNode && textStats?.shortLabel) {
    heroReadingNode.textContent = textStats.shortLabel;
  }
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

loadArticle();
