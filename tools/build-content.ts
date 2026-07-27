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
  articleDir: string;
  visibility: "draft" | "private";
}

export interface BuildContentOptions {
  check?: boolean;
  quiet?: boolean;
  includeDrafts?: boolean;
  privateArticlesDir?: string;
  root?: string;
}

export interface BuildContentResult {
  posts: PostEntry[];
  previewPosts: PostEntry[];
  changed: string[];
  draftPreviews: Map<string, DraftPreview>;
  privatePreviews: Map<string, DraftPreview>;
}

interface GeneratedOutput {
  filePath: string;
  content: string;
}

interface ThemeModule {
  renderPage: (context: ArticleRenderContext) => string | Promise<string>;
}

interface RenderArticleOptions {
  root: string;
  themesDir: string;
  articleDir: string;
  slug: string;
  prepared?: PreparedArticle;
  siteRootHref?: string;
  entryHref?: string;
  runtimeBase?: string;
  sharedPublicBase?: string;
}

interface PreparedArticle {
  article: ArticleMeta;
  body: string;
}

interface RenderedArticle {
  article: ArticleMeta;
  html: string;
  entry: string;
}

export async function buildContent({
  check = false,
  quiet = false,
  includeDrafts = false,
  privateArticlesDir,
  root = ROOT,
}: BuildContentOptions = {}): Promise<BuildContentResult> {
  const articlesDir = path.join(root, "articles");
  const themesDir = path.join(root, "themes");
  const slugs = await readArticleSlugs(articlesDir, true);
  const outputs: GeneratedOutput[] = [];
  const removals: string[] = [];
  const posts: PostEntry[] = [];
  const previewPosts: PostEntry[] = [];
  const draftPreviews = new Map<string, DraftPreview>();
  const privatePreviews = new Map<string, DraftPreview>();

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

    const prepared = await readArticle(articleDir, slug);
    const { article } = prepared;
    if (article.visibility === "private") {
      throw new Error(
        `${sourcePath}: private articles must live outside the public articles directory.`
      );
    }
    if (article.draft) {
      removals.push(
        path.join(articleDir, "index.html"),
        path.join(articleDir, "article-entry.ts"),
        path.join(articleDir, "article-entry.js")
      );
      if (!includeDrafts) continue;
    }

    const rendered = await renderArticle({
      root,
      themesDir,
      articleDir,
      slug,
      prepared,
    });

    if (article.draft) {
      draftPreviews.set(slug, {
        html: rendered.html,
        entry: rendered.entry,
        articleDir,
        visibility: "draft",
      });
      previewPosts.push(toPostEntry(article));
      continue;
    }
    outputs.push(
      { filePath: path.join(articleDir, "index.html"), content: rendered.html },
      { filePath: path.join(articleDir, "article-entry.ts"), content: rendered.entry }
    );
    removals.push(path.join(articleDir, "article-entry.js"));
    const post = toPostEntry(article);
    posts.push(post);
    previewPosts.push(post);
  }

  if (privateArticlesDir) {
    const privateSlugs = await readArticleSlugs(privateArticlesDir, true);
    for (const slug of privateSlugs) {
      assertSafeName(slug, "Private article slug");
      const articleDir = path.join(privateArticlesDir, slug);
      const sourcePath = path.join(articleDir, "index.md");
      if (!(await exists(sourcePath))) continue;
      await validateComponentDirectory(path.join(articleDir, "components"), "local");

      const rendered = await renderArticle({
        root,
        themesDir,
        articleDir,
        slug,
        siteRootHref: "/",
        entryHref: "./article-entry.ts",
        runtimeBase: "/core/client",
        sharedPublicBase: "/components",
      });
      if (rendered.article.visibility !== "private") {
        throw new Error(
          `${sourcePath}: articles in the private content repository must declare visibility: private.`
        );
      }
      privatePreviews.set(slug, {
        html: rendered.html,
        entry: rendered.entry,
        articleDir,
        visibility: "private",
      });
      previewPosts.push(toPostEntry(rendered.article, {
        href: `/__private/articles/${slug}/`,
        relativeImageBase: `/__private/articles/${slug}/`,
      }));
    }
  }

  const sortPosts = (left: PostEntry, right: PostEntry): number => {
    const dateDiff = Date.parse(right.date) - Date.parse(left.date);
    return dateDiff || left.slug.localeCompare(right.slug);
  };
  posts.sort(sortPosts);
  previewPosts.sort(sortPosts);
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
    const privateMessage = privatePreviews.size
      ? `; prepared ${privatePreviews.size} private preview(s)`
      : "";
    console.log(
      `${verb} ${posts.length} article(s)${draftMessage}${privateMessage}${changed.length ? `; updated ${changed.length} file(s)` : ""}.`
    );
  }
  return { posts, previewPosts, changed, draftPreviews, privatePreviews };
}

async function renderArticle({
  root,
  themesDir,
  articleDir,
  slug,
  prepared,
  siteRootHref,
  entryHref,
  runtimeBase = "../../core/client",
  sharedPublicBase,
}: RenderArticleOptions): Promise<RenderedArticle> {
  const { article, body } = prepared ?? await readArticle(articleDir, slug);
  const theme = await loadTheme(article.theme, themesDir);
  const registry = new ComponentRegistry({
    root,
    articleDir,
    theme,
    articleSlug: slug,
    ...(sharedPublicBase ? { sharedPublicBase } : {}),
  });
  const markdown = await renderMarkdown(body, { registry });
  const imported: Partial<ThemeModule> = await import(
    `${pathToFileURL(path.join(themesDir, theme.id, "index.ts")).href}?v=${Date.now()}`
  );
  if (typeof imported.renderPage !== "function") {
    throw new Error(`Theme "${theme.id}" must export renderPage().`);
  }

  const themeModule = imported as ThemeModule;
  const html = await themeModule.renderPage({
    article,
    contentHtml: markdown.html,
    appendixSections: markdown.appendixSections,
    footnotesHtml: markdown.footnotesHtml,
    referencesHtml: markdown.referencesHtml,
    components: markdown.components,
    theme,
    ...(siteRootHref ? { siteRootHref } : {}),
    ...(entryHref ? { entryHref } : {}),
  });
  return {
    article,
    html,
    entry: renderArticleEntry(markdown.components, runtimeBase),
  };
}

async function readArticle(
  articleDir: string,
  slug: string
): Promise<PreparedArticle> {
  const sourcePath = path.join(articleDir, "index.md");
  const source = await fs.readFile(sourcePath, "utf8");
  const { attributes, body } = parseArticleSource(source, sourcePath);
  return {
    article: normalizeArticleMeta(attributes, slug, sourcePath),
    body,
  };
}

export async function loadTheme(
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

function renderArticleEntry(
  components: ComponentAsset[],
  runtimeBase: string
): string {
  const clients = components.filter((component) => component.clientHref);
  const imports = clients.map((component, index) =>
    `import { hydrate as hydrate${index} } from ${JSON.stringify(component.clientHref)};`
  );
  const calls = clients.map((component, index) =>
    `hydrateComponent(${JSON.stringify(component.reference)}, hydrate${index});`
  );
  return [
    `import ${JSON.stringify(`${runtimeBase}/article-runtime.ts`)};`,
    clients.length
      ? `import { hydrateComponent } from ${JSON.stringify(`${runtimeBase}/component-runtime.ts`)};`
      : "",
    ...imports,
    "",
    ...calls,
    "",
  ].filter((line, index, lines) => line || index === lines.length - 1).join("\n");
}

async function readArticleSlugs(
  directory: string,
  required: boolean
): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (!required && isNodeError(error) && error.code === "ENOENT") return [];
    throw new Error(`Article directory is unavailable: ${directory}`);
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

function toPostEntry(
  article: ArticleMeta,
  {
    href = `articles/${article.slug}/`,
    relativeImageBase = `articles/${article.slug}/`,
  }: {
    href?: string;
    relativeImageBase?: string;
  } = {}
): PostEntry {
  const image = article.image.startsWith("./")
    ? `${relativeImageBase}${article.image.slice(2)}`
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
    href,
    visibility: article.visibility,
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
