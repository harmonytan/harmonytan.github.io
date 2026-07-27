#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectPrivateArticleTree,
} from "../core/build/article-files.ts";
import {
  parseArticleSource,
} from "../core/build/frontmatter.ts";
import {
  requirePrivateArticlesDir,
} from "../core/private-content.ts";
import { buildContent } from "./build-content.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface VerifyPrivateOptions {
  root?: string;
  privateArticlesDir?: string;
  checkPublicOutputs?: boolean;
}

export async function verifyPrivateContent({
  root = ROOT,
  privateArticlesDir,
  checkPublicOutputs = true,
}: VerifyPrivateOptions = {}): Promise<number> {
  const directory = privateArticlesDir
    ?? await requirePrivateArticlesDir(root);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const slugs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  for (const slug of slugs) {
    const articleDir = path.join(directory, slug);
    const sourcePath = path.join(articleDir, "index.md");
    const source = await fs.readFile(sourcePath, "utf8");
    parseArticleSource(source, sourcePath);
    await inspectPrivateArticleTree(articleDir, source);
  }

  const result = await buildContent({
    root,
    privateArticlesDir: directory,
    includeDrafts: true,
    quiet: true,
    check: checkPublicOutputs,
  });
  if (result.privatePreviews.size !== slugs.length) {
    throw new Error(
      `Validated ${result.privatePreviews.size} private previews for ${slugs.length} article directories.`
    );
  }
  return slugs.length;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  verifyPrivateContent()
    .then((count) => {
      console.log(`Validated ${count} private article(s); no output was written.`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
