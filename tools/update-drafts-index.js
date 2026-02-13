#!/usr/bin/env node
/**
 * Regenerates data/drafts.json by scanning Markdown files in /drafts.
 * Keeps slugs sorted by front matter date (newest first), falling back to name.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "drafts");
const OUTPUT_PATH = path.join(ROOT, "data", "drafts.json");

async function main() {
  const markdownFiles = await getMarkdownFiles(DRAFTS_DIR);
  const drafts = [];

  for (const filename of markdownFiles) {
    const absolutePath = path.join(DRAFTS_DIR, filename);
    const raw = await fs.readFile(absolutePath, "utf8");
    const { attributes } = parseFrontMatter(raw);
    const slug = filename.replace(/\.md$/i, "");
    const parsedDate = parseDate(attributes.date);

    drafts.push({
      slug,
      title: attributes.title ?? slug,
      summary: attributes.summary ?? "",
      date: attributes.date ?? "",
      category: attributes.category ?? "",
      image: attributes.image ?? attributes.cover ?? "",
      sortKey: parsedDate,
    });
  }

  drafts.sort((a, b) => {
    const diff = (b.sortKey ?? 0) - (a.sortKey ?? 0);
    if (diff !== 0) {
      return diff;
    }
    return a.slug.localeCompare(b.slug);
  });

  const payload = drafts.map(({ sortKey, ...rest }) => rest);
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, json, "utf8");
  console.log(`Updated ${OUTPUT_PATH} with ${payload.length} draft(s).`);
}

async function getMarkdownFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function parseFrontMatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { attributes: {}, body: source };
  }

  const attributes = {};
  const rawBlock = match[1];

  rawBlock.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const [key, ...rest] = trimmed.split(":");
    if (!key || rest.length === 0) {
      return;
    }
    attributes[key.trim()] = rest.join(":").trim();
  });

  const body = source.slice(match[0].length);
  return { attributes, body };
}

function parseDate(value) {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
