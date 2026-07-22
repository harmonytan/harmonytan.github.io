import { parse as parseYaml } from "yaml";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseArticleSource(source, filePath) {
  const match = String(source).match(FRONTMATTER);
  if (!match) {
    throw new Error(`${filePath} must start with YAML front matter.`);
  }

  const attributes = parseYaml(match[1]) ?? {};
  if (!attributes || Array.isArray(attributes) || typeof attributes !== "object") {
    throw new Error(`${filePath} front matter must be a YAML mapping.`);
  }

  return {
    attributes,
    body: source.slice(match[0].length),
  };
}

export function normalizeArticleMeta(attributes, slug, filePath) {
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
    category: String(attributes.category ?? "Notebook").trim(),
    summary: String(attributes.summary ?? attributes.subtitle ?? "").trim(),
    author: normalizeAuthor(attributes.author),
    affiliation: String(attributes.affiliation ?? "Independent Researcher").trim(),
    image: String(attributes.image ?? attributes.cover ?? "").trim(),
    citation: normalizeCitation(attributes.citation),
    draft: attributes.draft === true,
  };
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "").trim();
}

function normalizeAuthor(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item;
      return item?.name ? String(item.name) : "";
    }).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object" && value.name) {
    return String(value.name);
  }
  return String(value ?? "Hongming Tan").trim();
}

function normalizeCitation(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    ["author", "title", "venue", "url", "key"]
      .filter((key) => value[key] != null)
      .map((key) => [key, String(value[key]).trim()])
  );
}
