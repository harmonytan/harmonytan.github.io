import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import { createArticle, parseArticleArgs } from "../tools/create-article.mjs";

test("parses required and optional article arguments", () => {
  assert.deepEqual(
    parseArticleArgs([
      "--theme=anthropic",
      "--title",
      "Evaluation Notes",
      "--publish",
    ]),
    {
      theme: "anthropic",
      title: "Evaluation Notes",
      publish: true,
    }
  );
});

test("creates a draft workspace with safe defaults", async () => {
  await withFixture(async (root) => {
    const result = await createArticle({
      root,
      argv: ["--theme", "anthropic"],
      now: new Date(2026, 6, 23),
    });
    const source = await fs.readFile(result.sourcePath, "utf8");
    const metadata = parseYaml(source.match(/^---\n([\s\S]*?)\n---/)[1]);

    assert.equal(result.slug, "draft-2026-07-23");
    assert.equal(metadata.title, "Untitled Article");
    assert.equal(String(metadata.date).slice(0, 10), "2026-07-23");
    assert.equal(metadata.theme, "anthropic");
    assert.equal(metadata.draft, true);
    await fs.access(path.join(result.articleDir, "assets", ".gitkeep"));
    await fs.access(path.join(result.articleDir, "components", ".gitkeep"));
  });
});

test("writes optional metadata and publishes only when requested", async () => {
  await withFixture(async (root) => {
    const result = await createArticle({
      root,
      argv: [
        "--theme",
        "anthropic",
        "--slug",
        "agent-evals",
        "--title",
        "Agent Evals",
        "--summary",
        "A compact field guide.",
        "--category",
        "Research",
        "--publish",
      ],
    });
    const source = await fs.readFile(result.sourcePath, "utf8");
    const metadata = parseYaml(source.match(/^---\n([\s\S]*?)\n---/)[1]);

    assert.equal(metadata.summary, "A compact field guide.");
    assert.equal(metadata.category, "Research");
    assert.equal(metadata.draft, undefined);
    assert.equal(result.draft, false);
  });
});

test("requires a valid theme", async () => {
  await withFixture(async (root) => {
    await assert.rejects(
      createArticle({ root, argv: [] }),
      /--theme is required/
    );
    await assert.rejects(
      createArticle({ root, argv: ["--theme", "missing"] }),
      /Available themes: anthropic/
    );
  });
});

async function withFixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-create-article-"));
  try {
    const themeDir = path.join(root, "themes", "anthropic");
    await fs.mkdir(themeDir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(themeDir, "theme.yaml"), "id: anthropic\n", "utf8"),
      fs.writeFile(path.join(themeDir, "index.mjs"), "export function renderPage() {}\n", "utf8"),
      fs.writeFile(path.join(themeDir, "style.css"), "", "utf8"),
      fs.writeFile(path.join(themeDir, "README.md"), "# Anthropic\n", "utf8"),
    ]);
    await callback(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
