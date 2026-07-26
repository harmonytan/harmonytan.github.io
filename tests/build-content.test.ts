import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildContent } from "../tools/build-content.ts";

test("serves drafts from memory in development without listing or writing them", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-draft-preview-"));
  try {
    await createTheme(root);
    await createArticle(root, "published-note", {
      title: "Published Note",
      draft: false,
    });
    const draftDir = await createArticle(root, "draft-note", {
      title: "Draft Note",
      draft: true,
    });
    await fs.writeFile(path.join(draftDir, "index.html"), "stale", "utf8");
    await fs.writeFile(path.join(draftDir, "article-entry.ts"), "stale", "utf8");
    await fs.writeFile(path.join(draftDir, "article-entry.js"), "legacy", "utf8");

    const result = await buildContent({
      root,
      includeDrafts: true,
      quiet: true,
    });
    const home = await fs.readFile(path.join(root, "index.html"), "utf8");

    assert.deepEqual(result.posts.map((post) => post.slug), ["published-note"]);
    assert.match(home, /Published Note/);
    assert.doesNotMatch(home, /Draft Note/);
    const preview = result.draftPreviews.get("draft-note");
    assert.ok(preview);
    assert.match(preview.html, /Draft Note/);
    assert.match(preview.entry, /article-runtime/);
    await assert.rejects(fs.access(path.join(draftDir, "index.html")), /ENOENT/);
    await assert.rejects(fs.access(path.join(draftDir, "article-entry.ts")), /ENOENT/);
    await assert.rejects(fs.access(path.join(draftDir, "article-entry.js")), /ENOENT/);
    await fs.access(path.join(root, "articles", "published-note", "index.html"));

    const production = await buildContent({ root, quiet: true });
    assert.equal(production.draftPreviews.size, 0);
    assert.deepEqual(production.posts.map((post) => post.slug), ["published-note"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function createTheme(root: string): Promise<void> {
  const themeDir = path.join(root, "themes", "test");
  await fs.mkdir(themeDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(themeDir, "theme.yaml"),
      "id: test\ncapabilities: []\n",
      "utf8"
    ),
    fs.writeFile(
      path.join(themeDir, "index.ts"),
      `export function renderPage({ article, contentHtml }) {
  return \`<!doctype html><html><head><title>\${article.title}</title></head><body>\${contentHtml}</body></html>\`;
}
`,
      "utf8"
    ),
    fs.writeFile(path.join(themeDir, "style.css"), "", "utf8"),
    fs.writeFile(path.join(themeDir, "README.md"), "# Test Theme\n", "utf8"),
  ]);
}

async function createArticle(
  root: string,
  slug: string,
  { title, draft }: { title: string; draft: boolean }
): Promise<string> {
  const articleDir = path.join(root, "articles", slug);
  await fs.mkdir(articleDir, { recursive: true });
  await fs.writeFile(
    path.join(articleDir, "index.md"),
    `---
title: ${title}
date: 2026-07-23
theme: test
draft: ${draft}
---

Draft and published content.
`,
    "utf8"
  );
  return articleDir;
}
