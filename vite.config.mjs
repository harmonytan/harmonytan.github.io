import path from "node:path";
import { defineConfig } from "vite";
import { buildContent } from "./tools/build-content.mjs";

const root = process.cwd();

export default defineConfig(async ({ command }) => {
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
    plugins: [
      {
        name: "article-content",
        configureServer(server) {
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

          const watchedEvents = ["add", "change", "unlink", "addDir", "unlinkDir"];
          let rebuildTimer;
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
              } catch (error) {
                server.config.logger.error(error.stack ?? error.message);
              }
            } while (rebuildQueued);
            rebuilding = false;
          };

          const scheduleRebuild = (event, file) => {
            if (!shouldRebuild(file, event)) return;
            clearTimeout(rebuildTimer);
            rebuildTimer = setTimeout(() => void rebuild(), 75);
          };

          const listeners = watchedEvents.map((event) => {
            const listener = (file) => scheduleRebuild(event, file);
            server.watcher.on(event, listener);
            return [event, listener];
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
      },
    ],
  };
});

function shouldRebuild(file, event) {
  const normalized = file.split(path.sep).join("/");
  if (normalized.endsWith("/index.md")) return true;
  if (
    (event === "addDir" || event === "unlinkDir")
    && /\/articles\/[^/]+$/.test(normalized)
  ) return true;
  if (/\/(components|themes)\/.*\.(mjs|js|css|ya?ml|md)$/.test(normalized)) {
    return true;
  }
  return normalized.includes("/core/build/") && normalized.endsWith(".mjs");
}

function matchDraftRequest(requestUrl) {
  if (!requestUrl) return null;
  const pathname = new URL(requestUrl, "http://vite.local").pathname;
  const entryMatch = pathname.match(
    /^\/articles\/([a-z0-9][a-z0-9-]*)\/article-entry\.js$/
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

function draftPreviewMapsEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const [slug, preview] of left) {
    const next = right.get(slug);
    if (!next || next.html !== preview.html || next.entry !== preview.entry) {
      return false;
    }
  }
  return true;
}

function injectViteClient(html) {
  const client = '  <script type="module" src="/@vite/client"></script>\n';
  return html.includes("</head>")
    ? html.replace("</head>", `${client}</head>`)
    : `${client}${html}`;
}
