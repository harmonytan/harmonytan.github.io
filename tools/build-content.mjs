#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { ComponentRegistry } from "../core/build/components.mjs";
import { parseArticleSource, normalizeArticleMeta } from "../core/build/frontmatter.mjs";
import { renderMarkdown } from "../core/build/markdown.mjs";
import { renderHomePage } from "../core/build/home.mjs";
import { assertSafeName } from "../core/build/utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const THEMES_DIR = path.join(ROOT, "themes");

export async function buildContent({ check = false, quiet = false } = {}) {
  const articleEntries = await fs.readdir(ARTICLES_DIR, { withFileTypes: true });
  const slugs = articleEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
  const outputs = [];
  const removals = [];
  const posts = [];

  await validateComponentDirectory(path.join(ROOT, "components"), "shared");

  for (const slug of slugs) {
    assertSafeName(slug, "Article slug");
    const articleDir = path.join(ARTICLES_DIR, slug);
    const sourcePath = path.join(articleDir, "index.md");
    if (!(await exists(sourcePath))) {
      removals.push(
        path.join(articleDir, "index.html"),
        path.join(articleDir, "article-entry.js")
      );
      continue;
    }
    await validateComponentDirectory(path.join(articleDir, "components"), "local");

    const source = await fs.readFile(sourcePath, "utf8");
    const { attributes, body } = parseArticleSource(source, sourcePath);
    const article = normalizeArticleMeta(attributes, slug, sourcePath);
    if (article.draft) {
      removals.push(
        path.join(articleDir, "index.html"),
        path.join(articleDir, "article-entry.js")
      );
      continue;
    }

    const theme = await loadTheme(article.theme);
    const registry = new ComponentRegistry({ root: ROOT, articleDir, theme, articleSlug: slug });
    const rendered = await renderMarkdown(body, { registry });
    const themeModule = await import(
      `${pathToFileURL(path.join(THEMES_DIR, theme.id, "index.mjs")).href}?v=${Date.now()}`
    );
    if (typeof themeModule.renderPage !== "function") {
      throw new Error(`Theme "${theme.id}" must export renderPage().`);
    }

    const html = themeModule.renderPage({
      article,
      contentHtml: rendered.html,
      appendixSections: rendered.appendixSections,
      footnotesHtml: rendered.footnotesHtml,
      referencesHtml: rendered.referencesHtml,
      components: rendered.components,
      theme,
    });
    const entry = renderArticleEntry(rendered.components);
    outputs.push(
      { filePath: path.join(articleDir, "index.html"), content: html },
      { filePath: path.join(articleDir, "article-entry.js"), content: entry }
    );
    posts.push(toPostEntry(article));
  }

  posts.sort((a, b) => {
    const dateDiff = Date.parse(b.date) - Date.parse(a.date);
    return dateDiff || a.slug.localeCompare(b.slug);
  });
  outputs.push({ filePath: path.join(ROOT, "index.html"), content: renderHomePage(posts) });

  const changed = [];
  for (const output of outputs) {
    const current = await readIfExists(output.filePath);
    if (current === output.content) continue;
    changed.push(path.relative(ROOT, output.filePath));
    if (!check) await fs.writeFile(output.filePath, output.content, "utf8");
  }

  for (const filePath of removals) {
    if (!(await exists(filePath))) continue;
    changed.push(path.relative(ROOT, filePath));
    if (!check) await fs.rm(filePath, { force: true });
  }

  if (check && changed.length > 0) {
    throw new Error(`Generated content is stale:\n${changed.map((item) => `- ${item}`).join("\n")}`);
  }
  if (!quiet) {
    const verb = check ? "Validated" : "Built";
    console.log(`${verb} ${posts.length} article(s)${changed.length ? `; updated ${changed.length} file(s)` : ""}.`);
  }
  return { posts, changed };
}

async function loadTheme(themeId) {
  assertSafeName(themeId, "Theme id");
  const directory = path.join(THEMES_DIR, themeId);
  const manifestPath = path.join(directory, "theme.yaml");
  const [source] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.access(path.join(directory, "index.mjs")),
    fs.access(path.join(directory, "style.css")),
    fs.access(path.join(directory, "README.md")),
  ]).catch((error) => {
    throw new Error(`Theme "${themeId}" is incomplete: ${error.message}`);
  });
  const manifest = parseYaml(source) ?? {};
  if (manifest.id !== themeId) {
    throw new Error(`${manifestPath}: id "${manifest.id}" does not match directory "${themeId}".`);
  }
  return {
    ...manifest,
    capabilities: Array.isArray(manifest.capabilities) ? manifest.capabilities : [],
  };
}

async function validateComponentDirectory(directory, scope) {
  if (!(await exists(directory))) return;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    assertSafeName(entry.name, `${scope} component directory`);
    const componentDir = path.join(directory, entry.name);
    const manifestPath = path.join(componentDir, "component.yaml");
    const [manifestSource] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.access(path.join(componentDir, "index.mjs")),
      fs.access(path.join(componentDir, "README.md")),
    ]).catch((error) => {
      throw new Error(`${scope} component "${entry.name}" is incomplete: ${error.message}`);
    });
    const manifest = parseYaml(manifestSource) ?? {};
    if (manifest.name !== entry.name || manifest.scope !== scope) {
      throw new Error(
        `${manifestPath}: expected name "${entry.name}" and scope "${scope}".`
      );
    }
  }
}

function renderArticleEntry(components) {
  const clients = components.filter((component) => component.clientHref);
  const imports = clients.map((component, index) =>
    `import { hydrate as hydrate${index} } from ${JSON.stringify(component.clientHref)};`
  );
  const calls = clients.map((component, index) =>
    `hydrateComponent(${JSON.stringify(component.reference)}, hydrate${index});`
  );
  return [
    `import "../../core/client/article-runtime.js";`,
    clients.length ? `import { hydrateComponent } from "../../core/client/component-runtime.js";` : "",
    ...imports,
    "",
    ...calls,
    "",
  ].filter((line, index, lines) => line || index === lines.length - 1).join("\n");
}

function toPostEntry(article) {
  const image = article.image.startsWith("./")
    ? `articles/${article.slug}/${article.image.slice(2)}`
    : article.image;
  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    author: article.author,
    date: article.date,
    category: article.category,
    image,
    theme: article.theme,
    href: `articles/${article.slug}/`,
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  buildContent({ check: process.argv.includes("--check") }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
