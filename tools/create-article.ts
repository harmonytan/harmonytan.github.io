#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { assertSafeName } from "../core/build/utils.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALUE_OPTIONS = new Set<ArticleValueOption>([
  "theme",
  "slug",
  "title",
  "date",
  "summary",
  "author",
  "affiliation",
  "category",
  "image",
]);
const BOOLEAN_OPTIONS = new Set<ArticleBooleanOption>(["help", "publish"]);

type ArticleValueOption =
  | "theme"
  | "slug"
  | "title"
  | "date"
  | "summary"
  | "author"
  | "affiliation"
  | "category"
  | "image";
type ArticleBooleanOption = "help" | "publish";

export interface ArticleCliOptions {
  theme?: string;
  slug?: string;
  title?: string;
  date?: string;
  summary?: string;
  author?: string;
  affiliation?: string;
  category?: string;
  image?: string;
  help?: boolean;
  publish?: boolean;
}

export interface CreateArticleOptions {
  root?: string;
  argv?: string[];
  now?: Date;
}

export type CreateArticleResult =
  | {
      help: true;
      output: string;
    }
  | {
      help: false;
      slug: string;
      theme: string;
      title: string;
      date: string;
      draft: boolean;
      articleDir: string;
      sourcePath: string;
    };

export async function createArticle({
  root = ROOT,
  argv = process.argv.slice(2),
  now = new Date(),
}: CreateArticleOptions = {}): Promise<CreateArticleResult> {
  const options = parseArticleArgs(argv);
  if (options.help) return { help: true, output: renderHelp() };

  const theme = requiredText(options.theme, "--theme").toLowerCase();
  assertSafeName(theme, "Theme id");
  await validateTheme(root, theme);

  const date = options.date ? validateDate(options.date) : formatLocalDate(now);
  const requestedSlug = optionalText(options.slug);
  if (requestedSlug) assertSafeName(requestedSlug, "Article slug");

  const requestedTitle = optionalText(options.title);
  const title = requestedTitle
    ?? (requestedSlug ? titleFromSlug(requestedSlug) : "Untitled Article");
  const articlesDir = path.join(root, "articles");
  await fs.mkdir(articlesDir, { recursive: true });

  const generatedTitleSlug = requestedTitle ? slugFromTitle(requestedTitle) : "";
  const baseSlug = requestedSlug ?? (generatedTitleSlug || `draft-${date}`);
  const slug = requestedSlug
    ? await requireAvailableSlug(articlesDir, requestedSlug)
    : await nextAvailableSlug(articlesDir, baseSlug);
  const articleDir = path.join(articlesDir, slug);

  const metadata = {
    title,
    date,
    ...optionalField("summary", options.summary),
    ...optionalField("author", options.author),
    ...optionalField("affiliation", options.affiliation),
    ...optionalField("category", options.category),
    ...optionalField("image", options.image),
    theme,
    ...(options.publish ? {} : { draft: true }),
  };
  const markdown = renderArticleTemplate(metadata);
  const stagingDir = path.join(
    articlesDir,
    `.create-article-${process.pid}-${Date.now()}`
  );

  await fs.mkdir(stagingDir);
  try {
    await Promise.all([
      fs.mkdir(path.join(stagingDir, "assets")),
      fs.mkdir(path.join(stagingDir, "components")),
    ]);
    await Promise.all([
      fs.writeFile(path.join(stagingDir, "index.md"), markdown, "utf8"),
      fs.writeFile(path.join(stagingDir, "assets", ".gitkeep"), "", "utf8"),
      fs.writeFile(path.join(stagingDir, "components", ".gitkeep"), "", "utf8"),
    ]);
    await fs.rename(stagingDir, articleDir);
  } catch (error) {
    await fs.rm(stagingDir, { recursive: true, force: true });
    throw error;
  }

  return {
    help: false,
    slug,
    theme,
    title,
    date,
    draft: !options.publish,
    articleDir,
    sourcePath: path.join(articleDir, "index.md"),
  };
}

export function parseArticleArgs(argv: string[]): ArticleCliOptions {
  const options: ArticleCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument "${token}".\n\n${renderHelp()}`);
    }

    const equalsIndex = token.indexOf("=");
    const name = token.slice(2, equalsIndex === -1 ? undefined : equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);
    if (!isValueOption(name) && !isBooleanOption(name)) {
      throw new Error(`Unknown option "--${name}".\n\n${renderHelp()}`);
    }
    if (Object.hasOwn(options, name)) {
      throw new Error(`Option "--${name}" may only be specified once.`);
    }

    if (isBooleanOption(name)) {
      if (inlineValue !== undefined) {
        throw new Error(`Option "--${name}" does not accept a value.`);
      }
      options[name] = true;
      continue;
    }

    if (!isValueOption(name)) {
      throw new Error(`Option "--${name}" requires a value.`);
    }
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || (inlineValue === undefined && value.startsWith("--"))) {
      throw new Error(`Option "--${name}" requires a value.`);
    }
    options[name] = value;
    if (inlineValue === undefined) index += 1;
  }

  return options;
}

function renderArticleTemplate(metadata: Record<string, unknown>): string {
  const frontmatter = stringifyYaml(metadata, { lineWidth: 0 }).trimEnd();
  return `---
${frontmatter}
---

Write the opening paragraph here.

## First Section

Start writing here.

<!--
Optional end matter uses ordinary level-two headings:

## Appendix

Supplementary material.

## Acknowledgements

Acknowledgements.
-->
`;
}

function optionalField(
  name: string,
  value: unknown
): Record<string, string> {
  const normalized = optionalText(value);
  return normalized ? { [name]: normalized } : {};
}

function optionalText(value: unknown): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function requiredText(value: unknown, flag: string): string {
  const normalized = optionalText(value);
  if (!normalized) throw new Error(`${flag} is required.\n\n${renderHelp()}`);
  return normalized;
}

function validateDate(value: unknown): string {
  const normalized = requiredText(value, "--date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`--date must use YYYY-MM-DD: ${normalized}`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`--date is not a valid calendar date: ${normalized}`);
  }
  return normalized;
}

function formatLocalDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new Error("The current date is invalid.");
  }
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugFromTitle(value: unknown): string {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "";
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function requireAvailableSlug(
  articlesDir: string,
  slug: string
): Promise<string> {
  if (await exists(path.join(articlesDir, slug))) {
    throw new Error(`Article directory already exists: articles/${slug}`);
  }
  return slug;
}

async function nextAvailableSlug(
  articlesDir: string,
  baseSlug: string
): Promise<string> {
  assertSafeName(baseSlug, "Generated article slug");
  if (!(await exists(path.join(articlesDir, baseSlug)))) return baseSlug;

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await exists(path.join(articlesDir, candidate)))) return candidate;
  }
  throw new Error(`Could not find an available article slug for "${baseSlug}".`);
}

async function validateTheme(root: string, theme: string): Promise<void> {
  const themeDir = path.join(root, "themes", theme);
  const manifestPath = path.join(themeDir, "theme.yaml");
  let manifestSource: string;
  try {
    [manifestSource] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.access(path.join(themeDir, "index.ts")),
      fs.access(path.join(themeDir, "style.css")),
      fs.access(path.join(themeDir, "README.md")),
    ]);
  } catch {
    const available = await listThemes(root);
    const suffix = available.length
      ? ` Available themes: ${available.join(", ")}.`
      : " No complete themes were found.";
    throw new Error(`Theme "${theme}" does not exist or is incomplete.${suffix}`);
  }

  const manifest: unknown = parseYaml(manifestSource) ?? {};
  if (!isRecord(manifest)) {
    throw new Error(`${manifestPath}: theme manifest must be a YAML object.`);
  }
  if (manifest.id !== theme) {
    throw new Error(
      `${manifestPath}: id "${manifest.id}" does not match directory "${theme}".`
    );
  }
}

async function listThemes(root: string): Promise<string[]> {
  const themesDir = path.join(root, "themes");
  let entries;
  try {
    entries = await fs.readdir(themesDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const themes: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const manifestPath = path.join(themesDir, entry.name, "theme.yaml");
    if (await exists(manifestPath)) themes.push(entry.name);
  }
  return themes.sort();
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function renderHelp(): string {
  return `Create a new Markdown article workspace.

Usage:
  npm run article:new -- --theme <theme> [options]

Required:
  --theme <name>         Theme id, for example "distill" or "anthropic"

Optional:
  --slug <slug>          Article directory name; generated when omitted
  --title <title>        Article title; defaults to "Untitled Article"
  --date <YYYY-MM-DD>    Publication date; defaults to today
  --summary <text>       Homepage and metadata summary
  --author <name>        Author metadata
  --affiliation <text>   Author affiliation
  --category <name>      Optional homepage category
  --image <path>         Optional cover image path
  --publish              Create without "draft: true"
  --help                 Show this help

Examples:
  npm run article:new -- --theme anthropic
  npm run article:new -- --theme distill --title "Sparse Feature Geometry"
  npm run article:new -- --theme anthropic --slug eval-notes --publish`;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  createArticle().then((result) => {
    if (result.help) {
      console.log(result.output);
      return;
    }
    const relativeSource = path.relative(ROOT, result.sourcePath);
    console.log(`Created ${result.draft ? "draft" : "article"}: ${relativeSource}`);
    console.log(`Theme: ${result.theme}`);
    if (result.draft) {
      console.log(`Preview route: /articles/${result.slug}/ (available with npm run dev)`);
      console.log("Set draft: false when it is ready to publish.");
    }
  }).catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}

function isValueOption(value: string): value is ArticleValueOption {
  return VALUE_OPTIONS.has(value as ArticleValueOption);
}

function isBooleanOption(value: string): value is ArticleBooleanOption {
  return BOOLEAN_OPTIONS.has(value as ArticleBooleanOption);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
