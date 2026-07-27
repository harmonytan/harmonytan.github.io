#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyYaml } from "yaml";
import {
  inspectPrivateArticleTree,
  shouldCopyArticleFile,
} from "../core/build/article-files.ts";
import {
  normalizeArticleMeta,
  parseArticleSource,
} from "../core/build/frontmatter.ts";
import { assertSafeName } from "../core/build/utils.ts";
import {
  resolvePrivateArticlesDir,
} from "../core/private-content.ts";
import { buildContent } from "./build-content.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface PromoteCliOptions {
  slug?: string;
  publish?: boolean;
  allowWarnings?: boolean;
  help?: boolean;
}

export interface PromoteArticleOptions {
  root?: string;
  privateArticlesDir?: string;
  argv?: string[];
}

export type PromoteArticleResult =
  | { help: true; output: string }
  | {
      help: false;
      slug: string;
      destination: string;
      visibility: "draft" | "public";
      files: string[];
    };

export async function promoteArticle({
  root = ROOT,
  privateArticlesDir = resolvePrivateArticlesDir(root),
  argv = process.argv.slice(2),
}: PromoteArticleOptions = {}): Promise<PromoteArticleResult> {
  const options = parseArgs(argv);
  if (options.help) return { help: true, output: renderHelp() };
  const slug = requireText(options.slug, "--slug");
  assertSafeName(slug, "Article slug");

  const sourceDir = path.join(privateArticlesDir, slug);
  const sourcePath = path.join(sourceDir, "index.md");
  const destinationRoot = path.join(root, "articles");
  const destination = path.join(destinationRoot, slug);
  const staging = path.join(
    destinationRoot,
    `.promote-${slug}-${process.pid}-${Date.now()}`
  );
  if (!(await exists(sourcePath))) {
    throw new Error(`Private article was not found: ${sourcePath}`);
  }
  if (await exists(destination)) {
    throw new Error(`Public article directory already exists: articles/${slug}`);
  }

  const source = await fs.readFile(sourcePath, "utf8");
  const parsed = parseArticleSource(source, sourcePath);
  const article = normalizeArticleMeta(parsed.attributes, slug, sourcePath);
  if (article.visibility !== "private") {
    throw new Error(
      `${sourcePath}: article must declare visibility: private before promotion.`
    );
  }
  const inspection = await inspectPrivateArticleTree(sourceDir, source);
  if (inspection.warnings.length > 0 && !options.allowWarnings) {
    throw new Error(
      `Promotion stopped because the article needs review:\n${
        inspection.warnings.map((warning) => `- ${warning}`).join("\n")
      }\nRe-run with --allow-warnings only after reviewing these findings.`
    );
  }

  const visibility = options.publish ? "public" : "draft";
  const metadata: Record<string, unknown> = {
    ...parsed.attributes,
    visibility,
  };
  delete metadata.draft;
  const promotedMarkdown = `---
${stringifyYaml(metadata, { lineWidth: 0 }).trimEnd()}
---

${parsed.body.replace(/^\s+/, "")}`;

  let promoted = false;
  try {
    await fs.mkdir(destinationRoot, { recursive: true });
    await fs.cp(sourceDir, staging, {
      recursive: true,
      errorOnExist: true,
      filter: shouldCopyArticleFile,
    });
    await fs.writeFile(path.join(staging, "index.md"), promotedMarkdown, "utf8");
    await fs.rename(staging, destination);
    promoted = true;
    await buildContent({
      root,
      includeDrafts: true,
      quiet: true,
    });
  } catch (error) {
    await Promise.all([
      fs.rm(staging, { recursive: true, force: true }),
      promoted
        ? fs.rm(destination, { recursive: true, force: true })
        : Promise.resolve(),
    ]);
    throw error;
  }

  return {
    help: false,
    slug,
    destination,
    visibility,
    files: inspection.files,
  };
}

function parseArgs(argv: string[]): PromoteCliOptions {
  const options: PromoteCliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--publish") {
      options.publish = true;
      continue;
    }
    if (token === "--allow-warnings") {
      options.allowWarnings = true;
      continue;
    }
    if (token === "--help") {
      options.help = true;
      continue;
    }
    if (token === "--slug") {
      options.slug = argv[index + 1];
      if (!options.slug || options.slug.startsWith("--")) {
        throw new Error("--slug requires a value.");
      }
      index += 1;
      continue;
    }
    if (token.startsWith("--slug=")) {
      options.slug = token.slice("--slug=".length);
      continue;
    }
    throw new Error(`Unknown option "${token}".\n\n${renderHelp()}`);
  }
  return options;
}

function renderHelp(): string {
  return `Promote a private article into the public repository.

Usage:
  npm run article:promote -- --slug <slug> [options]

Required:
  --slug <slug>          Private article directory name

Optional:
  --publish              Publish immediately; default is a public-repo draft
  --allow-warnings       Continue after reviewing privacy marker warnings
  --help                 Show this help

The source private article is never deleted or modified. The command copies,
validates, and renders the promoted article, but does not commit it.`;
}

function requireText(value: unknown, flag: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${flag} is required.\n\n${renderHelp()}`);
  return normalized;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  promoteArticle().then((result) => {
    if (result.help) {
      console.log(result.output);
      return;
    }
    console.log(
      `Promoted private article to ${result.visibility}: `
      + `${path.relative(ROOT, result.destination)}`
    );
    console.log(`Reviewed ${result.files.length} source file(s).`);
    console.log("Review the copied article before committing it to the public repository.");
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
