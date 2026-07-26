import { parse as parseYaml } from "yaml";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export interface ArticleCitation {
  author?: string;
  title?: string;
  venue?: string;
  url?: string;
  key?: string;
}

export interface ArticleMeta {
  slug: string;
  title: string;
  date: string;
  theme: string;
  category: string;
  summary: string;
  author: string;
  affiliation: string;
  image: string;
  citation: ArticleCitation;
  draft: boolean;
}

export interface ParsedArticleSource {
  attributes: Record<string, unknown>;
  body: string;
}

export function parseArticleSource(
  source: string,
  filePath: string
): ParsedArticleSource {
  const match = String(source).match(FRONTMATTER);
  if (!match) {
    throw new Error(`${filePath} must start with YAML front matter.`);
  }

  const attributes: unknown = parseYaml(match[1]) ?? {};
  if (!isRecord(attributes)) {
    throw new Error(`${filePath} front matter must be a YAML mapping.`);
  }

  return {
    attributes,
    body: source.slice(match[0].length),
  };
}

export function normalizeArticleMeta(
  attributes: Record<string, unknown>,
  slug: string,
  filePath: string
): ArticleMeta {
  const title = String(attributes.title ?? "").trim();
  const date = normalizeDate(attributes.date);
  const theme = String(attributes.theme ?? attributes.layout ?? "distill")
    .trim()
    .toLowerCase();

  if (!title) throw new Error(`${filePath} is missing front matter field "title".`);
  if (!date) throw new Error(`${filePath} is missing front matter field "date".`);

  return {
    slug,
    title,
    date,
    theme: theme === "default" ? "distill" : theme,
    category: String(attributes.category ?? "").trim(),
    summary: String(attributes.summary ?? attributes.subtitle ?? "").trim(),
    author: normalizeAuthor(attributes.author),
    affiliation: String(attributes.affiliation ?? "Independent Researcher").trim(),
    image: String(attributes.image ?? attributes.cover ?? "").trim(),
    citation: normalizeCitation(attributes.citation),
    draft: attributes.draft === true,
  };
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "").trim();
}

function normalizeAuthor(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item;
      return isRecord(item) && item.name ? String(item.name) : "";
    }).filter(Boolean).join(", ");
  }
  if (isRecord(value) && value.name) {
    return String(value.name);
  }
  return String(value ?? "Hongming Tan").trim();
}

function normalizeCitation(value: unknown): ArticleCitation {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    ["author", "title", "venue", "url", "key"]
      .filter((key) => value[key] != null)
      .map((key) => [key, String(value[key]).trim()])
  ) as ArticleCitation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
