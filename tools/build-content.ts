#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { ComponentRegistry } from "../core/build/components.ts";
import type {
  ComponentAsset,
  ThemeManifest,
} from "../core/build/components.ts";
import type { ComponentScope } from "../core/build/component-contract.ts";
import { validateComponentManifest } from "../core/build/component-contract.ts";
import { parseArticleSource, normalizeArticleMeta } from "../core/build/frontmatter.ts";
import type { ArticleMeta } from "../core/build/frontmatter.ts";
import { renderMarkdown } from "../core/build/markdown.ts";
import { renderHomePage } from "../core/build/home.ts";
import type { PostEntry } from "../core/build/home.ts";
import type { ArticleRenderContext } from "../core/build/template.ts";
import { assertSafeName } from "../core/build/utils.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface DraftPreview {
  html: string;
  entry: string;
}

export interface BuildContentOptions {
  check?: boolean;
  quiet?: boolean;
  includeDrafts?: boolean;
  root?: string;
}

export interface BuildContentResult {
  posts: PostEntry[];
  changed: string[];
  draftPreviews: Map<string, DraftPreview>;
}

interface GeneratedOutput {
  filePath: string;
  content: string;
}

interface ThemeModule {
  renderPage: (context: ArticleRenderContext) => string | Promise<string>;
}

export async function buildContent({
  check = false,
  quiet = false,
  includeDrafts = false,
  root = ROOT,
}: BuildContentOptions = {}): Promise<BuildContentResult> {
  const articlesDir = path.join(root, "articles");
  const themesDir = path.join(root, "themes");
  const articleEntries = await fs.readdir(articlesDir, { withFileTypes: true });
  const slugs = articleEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
  const outputs: GeneratedOutput[] = [];
  const removals: string[] = [];
  const posts: PostEntry[] = [];
  const draftPreviews = new Map<string, DraftPreview>();

  await validateComponentDirectory(path.join(root, "components"), "shared");

  for (const slug of slugs) {
    assertSafeName(slug, "Article slug");
    const articleDir = path.join(articlesDir, slug);
    const sourcePath = path.join(articleDir, "index.md");
    if (!(await exists(sourcePath))) {
      removals.push(
        path.join(articleDir, "index.html"),
        path.join(articleDir, "article-entry.ts"),
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
        path.join(articleDir, "article-entry.ts"),
        path.join(articleDir, "article-entry.js")
      );
      if (!includeDrafts) continue;
    }

    const theme = await loadTheme(article.theme, themesDir);
    const registry = new ComponentRegistry({ root, articleDir, theme, articleSlug: slug });
    const rendered = await renderMarkdown(body, { registry });
    const imported: Partial<ThemeModule> = await import(
      `${pathToFileURL(path.join(themesDir, theme.id, "index.ts")).href}?v=${Date.now()}`
    );
    if (typeof imported.renderPage !== "function") {
      throw new Error(`Theme "${theme.id}" must export renderPage().`);
    }

    const themeModule = imported as ThemeModule;
    const html = await themeModule.renderPage({
      article,
      contentHtml: rendered.html,
      appendixSections: rendered.appendixSections,
      footnotesHtml: rendered.footnotesHtml,
      referencesHtml: rendered.referencesHtml,
      components: rendered.components,
      theme,
    });
    const entry = renderArticleEntry(rendered.components);
    if (article.draft) {
      draftPreviews.set(slug, { html, entry });
      continue;
    }
    outputs.push(
      { filePath: path.join(articleDir, "index.html"), content: html },
      { filePath: path.join(articleDir, "article-entry.ts"), content: entry }
    );
    removals.push(path.join(articleDir, "article-entry.js"));
    posts.push(toPostEntry(article));
  }

  posts.sort((a, b) => {
    const dateDiff = Date.parse(b.date) - Date.parse(a.date);
    return dateDiff || a.slug.localeCompare(b.slug);
  });
  outputs.push({ filePath: path.join(root, "index.html"), content: renderHomePage(posts) });

  const changed = [];
  for (const output of outputs) {
    const current = await readIfExists(output.filePath);
    if (current === output.content) continue;
    changed.push(path.relative(root, output.filePath));
    if (!check) await fs.writeFile(output.filePath, output.content, "utf8");
  }

  for (const filePath of removals) {
    if (!(await exists(filePath))) continue;
    changed.push(path.relative(root, filePath));
    if (!check) await fs.rm(filePath, { force: true });
  }

  if (check && changed.length > 0) {
    throw new Error(`Generated content is stale:\n${changed.map((item) => `- ${item}`).join("\n")}`);
  }
  if (!quiet) {
    const verb = check ? "Validated" : "Built";
    const draftMessage = includeDrafts && draftPreviews.size
      ? `; prepared ${draftPreviews.size} draft preview(s)`
      : "";
    console.log(
      `${verb} ${posts.length} article(s)${draftMessage}${changed.length ? `; updated ${changed.length} file(s)` : ""}.`
    );
  }
  return { posts, changed, draftPreviews };
}

async function loadTheme(
  themeId: string,
  themesDir: string
): Promise<ThemeManifest> {
  assertSafeName(themeId, "Theme id");
  const directory = path.join(themesDir, themeId);
  const manifestPath = path.join(directory, "theme.yaml");
  const [source] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.access(path.join(directory, "index.ts")),
    fs.access(path.join(directory, "style.css")),
    fs.access(path.join(directory, "README.md")),
  ]).catch((error: unknown) => {
    throw new Error(`Theme "${themeId}" is incomplete: ${errorMessage(error)}`);
  });
  const manifest: unknown = parseYaml(source) ?? {};
  if (!isRecord(manifest)) {
    throw new Error(`${manifestPath}: theme manifest must be a YAML object.`);
  }
  if (manifest.id !== themeId) {
    throw new Error(`${manifestPath}: id "${manifest.id}" does not match directory "${themeId}".`);
  }
  return {
    ...manifest,
    id: themeId,
    capabilities: Array.isArray(manifest.capabilities)
      ? manifest.capabilities.map(String)
      : [],
  };
}

async function validateComponentDirectory(
  directory: string,
  scope: ComponentScope
): Promise<void> {
  if (!(await exists(directory))) return;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    assertSafeName(entry.name, `${scope} component directory`);
    const componentDir = path.join(directory, entry.name);
    const manifestPath = path.join(componentDir, "component.yaml");
    const [manifestSource] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.access(path.join(componentDir, "index.ts")),
      fs.access(path.join(componentDir, "README.md")),
    ]).catch((error: unknown) => {
      throw new Error(
        `${scope} component "${entry.name}" is incomplete: ${errorMessage(error)}`
      );
    });
    validateComponentManifest(parseYaml(manifestSource), {
      manifestPath,
      expectedName: entry.name,
      expectedScope: scope,
    });
  }
}

function renderArticleEntry(components: ComponentAsset[]): string {
  const clients = components.filter((component) => component.clientHref);
  const imports = clients.map((component, index) =>
    `import { hydrate as hydrate${index} } from ${JSON.stringify(component.clientHref)};`
  );
  const calls = clients.map((component, index) =>
    `hydrateComponent(${JSON.stringify(component.reference)}, hydrate${index});`
  );
  return [
    `import "../../core/client/article-runtime.ts";`,
    clients.length ? `import { hydrateComponent } from "../../core/client/component-runtime.ts";` : "",
    ...imports,
    "",
    ...calls,
    "",
  ].filter((line, index, lines) => line || index === lines.length - 1).join("\n");
}

function toPostEntry(article: ArticleMeta): PostEntry {
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  buildContent({ check: process.argv.includes("--check") }).catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
