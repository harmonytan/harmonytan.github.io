import path from "node:path";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { createWorkbenchMiddleware } from "./core/workbench/server.ts";
import { buildContent } from "./tools/build-content.ts";
import type { DraftPreview } from "./tools/build-content.ts";

const root = process.cwd();

export default async function config({
  command,
}: ConfigEnv): Promise<UserConfig> {
  const previewDrafts = command === "serve";
  const initialBuild = await buildContent({
    quiet: true,
    includeDrafts: previewDrafts,
  });
  let draftPreviews = initialBuild.draftPreviews;

  const articlePages = initialBuild.posts
    .map((post) => path.join(root, "articles", post.slug, "index.html"));
  const inputs = [
    path.join(root, "index.html"),
    ...articlePages,
  ];

  const articleContentPlugin: Plugin = {
        name: "article-content",
        configureServer(server) {
          server.middlewares.use(createWorkbenchMiddleware(root));

          server.middlewares.use(async (request, response, next) => {
            if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
              next();
              return;
            }

            const match = matchDraftRequest(request.url);
            const preview = match ? draftPreviews.get(match.slug) : undefined;
            if (!match || !preview) {
              next();
              return;
            }

            try {
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
                });
                const previewsChanged = !draftPreviewMapsEqual(
                  draftPreviews,
                  result.draftPreviews
                );
                draftPreviews = result.draftPreviews;
                if (result.changed.length > 0 || previewsChanged) {
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

interface DraftRequest {
  slug: string;
  type: "entry" | "html";
  pathname: string;
}

function matchDraftRequest(requestUrl: string | undefined): DraftRequest | null {
  if (!requestUrl) return null;
  const pathname = new URL(requestUrl, "http://vite.local").pathname;
  const entryMatch = pathname.match(
    /^\/articles\/([a-z0-9][a-z0-9-]*)\/article-entry\.ts$/
  );
  if (entryMatch) {
    return { slug: entryMatch[1], type: "entry", pathname };
  }

  const htmlMatch = pathname.match(
    /^\/articles\/([a-z0-9][a-z0-9-]*)(?:\/index\.html|\/)?$/
  );
  if (htmlMatch) {
    return { slug: htmlMatch[1], type: "html", pathname };
  }
  return null;
}

function draftPreviewMapsEqual(
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

function injectViteClient(html: string): string {
  const client = '  <script type="module" src="/@vite/client"></script>\n';
  return html.includes("</head>")
    ? html.replace("</head>", `${client}</head>`)
    : `${client}${html}`;
}

function errorStack(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}
