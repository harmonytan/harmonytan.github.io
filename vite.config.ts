import path from "node:path";
import {
  loadEnv,
  normalizePath,
  type ConfigEnv,
  type Plugin,
  type UserConfig,
} from "vite";
import { createWorkbenchMiddleware } from "./core/workbench/server.ts";
import { renderHomePage } from "./core/build/home.ts";
import { requirePrivateArticlesDir } from "./core/private-content.ts";
import { buildContent } from "./tools/build-content.ts";
import type { DraftPreview } from "./tools/build-content.ts";

const root = process.cwd();

export default async function config({
  command,
  mode,
}: ConfigEnv): Promise<UserConfig> {
  const privateMode = command === "serve" && mode === "private";
  const previewDrafts = privateMode;
  const env = loadEnv(mode, root, "");
  const privateArticlesDir = privateMode
    ? await requirePrivateArticlesDir(root, env.BLOG_PRIVATE_ARTICLES_DIR)
    : undefined;
  const initialBuild = await buildContent({
    quiet: true,
    includeDrafts: previewDrafts,
    ...(privateArticlesDir ? { privateArticlesDir } : {}),
  });
  let draftPreviews = initialBuild.draftPreviews;
  let privatePreviews = initialBuild.privatePreviews;
  let privateHomeHtml = privateMode
    ? renderHomePage(initialBuild.previewPosts, { localPreview: true })
    : "";

  const articlePages = initialBuild.posts
    .map((post) => path.join(root, "articles", post.slug, "index.html"));
  const inputs = [
    path.join(root, "index.html"),
    ...articlePages,
  ];

  const articleContentPlugin: Plugin = {
    name: "article-content",
    configureServer(server) {
      server.middlewares.use(createWorkbenchMiddleware(root, {
        privateArticlesDir,
      }));

      server.middlewares.use(async (request, response, next) => {
        if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
          next();
          return;
        }

        const match = matchPreviewRequest(request.url);
        const pathname = new URL(
          request.url ?? "/",
          "http://vite.local"
        ).pathname;
        if (
          privateMode
          && (pathname === "/" || pathname === "/index.html")
        ) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(
            request.method === "HEAD"
              ? undefined
              : injectViteClient(privateHomeHtml)
          );
          return;
        }
        const preview = match?.scope === "private"
          ? privatePreviews.get(match.slug)
          : match
            ? draftPreviews.get(match.slug)
            : undefined;
        if (!match || !preview) {
          next();
          return;
        }

        try {
          if (match.type === "asset") {
            const assetPath = resolvePreviewAsset(
              preview.articleDir,
              match.relativePath
            );
            const requestUrl = new URL(
              request.url ?? "/",
              "http://vite.local"
            );
            request.url = `/@fs/${normalizePath(assetPath)}${requestUrl.search}`;
            next();
            return;
          }

          const content = match.type === "html"
            ? injectViteClient(preview.html)
            : preview.entry;
          response.statusCode = 200;
          response.setHeader(
            "Content-Type",
            match.type === "html"
              ? "text/html; charset=utf-8"
              : "text/javascript; charset=utf-8"
          );
          response.setHeader("Cache-Control", "no-store");
          response.end(request.method === "HEAD" ? undefined : content);
        } catch (error) {
          next(error);
        }
      });

      const watchedRoots = ["articles", "components", "themes", "core/build"]
        .map((directory) => path.join(root, directory));
      if (privateArticlesDir) watchedRoots.push(privateArticlesDir);
      server.watcher.add(watchedRoots);

      const watchedEvents: WatchEvent[] = [
        "add",
        "change",
        "unlink",
        "addDir",
        "unlinkDir",
      ];
      let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
      let rebuilding = false;
      let rebuildQueued = false;

      const rebuild = async () => {
        if (rebuilding) {
          rebuildQueued = true;
          return;
        }
        rebuilding = true;
        do {
          rebuildQueued = false;
          try {
            const result = await buildContent({
              quiet: true,
              includeDrafts: true,
              ...(privateArticlesDir ? { privateArticlesDir } : {}),
            });
            const previewsChanged = !previewMapsEqual(
              draftPreviews,
              result.draftPreviews
            ) || !previewMapsEqual(
              privatePreviews,
              result.privatePreviews
            );
            const nextPrivateHomeHtml = privateMode
              ? renderHomePage(result.previewPosts, { localPreview: true })
              : "";
            const homeChanged = nextPrivateHomeHtml !== privateHomeHtml;
            draftPreviews = result.draftPreviews;
            privatePreviews = result.privatePreviews;
            privateHomeHtml = nextPrivateHomeHtml;
            if (result.changed.length > 0 || previewsChanged || homeChanged) {
              server.ws.send({ type: "full-reload", path: "*" });
            }
          } catch (error: unknown) {
            server.config.logger.error(errorStack(error));
          }
        } while (rebuildQueued);
        rebuilding = false;
      };

      const scheduleRebuild = (event: string, file: string): void => {
        if (!shouldRebuild(file, event)) return;
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => void rebuild(), 75);
      };

      const listeners: Array<[WatchEvent, (file: string) => void]> =
        watchedEvents.map((event) => {
          const listener = (file: string) => scheduleRebuild(event, file);
          server.watcher.on(event, listener);
          return [event, listener] as [WatchEvent, (file: string) => void];
        });

      server.httpServer?.once("close", () => {
        clearTimeout(rebuildTimer);
        for (const [event, listener] of listeners) {
          server.watcher.off(event, listener);
        }
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
    },
  };

  return {
    base: "./",
    appType: "mpa",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: inputs,
      },
    },
    server: {
      port: privateMode ? 5174 : 5173,
      strictPort: true,
      ...(privateArticlesDir
        ? {
          fs: {
            allow: [root, privateArticlesDir],
          },
        }
        : {}),
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    plugins: [articleContentPlugin],
  };
}

type WatchEvent = "add" | "change" | "unlink" | "addDir" | "unlinkDir";

function shouldRebuild(file: string, event: string): boolean {
  const normalized = file.split(path.sep).join("/");
  if (normalized.endsWith("/index.md")) return true;
  if (
    (event === "addDir" || event === "unlinkDir")
    && /\/articles\/[^/]+$/.test(normalized)
  ) return true;
  if (/\/(components|themes)\/.*\.(ts|css|ya?ml|md)$/.test(normalized)) {
    return true;
  }
  return (
    normalized.includes("/core/build/")
    && normalized.endsWith(".ts")
  );
}

interface PreviewRequest {
  scope: "draft" | "private";
  slug: string;
  type: "asset" | "entry" | "html";
  pathname: string;
  relativePath: string;
}

function matchPreviewRequest(
  requestUrl: string | undefined
): PreviewRequest | null {
  if (!requestUrl) return null;
  const pathname = new URL(requestUrl, "http://vite.local").pathname;
  const draftEntryMatch = pathname.match(
    /^\/articles\/([a-z0-9][a-z0-9-]*)\/article-entry\.ts$/
  );
  if (draftEntryMatch) {
    return {
      scope: "draft",
      slug: draftEntryMatch[1],
      type: "entry",
      pathname,
      relativePath: "",
    };
  }

  const draftHtmlMatch = pathname.match(
    /^\/articles\/([a-z0-9][a-z0-9-]*)(?:\/index\.html|\/)?$/
  );
  if (draftHtmlMatch) {
    return {
      scope: "draft",
      slug: draftHtmlMatch[1],
      type: "html",
      pathname,
      relativePath: "",
    };
  }

  const privateMatch = pathname.match(
    /^\/__private\/articles\/([a-z0-9][a-z0-9-]*)(?:\/(.*))?$/
  );
  if (!privateMatch) return null;
  const relativePath = privateMatch[2] ?? "";
  if (!relativePath || relativePath === "index.html") {
    return {
      scope: "private",
      slug: privateMatch[1],
      type: "html",
      pathname,
      relativePath: "",
    };
  }
  if (relativePath === "article-entry.ts") {
    return {
      scope: "private",
      slug: privateMatch[1],
      type: "entry",
      pathname,
      relativePath: "",
    };
  }
  return {
    scope: "private",
    slug: privateMatch[1],
    type: "asset",
    pathname,
    relativePath,
  };
}

function previewMapsEqual(
  left: Map<string, DraftPreview>,
  right: Map<string, DraftPreview>
): boolean {
  if (left.size !== right.size) return false;
  for (const [slug, preview] of left) {
    const next = right.get(slug);
    if (!next || next.html !== preview.html || next.entry !== preview.entry) {
      return false;
    }
  }
  return true;
}

function resolvePreviewAsset(articleDir: string, relativePath: string): string {
  const decoded = decodeURIComponent(relativePath);
  if (!/^(?:assets|components)\//.test(decoded)) {
    throw new Error(
      "Private preview requests may only read article assets and components."
    );
  }
  const resolved = path.resolve(articleDir, decoded);
  const rootWithSeparator = `${path.resolve(articleDir)}${path.sep}`;
  if (!resolved.startsWith(rootWithSeparator)) {
    throw new Error("Private preview asset path escapes the article directory.");
  }
  return resolved;
}

function injectViteClient(html: string): string {
  const client = '  <script type="module" src="/@vite/client"></script>\n';
  return html.includes("</head>")
    ? html.replace("</head>", `${client}</head>`)
    : `${client}${html}`;
}

function errorStack(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}
