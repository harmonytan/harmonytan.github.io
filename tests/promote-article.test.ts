import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import { promoteArticle } from "../tools/promote-article.ts";

test("promotes a private article into a reviewable public-repository draft", async () => {
  await withFixture(async ({ root, privateArticlesDir }) => {
    await createPrivateArticle(privateArticlesDir, "private-note");
    const result = await promoteArticle({
      root,
      privateArticlesDir,
      argv: ["--slug", "private-note"],
    });
    assert.equal(result.help, false);
    if (result.help) return;

    const publicSource = await fs.readFile(
      path.join(result.destination, "index.md"),
      "utf8"
    );
    const match = publicSource.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(match);
    const metadata = parseYaml(match[1]) as Record<string, unknown>;
    assert.equal(metadata.visibility, "draft");
    assert.equal(metadata.draft, undefined);
    await fs.access(
      path.join(privateArticlesDir, "private-note", "index.md")
    );
    await assert.rejects(
      fs.access(path.join(result.destination, "index.html")),
      /ENOENT/
    );
  });
});

test("can explicitly publish a promoted article", async () => {
  await withFixture(async ({ root, privateArticlesDir }) => {
    await createPrivateArticle(privateArticlesDir, "publish-note");
    const result = await promoteArticle({
      root,
      privateArticlesDir,
      argv: ["--slug=publish-note", "--publish"],
    });
    assert.equal(result.help, false);
    if (result.help) return;
    assert.equal(result.visibility, "public");
    await fs.access(path.join(result.destination, "index.html"));
    const home = await fs.readFile(path.join(root, "index.html"), "utf8");
    assert.match(home, /Private Note/);
  });
});

test("stops promotion when privacy markers require review", async () => {
  await withFixture(async ({ root, privateArticlesDir }) => {
    await createPrivateArticle(
      privateArticlesDir,
      "warning-note",
      "\nDO NOT PUBLISH this section.\n"
    );
    await assert.rejects(
      promoteArticle({
        root,
        privateArticlesDir,
        argv: ["--slug", "warning-note"],
      }),
      /Promotion stopped.*DO NOT PUBLISH/s
    );
    await assert.rejects(
      fs.access(path.join(root, "articles", "warning-note")),
      /ENOENT/
    );
  });
});

test("rolls back the public copy when the promoted article cannot render", async () => {
  await withFixture(async ({ root, privateArticlesDir }) => {
    await createPrivateArticle(privateArticlesDir, "broken-note");
    const sourcePath = path.join(
      privateArticlesDir,
      "broken-note",
      "index.md"
    );
    const source = await fs.readFile(sourcePath, "utf8");
    await fs.writeFile(
      sourcePath,
      source.replace("theme: test", "theme: missing"),
      "utf8"
    );

    await assert.rejects(
      promoteArticle({
        root,
        privateArticlesDir,
        argv: ["--slug", "broken-note"],
      }),
      /Theme "missing" is incomplete/
    );
    await assert.rejects(
      fs.access(path.join(root, "articles", "broken-note")),
      /ENOENT/
    );
    const articleEntries = await fs.readdir(path.join(root, "articles"));
    assert.equal(
      articleEntries.some((entry) => entry.startsWith(".promote-broken-note-")),
      false
    );
  });
});

async function withFixture(
  callback: (fixture: {
    root: string;
    privateArticlesDir: string;
  }) => Promise<void>
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-promote-"));
  const privateArticlesDir = path.join(root, "private-content", "articles");
  try {
    await createTheme(root);
    await fs.mkdir(path.join(root, "articles"), { recursive: true });
    await callback({ root, privateArticlesDir });
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

async function createPrivateArticle(
  privateArticlesDir: string,
  slug: string,
  suffix = ""
): Promise<void> {
  const articleDir = path.join(privateArticlesDir, slug);
  await fs.mkdir(path.join(articleDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(articleDir, "index.md"),
    `---
title: Private Note
date: 2026-07-27
theme: test
visibility: private
---

Private source content.${suffix}
`,
    "utf8"
  );
}
