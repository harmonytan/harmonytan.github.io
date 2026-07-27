import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createWorkbenchCatalog,
  renderWorkbenchPreview,
} from "../core/workbench/server.ts";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("Workbench discovers shared and article-private components dynamically", async () => {
  const catalog = await createWorkbenchCatalog(ROOT);

  assert.deepEqual(
    catalog.themes.map((theme) => theme.id).sort(),
    ["anthropic", "distill"]
  );
  assert.ok(
    catalog.components.some(
      (component) =>
        component.key === "shared.callout"
        && component.examples[0]?.body.includes("compiled before Vite")
    )
  );
  assert.ok(
    catalog.components.some(
      (component) =>
        component.key === "public:render-playground::local.render-spec"
        && component.ownerArticle === "render-playground"
    )
  );
  assert.ok(
    catalog.articles.some(
      (article) =>
        article.slug === "draft-2026-07-23"
        && article.visibility === "draft"
    )
  );
});

test("Workbench preview uses the production Markdown and component renderer", async () => {
  const preview = await renderWorkbenchPreview(ROOT, {
    theme: "anthropic",
    componentKey: "shared.callout",
    props: {
      title: "Preview contract",
      tone: "claim",
      size: "compact",
    },
    body: "A **rendered** Workbench body.",
  });

  assert.match(preview.document, /themes\/anthropic\/style\.css/);
  assert.match(preview.document, /component-callout--claim/);
  assert.match(preview.document, /<strong>rendered<\/strong>/);
  assert.match(
    preview.markdown,
    /^:::component\{name="shared\.callout".*title="Preview contract"/
  );
});

test("Workbench enforces private component article ownership", async () => {
  await assert.rejects(
    renderWorkbenchPreview(ROOT, {
      theme: "distill",
      componentKey: "public:render-playground::local.render-spec",
      props: {},
      body: "Private content.",
    }),
    /belongs to article "render-playground"/
  );

  const preview = await renderWorkbenchPreview(ROOT, {
    theme: "distill",
    articleKey: "public:render-playground",
    componentKey: "public:render-playground::local.render-spec",
    props: { title: "Private preview" },
    body: "Private content.",
  });
  assert.match(preview.document, /data-component="local\.render-spec"/);
  assert.match(
    preview.document,
    /articles\/render-playground\/components\/render-spec\/style\.css/
  );
});

test("Workbench discovers and renders private-repository components only when configured", async () => {
  const privateRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "blog-private-workbench-")
  );
  try {
    const articleDir = path.join(privateRoot, "private-note");
    const componentDir = path.join(articleDir, "components", "private-card");
    await fs.mkdir(componentDir, { recursive: true });
    await Promise.all([
      fs.writeFile(
        path.join(articleDir, "index.md"),
        `---
title: Private Note
date: 2026-07-27
theme: distill
visibility: private
---

Private body.
`,
        "utf8"
      ),
      fs.writeFile(
        path.join(componentDir, "component.yaml"),
        `apiVersion: 1
name: private-card
scope: local
description: A private fixture.
requires: []
props: {}
`,
        "utf8"
      ),
      fs.writeFile(
        path.join(componentDir, "README.md"),
        "# Private Card\n",
        "utf8"
      ),
      fs.writeFile(
        path.join(componentDir, "index.ts"),
        `export function render({ content }) {
  return \`<aside data-component="local.private-card">\${content}</aside>\`;
}
`,
        "utf8"
      ),
      fs.writeFile(path.join(componentDir, "style.css"), "", "utf8"),
    ]);

    const options = { privateArticlesDir: privateRoot };
    const catalog = await createWorkbenchCatalog(ROOT, options);
    assert.ok(
      catalog.articles.some(
        (article) =>
          article.key === "private:private-note"
          && article.visibility === "private"
      )
    );
    assert.ok(
      catalog.components.some(
        (component) =>
          component.key === "private:private-note::local.private-card"
      )
    );

    const preview = await renderWorkbenchPreview(ROOT, {
      theme: "distill",
      articleKey: "private:private-note",
      componentKey: "private:private-note::local.private-card",
      props: {},
      body: "Private **component**.",
    }, options);
    assert.match(preview.document, /Private <strong>component<\/strong>/);
    assert.match(
      preview.document,
      /__private\/articles\/private-note\/components\/private-card\/style\.css/
    );
  } finally {
    await fs.rm(privateRoot, { recursive: true, force: true });
  }
});
