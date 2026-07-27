import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderHomePage } from "../core/build/home.ts";
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
    assert.deepEqual(
      result.previewPosts.map((post) => post.slug),
      ["draft-note", "published-note"]
    );
    assert.match(home, /Published Note/);
    assert.doesNotMatch(home, /Draft Note/);
    assert.doesNotMatch(home, /home-local\.css/);
    const previewHome = renderHomePage(result.previewPosts, {
      localPreview: true,
    });
    assert.match(previewHome, /Draft Note/);
    assert.match(previewHome, /Draft · not published/);
    assert.match(previewHome, /noindex, nofollow/);
    assert.match(previewHome, /home-local\.css/);
    const preview = result.draftPreviews.get("draft-note");
    assert.ok(preview);
    assert.match(preview.html, /Draft Note/);
    assert.match(preview.entry, /article-runtime/);
    await assert.rejects(fs.access(path.join(draftDir, "index.html")), /ENOENT/);
    await assert.rejects(fs.access(path.join(draftDir, "article-entry.ts")), /ENOENT/);
    await assert.rejects(fs.access(path.join(draftDir, "article-entry.js")), /ENOENT/);
    await fs.access(path.join(root, "articles", "published-note", "index.html"));

    await fs.writeFile(
      path.join(draftDir, "index.md"),
      `---
title: Draft Note
date: 2026-07-23
theme: unfinished-theme
visibility: draft
---

An unfinished draft must not affect a production build.
`,
      "utf8"
    );
    const production = await buildContent({ root, quiet: true });
    assert.equal(production.draftPreviews.size, 0);
    assert.deepEqual(production.posts.map((post) => post.slug), ["published-note"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("renders private repository articles in memory without publishing them", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-private-preview-"));
  try {
    await createTheme(root);
    await createArticle(root, "published-note", {
      title: "Published Note",
      draft: false,
    });
    const privateArticlesDir = path.join(
      root,
      "private-content",
      "articles"
    );
    const privateDir = path.join(privateArticlesDir, "private-note");
    await fs.mkdir(path.join(privateDir, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(privateDir, "index.md"),
      `---
title: Private Note
date: 2026-07-27
theme: test
visibility: private
---

Private rendered content.
`,
      "utf8"
    );

    const result = await buildContent({
      root,
      privateArticlesDir,
      includeDrafts: true,
      quiet: true,
    });
    const preview = result.privatePreviews.get("private-note");
    assert.ok(preview);
    assert.equal(preview.visibility, "private");
    assert.match(preview.html, /Private rendered content/);
    assert.match(preview.entry, /"\/core\/client\/article-runtime\.ts"/);
    assert.deepEqual(
      result.previewPosts.map((post) => post.slug),
      ["private-note", "published-note"]
    );
    const previewHome = renderHomePage(result.previewPosts, {
      localPreview: true,
    });
    assert.match(previewHome, /Private Note/);
    assert.match(previewHome, /Private · local only/);
    assert.match(
      previewHome,
      /href="\/__private\/articles\/private-note\/"/
    );
    await assert.rejects(
      fs.access(path.join(privateDir, "index.html")),
      /ENOENT/
    );
    const home = await fs.readFile(path.join(root, "index.html"), "utf8");
    assert.doesNotMatch(home, /Private Note/);
    assert.doesNotMatch(home, /home-local\.css/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects private visibility in the public tree and non-private visibility in the private tree", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-privacy-guard-"));
  try {
    await createTheme(root);
    const publicDir = await createArticle(root, "misplaced-private", {
      title: "Misplaced Private",
      draft: false,
    });
    await fs.writeFile(
      path.join(publicDir, "index.md"),
      `---
title: Misplaced Private
date: 2026-07-27
theme: test
visibility: private
---

Must fail.
`,
      "utf8"
    );
    await assert.rejects(
      buildContent({ root, quiet: true }),
      /private articles must live outside the public articles directory/
    );

    await fs.rm(publicDir, { recursive: true });
    const privateArticlesDir = path.join(root, "private-content", "articles");
    const privateDir = path.join(privateArticlesDir, "misplaced-public");
    await fs.mkdir(privateDir, { recursive: true });
    await fs.writeFile(
      path.join(privateDir, "index.md"),
      `---
title: Misplaced Public
date: 2026-07-27
theme: test
visibility: public
---

Must fail.
`,
      "utf8"
    );
    await assert.rejects(
      buildContent({ root, privateArticlesDir, quiet: true }),
      /must declare visibility: private/
    );
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
