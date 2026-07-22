import path from "node:path";
import { defineConfig } from "vite";
import { buildContent } from "./tools/build-content.mjs";

const root = process.cwd();
const { posts: initialPosts } = await buildContent({ quiet: true });

const articlePages = initialPosts
  .map((post) => path.join(root, "articles", post.slug, "index.html"));
const inputs = [
  path.join(root, "index.html"),
  ...articlePages,
];

export default defineConfig({
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
              const { changed } = await buildContent({ quiet: true });
              if (changed.length > 0) {
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
});

function shouldRebuild(file, event) {
  const normalized = file.split(path.sep).join("/");
  if (normalized.endsWith("/index.md")) return true;
  if (
    (event === "addDir" || event === "unlinkDir")
    && /\/articles\/[^/]+$/.test(normalized)
  ) return true;
  if (/\/(components|themes)\/.*\.(mjs|js|css|ya?ml|md)$/.test(normalized)) return true;
  return normalized.includes("/core/build/") && normalized.endsWith(".mjs");
}
