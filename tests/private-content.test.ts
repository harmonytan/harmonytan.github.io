import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { typecheckPrivateContent } from "../tools/typecheck-private.ts";
import { verifyPrivateContent } from "../tools/verify-private.ts";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("verifies private articles without writing rendered output", async () => {
  await withFixture(async ({ root, privateArticlesDir, articleDir }) => {
    const count = await verifyPrivateContent({
      root,
      privateArticlesDir,
      checkPublicOutputs: false,
    });
    assert.equal(count, 1);
    await assert.rejects(
      fs.access(path.join(articleDir, "index.html")),
      /ENOENT/
    );
    await assert.rejects(
      fs.access(path.join(articleDir, "article-entry.ts")),
      /ENOENT/
    );
  });
});

test("rejects generated output and missing local assets in private content", async () => {
  await withFixture(async ({ root, privateArticlesDir, articleDir }) => {
    await fs.writeFile(path.join(articleDir, "index.html"), "stale", "utf8");
    await assert.rejects(
      verifyPrivateContent({
        root,
        privateArticlesDir,
        checkPublicOutputs: false,
      }),
      /generated output that must not be synced/
    );
    await fs.rm(path.join(articleDir, "index.html"));
    await fs.writeFile(
      path.join(articleDir, "index.md"),
      `---
title: Private Note
date: 2026-07-27
theme: test
visibility: private
---

![Missing](./assets/missing.png)
`,
      "utf8"
    );
    await assert.rejects(
      verifyPrivateContent({
        root,
        privateArticlesDir,
        checkPublicOutputs: false,
      }),
      /references missing local files/
    );
  });
});

test("type-checks a configured private tree with the stable component API alias", async () => {
  const privateArticlesDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "blog-private-types-")
  );
  try {
    const componentDir = path.join(
      privateArticlesDir,
      "private-note",
      "components",
      "private-card"
    );
    await fs.mkdir(componentDir, { recursive: true });
    await fs.writeFile(
      path.join(componentDir, "index.ts"),
      `import type { ComponentContextWithEscape } from "@blog/component-api";

export function render({ content }: ComponentContextWithEscape): string {
  return \`<aside>\${content}</aside>\`;
}
`,
      "utf8"
    );

    const count = await typecheckPrivateContent({
      root: PROJECT_ROOT,
      privateArticlesDir,
    });
    assert.equal(count, 1);
  } finally {
    await fs.rm(privateArticlesDir, { recursive: true, force: true });
  }
});

async function withFixture(
  callback: (fixture: {
    root: string;
    privateArticlesDir: string;
    articleDir: string;
  }) => Promise<void>
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-private-check-"));
  const privateArticlesDir = path.join(root, "private-content", "articles");
  const articleDir = path.join(privateArticlesDir, "private-note");
  try {
    await createTheme(root);
    await fs.mkdir(path.join(root, "articles"), { recursive: true });
    await fs.mkdir(path.join(articleDir, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(articleDir, "index.md"),
      `---
title: Private Note
date: 2026-07-27
theme: test
visibility: private
---

Private content.
`,
      "utf8"
    );
    await callback({ root, privateArticlesDir, articleDir });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

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
