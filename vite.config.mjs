import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";
import { buildContent } from "./tools/build-content.mjs";

const root = process.cwd();
await buildContent({ quiet: true });

const articleEntries = await fs.readdir(path.join(root, "articles"), { withFileTypes: true });
const articlePages = articleEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, "articles", entry.name, "index.html"));
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
        let rebuilding = false;
        server.watcher.on("change", async (file) => {
          if (rebuilding || !shouldRebuild(file)) return;
          rebuilding = true;
          try {
            await buildContent({ quiet: true });
            server.ws.send({ type: "full-reload", path: "*" });
          } catch (error) {
            server.config.logger.error(error.stack ?? error.message);
          } finally {
            rebuilding = false;
          }
        });
      },
      generateBundle() {
        this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
      },
    },
  ],
});

function shouldRebuild(file) {
  const normalized = file.split(path.sep).join("/");
  if (normalized.endsWith("/index.md")) return true;
  if (/\/(components|themes)\/.*\.(mjs|js|css|ya?ml|md)$/.test(normalized)) return true;
  return normalized.includes("/core/build/") && normalized.endsWith(".mjs");
}
