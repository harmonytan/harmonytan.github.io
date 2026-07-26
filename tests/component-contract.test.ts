import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  normalizeComponentProps,
  validateComponentManifest,
} from "../core/build/component-contract.ts";
import { ComponentRegistry } from "../core/build/components.ts";

test("component manifests are versioned and normalize typed properties", () => {
  const manifest = validateComponentManifest({
    apiVersion: 1,
    name: "sample",
    scope: "shared",
    description: "A sample component.",
    requires: ["commentary"],
    themes: { only: ["anthropic"] },
    props: {
      title: {
        type: "string",
        default: "Example",
        maxLength: 40,
      },
      tone: {
        type: "enum",
        values: ["note", "claim"],
        default: "note",
      },
      enabled: {
        type: "boolean",
        default: false,
      },
      columns: {
        type: "integer",
        min: 1,
        max: 4,
      },
      url: {
        type: "url",
      },
    },
  }, {
    manifestPath: "components/sample/component.yaml",
    expectedName: "sample",
    expectedScope: "shared",
  });

  assert.deepEqual(
    normalizeComponentProps("shared.sample", manifest.props, {
      enabled: "true",
      columns: "3",
      url: "https://example.com/source",
    }),
    {
      title: "Example",
      tone: "note",
      enabled: true,
      columns: 3,
      url: "https://example.com/source",
    }
  );
});

test("rejects invalid manifest defaults, unknown properties, and invalid values", () => {
  assert.throws(
    () => validateComponentManifest({
      name: "sample",
      scope: "shared",
      description: "A sample component.",
    }),
    /apiVersion must be 1/
  );

  assert.throws(
    () => validateComponentManifest({
      apiVersion: 1,
      name: "sample",
      scope: "shared",
      description: "A sample component.",
      props: {
        size: {
          type: "enum",
          values: ["compact", "normal"],
          default: "large",
        },
      },
    }),
    /default.*must be one of: compact, normal/
  );

  const manifest = validateComponentManifest({
    apiVersion: 1,
    name: "sample",
    scope: "shared",
    description: "A sample component.",
    props: {
      visible: {
        type: "boolean",
        default: true,
      },
      count: {
        type: "integer",
        min: 1,
        max: 3,
      },
    },
  });

  assert.throws(
    () => normalizeComponentProps("shared.sample", manifest.props, { visble: "true" }),
    /unknown property "visble".*Available properties: visible, count/
  );
  assert.throws(
    () => normalizeComponentProps("shared.sample", manifest.props, { visible: "yes" }),
    /must be "true" or "false"/
  );
  assert.throws(
    () => normalizeComponentProps("shared.sample", manifest.props, { count: "4" }),
    /must be at most 3/
  );
});

test("registry passes normalized properties and applies component-level validation", async () => {
  await withRegistryFixture(async ({ root, articleDir }) => {
    const registry = new ComponentRegistry({
      root,
      articleDir,
      articleSlug: "contract-test",
      theme: {
        id: "anthropic",
        capabilities: ["commentary"],
      },
    });

    const html = await registry.render(
      "shared.sample",
      {
        title: "Typed",
        count: "2",
        featured: "true",
      },
      "<p>Body</p>"
    );
    assert.match(html, /data-count="2"/);
    assert.match(html, /data-featured="true"/);
    assert.match(html, />Typed<\/strong>/);

    await assert.rejects(
      registry.render(
        "shared.sample",
        {
          count: "3",
          featured: "true",
        },
        ""
      ),
      /rejected its properties: featured samples may use at most two columns/
    );
  });
});

test("registry rejects components that are incompatible with the selected theme", async () => {
  await withRegistryFixture(async ({ root, articleDir }) => {
    const registry = new ComponentRegistry({
      root,
      articleDir,
      articleSlug: "contract-test",
      theme: {
        id: "distill",
        capabilities: ["commentary"],
      },
    });

    await assert.rejects(
      registry.render("shared.sample", {}, ""),
      /only supports themes: anthropic/
    );
  });
});

async function withRegistryFixture(
  callback: (fixture: { root: string; articleDir: string }) => Promise<void>
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "component-contract-"));
  const articleDir = path.join(root, "articles", "contract-test");
  const componentDir = path.join(root, "components", "sample");
  try {
    await Promise.all([
      fs.mkdir(articleDir, { recursive: true }),
      fs.mkdir(componentDir, { recursive: true }),
    ]);
    await Promise.all([
      fs.writeFile(
        path.join(componentDir, "component.yaml"),
        `apiVersion: 1
name: sample
scope: shared
description: A typed sample component.
requires:
  - commentary
themes:
  only:
    - anthropic
props:
  title:
    type: string
    default: Example
  count:
    type: integer
    min: 1
    max: 3
    default: 1
  featured:
    type: boolean
    default: false
`,
        "utf8"
      ),
      fs.writeFile(
        path.join(componentDir, "index.ts"),
        `export function validate({ props }) {
  if (props.featured && props.count > 2) {
    throw new Error("featured samples may use at most two columns");
  }
}

export function render({ props, content, escape }) {
  return \`<aside data-count="\${props.count}" data-featured="\${props.featured}"><strong>\${escape(props.title)}</strong>\${content}</aside>\`;
}
`,
        "utf8"
      ),
      fs.writeFile(path.join(componentDir, "README.md"), "# Sample\n", "utf8"),
    ]);
    await callback({ root, articleDir });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
