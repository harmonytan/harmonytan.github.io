import assert from "node:assert/strict";
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
        component.key === "render-playground::local.render-spec"
        && component.ownerArticle === "render-playground"
    )
  );
  assert.ok(
    catalog.articles.some(
      (article) =>
        article.slug === "draft-2026-07-23"
        && article.draft
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
      componentKey: "render-playground::local.render-spec",
      props: {},
      body: "Private content.",
    }),
    /belongs to article "render-playground"/
  );

  const preview = await renderWorkbenchPreview(ROOT, {
    theme: "distill",
    articleSlug: "render-playground",
    componentKey: "render-playground::local.render-spec",
    props: { title: "Private preview" },
    body: "Private content.",
  });
  assert.match(preview.document, /data-component="local\.render-spec"/);
  assert.match(
    preview.document,
    /articles\/render-playground\/components\/render-spec\/style\.css/
  );
});
