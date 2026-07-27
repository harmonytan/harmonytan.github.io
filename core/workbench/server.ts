import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { parse as parseYaml } from "yaml";
import {
  validateComponentManifest,
} from "../build/component-contract.ts";
import type {
  ComponentScope,
} from "../build/component-contract.ts";
import {
  ComponentRegistry,
} from "../build/components.ts";
import type {
  ComponentAsset,
} from "../build/components.ts";
import {
  normalizeArticleMeta,
  parseArticleSource,
} from "../build/frontmatter.ts";
import type {
  ArticleVisibility,
} from "../build/frontmatter.ts";
import { renderMarkdown } from "../build/markdown.ts";
import { escapeAttribute, escapeHtml } from "../build/utils.ts";
import {
  privateArticleKey,
  publicArticleKey,
} from "../private-content.ts";
import { loadTheme } from "../../tools/build-content.ts";
import type {
  WorkbenchArticle,
  WorkbenchCatalog,
  WorkbenchComponent,
  WorkbenchExample,
  WorkbenchRenderRequest,
  WorkbenchRenderResponse,
  WorkbenchTheme,
} from "./types.ts";

const WORKBENCH_PATH = "/__workbench/";
const MAX_REQUEST_BYTES = 256_000;

interface WorkbenchOptions {
  privateArticlesDir?: string;
}

interface WorkbenchArticleLocation extends WorkbenchArticle {
  articleDir: string;
}

export function createWorkbenchMiddleware(
  root: string,
  options: WorkbenchOptions = {}
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void
  ): Promise<void> => {
    const pathname = new URL(
      request.url ?? "/",
      "http://workbench.local"
    ).pathname;

    try {
      if (
        (pathname === "/__workbench" || pathname === WORKBENCH_PATH)
        && ["GET", "HEAD"].includes(request.method ?? "GET")
      ) {
        send(
          response,
          200,
          "text/html; charset=utf-8",
          request.method === "HEAD" ? "" : renderWorkbenchPage()
        );
        return;
      }

      if (
        pathname === "/__workbench/api/catalog"
        && request.method === "GET"
      ) {
        sendJson(response, 200, await createWorkbenchCatalog(root, options));
        return;
      }

      if (
        pathname === "/__workbench/api/render"
        && request.method === "POST"
      ) {
        const payload = await readJsonBody(request);
        sendJson(
          response,
          200,
          await renderWorkbenchPreview(root, payload, options)
        );
        return;
      }

      next();
    } catch (error) {
      if (pathname.startsWith("/__workbench/api/")) {
        sendJson(response, 400, { error: errorMessage(error) });
        return;
      }
      next(error);
    }
  };
}

export async function createWorkbenchCatalog(
  root: string,
  { privateArticlesDir }: WorkbenchOptions = {}
): Promise<WorkbenchCatalog> {
  const [themes, articleLocations, sharedComponents] = await Promise.all([
    discoverThemes(root),
    discoverArticles(root, privateArticlesDir),
    discoverComponents(path.join(root, "components"), "shared"),
  ]);
  const localGroups = await Promise.all(
    articleLocations.map((article) =>
      discoverComponents(
        path.join(article.articleDir, "components"),
        "local",
        article.slug,
        article.key
      )
    )
  );

  return {
    themes,
    articles: articleLocations.map(({ articleDir: _articleDir, ...article }) =>
      article
    ),
    components: [
      ...sharedComponents,
      ...localGroups.flat(),
    ].sort((left, right) =>
      left.scope.localeCompare(right.scope)
      || (left.ownerArticle ?? "").localeCompare(right.ownerArticle ?? "")
      || left.name.localeCompare(right.name)
    ),
  };
}

export async function renderWorkbenchPreview(
  root: string,
  source: unknown,
  { privateArticlesDir }: WorkbenchOptions = {}
): Promise<WorkbenchRenderResponse> {
  const request = normalizeRenderRequest(source);
  const [catalog, articleLocations] = await Promise.all([
    createWorkbenchCatalog(root, { privateArticlesDir }),
    discoverArticles(root, privateArticlesDir),
  ]);
  const component = catalog.components.find(
    (item) => item.key === request.componentKey
  );
  if (!component) {
    throw new Error(`Unknown component "${request.componentKey}".`);
  }
  if (
    component.scope === "local"
    && component.ownerArticleKey !== request.articleKey
  ) {
    throw new Error(
      `Private component "${component.reference}" belongs to article "${component.ownerArticle}".`
    );
  }

  const theme = await loadTheme(request.theme, path.join(root, "themes"));
  const articleLocation = request.articleKey
    ? articleLocations.find((article) => article.key === request.articleKey)
    : undefined;
  if (request.articleKey && !articleLocation) {
    throw new Error(`Unknown article context "${request.articleKey}".`);
  }
  const articleSlug = articleLocation?.slug ?? "component-workbench";
  const articleDir = articleLocation?.articleDir ?? path.join(root, "articles");
  const registry = new ComponentRegistry({
    root,
    articleDir,
    theme,
    articleSlug,
  });
  const body = await renderMarkdown(request.body, { registry });
  const componentHtml = await registry.render(
    component.reference,
    request.props,
    body.html
  );
  const assets = registry.getAssets();

  return {
    document: renderPreviewDocument({
      themeId: theme.id,
      article: articleLocation,
      componentHtml,
      assets,
    }),
    markdown: serializeComponentMarkdown(
      component.reference,
      request.props,
      request.body
    ),
  };
}

async function discoverThemes(root: string): Promise<WorkbenchTheme[]> {
  const themesDir = path.join(root, "themes");
  const entries = await readDirectories(themesDir);
  const themes = await Promise.all(entries.map(async (id) => {
    const manifest = await loadTheme(id, themesDir);
    return {
      id,
      label: typeof manifest.label === "string" ? manifest.label : id,
      capabilities: manifest.capabilities,
    };
  }));
  return themes.sort((left, right) => left.label.localeCompare(right.label));
}

async function discoverArticles(
  root: string,
  privateArticlesDir?: string
): Promise<WorkbenchArticleLocation[]> {
  const articlesDir = path.join(root, "articles");
  const articles = await discoverArticlesInDirectory(
    articlesDir,
    "public"
  );
  if (privateArticlesDir) {
    articles.push(
      ...await discoverArticlesInDirectory(privateArticlesDir, "private")
    );
  }
  return articles.sort((left, right) =>
    visibilityOrder(left.visibility) - visibilityOrder(right.visibility)
    || left.title.localeCompare(right.title)
  );
}

async function discoverArticlesInDirectory(
  articlesDir: string,
  repository: "public" | "private"
): Promise<WorkbenchArticleLocation[]> {
  const slugs = await readDirectories(articlesDir);
  const articles: WorkbenchArticleLocation[] = [];
  for (const slug of slugs) {
    const sourcePath = path.join(articlesDir, slug, "index.md");
    if (!(await exists(sourcePath))) continue;
    const markdownSource = await fs.readFile(sourcePath, "utf8");
    const parsed = parseArticleSource(markdownSource, sourcePath);
    const article = normalizeArticleMeta(parsed.attributes, slug, sourcePath);
    if (repository === "public" && article.visibility === "private") {
      throw new Error(
        `${sourcePath}: private articles must live outside the public articles directory.`
      );
    }
    if (repository === "private" && article.visibility !== "private") {
      throw new Error(
        `${sourcePath}: private repository articles must declare visibility: private.`
      );
    }
    articles.push({
      key: repository === "private"
        ? privateArticleKey(slug)
        : publicArticleKey(slug),
      slug,
      title: article.title,
      theme: article.theme,
      visibility: article.visibility,
      articleDir: path.join(articlesDir, slug),
    });
  }
  return articles;
}

async function discoverComponents(
  directory: string,
  scope: ComponentScope,
  ownerArticle?: string,
  ownerArticleKey?: string
): Promise<WorkbenchComponent[]> {
  if (!(await exists(directory))) return [];
  const names = await readDirectories(directory);
  return Promise.all(names.map(async (name) => {
    const componentDir = path.join(directory, name);
    const manifestPath = path.join(componentDir, "component.yaml");
    const [manifestSource, readme, examples] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.readFile(path.join(componentDir, "README.md"), "utf8"),
      discoverExamples(path.join(componentDir, "examples")),
      fs.access(path.join(componentDir, "index.ts")),
    ]);
    const manifest = validateComponentManifest(parseYaml(manifestSource), {
      manifestPath,
      expectedName: name,
      expectedScope: scope,
    });
    const reference = `${scope}.${manifest.name}`;
    return {
      key: ownerArticleKey ? `${ownerArticleKey}::${reference}` : reference,
      reference,
      name: manifest.name,
      scope,
      ...(ownerArticle ? { ownerArticle } : {}),
      ...(ownerArticleKey ? { ownerArticleKey } : {}),
      description: manifest.description,
      requires: manifest.requires,
      ...(manifest.themes ? { themes: manifest.themes } : {}),
      props: manifest.props,
      readme,
      examples,
    };
  }));
}

async function discoverExamples(directory: string): Promise<WorkbenchExample[]> {
  if (!(await exists(directory))) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(files.map(async (file) => {
    const source = await fs.readFile(path.join(directory, file), "utf8");
    const parsed = parseExample(source);
    return {
      name: file.replace(/\.md$/, ""),
      source,
      props: parsed.props,
      body: parsed.body,
    };
  }));
}

function parseExample(source: string): {
  props: Record<string, string>;
  body: string;
} {
  const match = source.match(
    /:::component\{([^}]*)\}\s*\n([\s\S]*?)\n:::\s*(?:\n|$)/
  );
  if (!match) return { props: {}, body: source.trim() };
  const attributes: Record<string, string> = {};
  const pattern = /([a-zA-Z][\w-]*)="([^"]*)"/g;
  let attribute;
  while ((attribute = pattern.exec(match[1]))) {
    if (attribute[1] !== "name") attributes[attribute[1]] = attribute[2];
  }
  return { props: attributes, body: match[2].trim() };
}

function normalizeRenderRequest(source: unknown): WorkbenchRenderRequest {
  if (!isRecord(source)) throw new Error("Render request must be a JSON object.");
  const theme = requireString(source.theme, "theme");
  const componentKey = requireString(source.componentKey, "componentKey");
  const articleKey = typeof source.articleKey === "string" && source.articleKey
    ? source.articleKey
    : undefined;
  if (!isRecord(source.props)) {
    throw new Error("props must be a JSON object.");
  }
  if (typeof source.body !== "string") {
    throw new Error("body must be a string.");
  }
  return {
    theme,
    componentKey,
    ...(articleKey ? { articleKey } : {}),
    props: source.props,
    body: source.body,
  };
}

function renderPreviewDocument({
  themeId,
  article,
  componentHtml,
  assets,
}: {
  themeId: string;
  article?: WorkbenchArticleLocation;
  componentHtml: string;
  assets: ComponentAsset[];
}): string {
  const styles = assets
    .filter((asset) => asset.styleHref)
    .map((asset) =>
      `<link rel="stylesheet" href="${escapeAttribute(
        componentAssetPath(asset.reference, "style.css", article)
      )}">`
    )
    .join("\n");
  const clientAssets = assets.filter((asset) => asset.clientHref);
  const hydration = clientAssets.length > 0
    ? `<script type="module">
import { hydrateComponent } from "/core/client/component-runtime.ts";
${clientAssets.map((asset, index) =>
    `import { hydrate as hydrate${index} } from ${JSON.stringify(
      componentAssetPath(asset.reference, "client.ts", article)
    )};`
  ).join("\n")}
${clientAssets.map((asset, index) =>
    `hydrateComponent(${JSON.stringify(asset.reference)}, hydrate${index});`
  ).join("\n")}
</script>`
    : "";

  return `<!doctype html>
<html lang="en" data-color-theme="light" data-article-theme="${escapeAttribute(themeId)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/themes/base.css">
  <link rel="stylesheet" href="/themes/${escapeAttribute(themeId)}/style.css">
  ${styles}
  <style>
    body { min-height: 100vh; }
    .workbench-preview-stage { padding: clamp(32px, 7vw, 88px) 0; }
  </style>
</head>
<body class="article-page theme-${escapeAttribute(themeId)}">
  <main class="article-layout">
    <article class="article-shell">
      <div class="article-content workbench-preview-stage">${componentHtml}</div>
    </article>
  </main>
  ${hydration}
</body>
</html>`;
}

function componentAssetPath(
  reference: string,
  file: string,
  article?: WorkbenchArticleLocation
): string {
  const [, scope, name] = reference.match(
    /^(shared|local)\.([a-z0-9][a-z0-9-]*)$/
  ) ?? [];
  if (!scope || !name) {
    throw new Error(`Invalid component asset reference "${reference}".`);
  }
  if (scope === "shared") return `/components/${name}/${file}`;
  if (!article) {
    throw new Error(`Private component "${reference}" requires an article.`);
  }
  const prefix = article.visibility === "private"
    ? "/__private/articles"
    : "/articles";
  return `${prefix}/${article.slug}/components/${name}/${file}`;
}

function visibilityOrder(visibility: ArticleVisibility): number {
  return visibility === "public" ? 0 : visibility === "draft" ? 1 : 2;
}

function serializeComponentMarkdown(
  reference: string,
  props: Record<string, unknown>,
  body: string
): string {
  const attributes = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([name, value]) =>
      `${name}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    );
  const opening = [
    `name="${reference}"`,
    ...attributes,
  ].join(" ");
  return `:::component{${opening}}\n${body.trim()}\n:::`;
}

function renderWorkbenchPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Component Workbench · Hongming Tan</title>
  <link rel="stylesheet" href="/core/workbench/style.css">
</head>
<body>
  <div id="workbench-app">
    <main class="loading-shell" aria-live="polite">
      <img class="loading-mark" src="/favicon.svg" alt="" aria-hidden="true">
      <p>Loading component catalog…</p>
    </main>
  </div>
  <script type="module" src="/core/workbench/client.ts"></script>
</body>
</html>`;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new Error("Render request is too large.");
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Render request must contain valid JSON.");
  }
}

async function readDirectories(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "no-store");
  response.end(body);
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown
): void {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(value));
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
