import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { escapeAttribute, escapeHtml, slugify, textFromNode } from "./utils.mjs";

export async function renderMarkdown(source, { registry }) {
  const { markdown, references } = extractReferences(normalizeMathDelimiters(source));
  const parser = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective);
  const tree = parser.parse(markdown);

  restoreLiteralTextDirectives(tree);
  addHeadingIds(tree);
  transformImages(tree);
  const citationCounts = transformCitations(tree, references);
  await transformComponents(tree, registry);

  const renderedHtml = await mdastToHtml(tree);
  const { bodyHtml, appendixSections, footnotesHtml } = extractEndMatter(renderedHtml);
  return {
    html: bodyHtml,
    appendixSections,
    footnotesHtml,
    referencesHtml: renderReferences(references, citationCounts),
    components: registry.getAssets(),
  };
}

function restoreLiteralTextDirectives(tree) {
  visit(tree, "textDirective", (node, index, parent) => {
    if (!parent || typeof index !== "number") return;
    const suffix = node.children?.length ? node.children.map(textFromNode).join("") : "";
    parent.children[index] = { type: "text", value: `:${node.name}${suffix}` };
  });

  visit(tree, (node) => {
    if (!["containerDirective", "leafDirective"].includes(node.type)) return;
    if (node.name !== "component") {
      throw new Error(`Unsupported Markdown directive "${node.name}". Use :::component{name="scope.name"}.`);
    }
  });
}

async function mdastToHtml(tree) {
  const processor = unified()
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel: "Footnotes",
      footnoteBackLabel: "Back to content",
    })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true });
  const hast = await processor.run(tree);
  return processor.stringify(hast);
}

function extractReferences(source) {
  const references = new Map();
  const lines = String(source).split(/\r?\n/);
  const retained = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]:\s+(.+)$/);
    if (!match) {
      retained.push(line);
      continue;
    }
    references.set(match[1], parseReference(match[2]));
  }

  return { markdown: retained.join("\n"), references };
}

function normalizeMathDelimiters(source) {
  return String(source)
    .replace(/^\\\[\s*$/gm, () => "$$")
    .replace(/^\\\]\s*$/gm, () => "$$")
    .replace(/\\\((.+?)\\\)/g, (_, expression) => `$${expression}$`);
}

function parseReference(value) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/(?:^|\s)(https?:\/\/\S+)\s*$/i);
  if (!urlMatch) return { description: trimmed, url: "" };
  return {
    description: trimmed.slice(0, urlMatch.index).trim(),
    url: urlMatch[1],
  };
}

function addHeadingIds(tree) {
  const counts = new Map();

  visit(tree, "heading", (node) => {
    const label = textFromNode(node).trim();
    const base = slugify(label);
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    node.data = { ...(node.data ?? {}), hProperties: { id } };
  });
}

function transformImages(tree) {
  visit(tree, "paragraph", (node) => {
    if (!Array.isArray(node.children) || node.children.length === 0) return;
    const image = node.children[0];
    if (image.type !== "image") return;

    const suffix = node.children.slice(1).map(textFromNode).join("").trim();
    const optionMatch = suffix.match(/^\{([^}]+)\}$/);
    if (suffix && !optionMatch) return;

    const options = parseFigureOptions(optionMatch?.[1] ?? "");
    const [titlePart, ...captionParts] = String(image.alt ?? "").split(/\s*[|｜]\s*/);
    const title = titlePart.trim();
    const caption = captionParts.join(" | ").trim() || String(image.title ?? "").trim();
    const classes = ["article-figure"];
    if (options.layout) classes.push(`article-figure--${options.layout}`);
    const style = options.width ? ` style="--figure-width:${escapeAttribute(options.width)}"` : "";

    node.type = "html";
    node.value = `<figure class="${classes.join(" ")}"${style}>
  ${title ? `<div class="article-figure__title">${escapeHtml(title)}</div>` : ""}
  <a class="article-figure__frame" href="${escapeAttribute(image.url)}" data-lightbox>
    <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(title || caption)}" loading="lazy" decoding="async">
  </a>
  ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
</figure>`;
    delete node.children;
  });
}

function parseFigureOptions(value) {
  const tokens = String(value).toLowerCase().split(/[\s,]+/).filter(Boolean);
  const layout = tokens.includes("full") ? "full" : tokens.includes("wide") ? "wide" : "";
  const widthToken = tokens.find((token) => /^\d{1,3}%$/.test(token));
  const width = widthToken ? `${Math.min(100, Math.max(20, Number(widthToken.slice(0, -1))))}%` : "";
  return { layout, width };
}

function transformCitations(tree, references) {
  if (references.size === 0) return new Map();

  const counts = new Map();

  walkTextParents(tree, (parent, index, node) => {
    const parts = [];
    let cursor = 0;
    const pattern = /\[((?:\d+\s*,\s*)*\d+)\]/g;
    let match;
    while ((match = pattern.exec(node.value))) {
      const numbers = match[1].split(",").map((number) => number.trim());
      if (!numbers.every((number) => references.has(number))) continue;
      if (match.index > cursor) {
        parts.push({ type: "text", value: node.value.slice(cursor, match.index) });
      }
      const links = numbers.map((number) => {
        const count = (counts.get(number) ?? 0) + 1;
        counts.set(number, count);
        const citationId = count === 1 ? `cite-${number}` : `cite-${number}-${count}`;
        return `<a id="${citationId}" href="#ref-${number}" aria-label="Reference ${number}">${number}</a>`;
      }).join(", ");
      const preview = numbers.map((number) => {
        const reference = references.get(number);
        return `<span class="citation-popover__item"><span>${number}</span><span>${escapeHtml(reference.description)}</span></span>`;
      }).join("");
      parts.push({
        type: "html",
        value: `<span class="citation">[${links}]<span class="citation-popover" role="tooltip">${preview}</span></span>`,
      });
      cursor = match.index + match[0].length;
    }
    if (cursor === 0) return;
    if (cursor < node.value.length) parts.push({ type: "text", value: node.value.slice(cursor) });
    parent.children.splice(index, 1, ...parts);
    return parts.length;
  });

  return counts;
}

function walkTextParents(node, callback, blocked = false) {
  if (!node || !Array.isArray(node.children)) return;
  const nextBlocked = blocked || ["link", "linkReference", "code", "inlineCode", "html"].includes(node.type);
  for (let index = 0; index < node.children.length;) {
    const child = node.children[index];
    if (!nextBlocked && child.type === "text") {
      const inserted = callback(node, index, child);
      index += Number.isInteger(inserted) && inserted > 0 ? inserted : 1;
      continue;
    }
    walkTextParents(child, callback, nextBlocked);
    index += 1;
  }
}

async function transformComponents(node, registry) {
  if (!node || !Array.isArray(node.children)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (["containerDirective", "leafDirective"].includes(child.type) && child.name === "component") {
      const reference = child.attributes?.name;
      if (!reference) throw new Error("Component directive is missing the name attribute.");
      const props = { ...(child.attributes ?? {}) };
      delete props.name;
      const content = child.children?.length
        ? await mdastToHtml({ type: "root", children: child.children })
        : "";
      const html = await registry.render(reference, props, content);
      node.children[index] = { type: "html", value: html };
      continue;
    }
    await transformComponents(child, registry);
  }
}

function extractEndMatter(html) {
  const footnotes = [];
  let bodyHtml = String(html).replace(
    /<section\b(?=[^>]*\bclass="[^"]*\bfootnotes\b[^"]*")[^>]*>[\s\S]*?<\/section>/gi,
    (section) => {
      footnotes.push(section);
      return "";
    }
  );

  const appendixIds = new Set([
    "appendix",
    "acknowledgements",
    "acknowledgments",
    "author-contributions",
    "citation-information",
  ]);
  const headings = [...bodyHtml.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/h2>/gi)];
  const sections = [];
  const retained = [];
  let cursor = 0;

  headings.forEach((heading, index) => {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? bodyHtml.length;
    if (!appendixIds.has(heading[1])) return;
    retained.push(bodyHtml.slice(cursor, start));
    sections.push(toAppendixSection(bodyHtml.slice(start, end), heading[1]));
    cursor = end;
  });
  retained.push(bodyHtml.slice(cursor));
  bodyHtml = retained.join("").trim();

  return {
    bodyHtml,
    appendixSections: sections,
    footnotesHtml: footnotes.map(toFootnotesSection).join("\n"),
  };
}

function toAppendixSection(fragment, id) {
  const heading = fragment.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const title = heading?.[1] ?? "Appendix";
  const content = heading ? fragment.slice(heading[0].length).trim() : fragment;
  return {
    id,
    html: `<section class="article-appendix__section article-appendix__section--${escapeAttribute(id)}" aria-labelledby="${escapeAttribute(id)}">
  <h3 id="${escapeAttribute(id)}">${title}</h3>
  <div class="article-appendix__content">${content}</div>
</section>`,
  };
}

function toFootnotesSection(section) {
  const content = section
    .replace(/^<section\b[^>]*>/i, "")
    .replace(/<\/section>\s*$/i, "")
    .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, "")
    .replace(
      /(<a\b[^>]*data-footnote-backref(?:="")?[^>]*>)[\s\S]*?<\/a>/gi,
      (_, opening) => `${opening}[↩]</a>`
    )
    .trim();
  return `<section class="article-appendix__section article-footnotes" aria-labelledby="footnote-label">
  <h3 id="footnote-label">Footnotes</h3>
  <div class="article-appendix__content">${content}</div>
</section>`;
}

function renderReferences(references, citationCounts) {
  if (references.size === 0) return "";
  const items = [...references.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([number, reference]) => {
      const source = reference.url
        ? ` <a class="reference__source" href="${escapeAttribute(reference.url)}" target="_blank" rel="noopener noreferrer">[link]</a>`
        : "";
      const back = citationCounts.get(number)
        ? ` <a class="reference__back" href="#cite-${number}" aria-label="Back to citation ${number}">[↩]</a>`
        : "";
      return `<li id="ref-${number}">${escapeHtml(reference.description)}${source}${back}</li>`;
    }).join("\n");
  return `<section class="article-appendix__section article-references" aria-labelledby="references-title">
  <h3 id="references-title">References</h3>
  <div class="article-appendix__content"><ol>${items}</ol></div>
</section>`;
}
