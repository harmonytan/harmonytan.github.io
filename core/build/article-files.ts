import fs from "node:fs/promises";
import path from "node:path";

const GENERATED_FILES = new Set([
  "article-entry.js",
  "article-entry.ts",
  "index.html",
]);

export interface ArticleTreeInspection {
  files: string[];
  warnings: string[];
}

export async function inspectPrivateArticleTree(
  articleDir: string,
  markdown: string
): Promise<ArticleTreeInspection> {
  const rootStats = await fs.lstat(articleDir);
  if (rootStats.isSymbolicLink()) {
    throw new Error("Private article directory must not be a symbolic link.");
  }
  if (!rootStats.isDirectory()) {
    throw new Error(`Private article path is not a directory: ${articleDir}`);
  }
  const files: string[] = [];
  await walk(articleDir, articleDir, files);
  const generated = files.filter((file) =>
    GENERATED_FILES.has(path.basename(file))
  );
  if (generated.length > 0) {
    throw new Error(
      `Private article contains generated output that must not be synced:\n${
        generated.map((file) => `- ${file}`).join("\n")
      }`
    );
  }
  await validateLocalReferences(articleDir, markdown);
  return {
    files,
    warnings: findPublicationWarnings(markdown),
  };
}

export function shouldCopyArticleFile(sourcePath: string): boolean {
  const base = path.basename(sourcePath);
  if (base === ".DS_Store" || base === ".git") return false;
  return !GENERATED_FILES.has(base);
}

async function walk(
  root: string,
  directory: string,
  files: string[]
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Private article must not contain symbolic links: ${relativePath}`
      );
    }
    if (entry.isDirectory()) {
      await walk(root, filePath, files);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}

async function validateLocalReferences(
  articleDir: string,
  markdown: string
): Promise<void> {
  const references = new Set<string>();
  const markdownPattern = /(?:!\[[^\]]*\]|\[[^\]]*\])\((\.\/(?:assets|components)\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const htmlPattern = /\b(?:src|href)=["'](\.\/(?:assets|components)\/[^"'?#]+)[^"']*["']/g;
  let match;
  while ((match = markdownPattern.exec(markdown))) references.add(match[1]);
  while ((match = htmlPattern.exec(markdown))) references.add(match[1]);

  const missing: string[] = [];
  for (const reference of references) {
    const clean = reference.split(/[?#]/, 1)[0];
    const resolved = path.resolve(articleDir, clean);
    const rootWithSeparator = `${path.resolve(articleDir)}${path.sep}`;
    if (!resolved.startsWith(rootWithSeparator)) {
      throw new Error(`Article reference escapes its directory: ${reference}`);
    }
    try {
      await fs.access(resolved);
    } catch {
      missing.push(reference);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Article references missing local files:\n${
        missing.map((reference) => `- ${reference}`).join("\n")
      }`
    );
  }
}

function findPublicationWarnings(markdown: string): string[] {
  const warnings: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/\bCONFIDENTIAL\b/i, "Contains the marker CONFIDENTIAL."],
    [/\bDO NOT PUBLISH\b/i, "Contains the marker DO NOT PUBLISH."],
    [/\bPRIVATE\s*:/i, "Contains a PRIVATE: marker."],
    [/(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/i, "Contains a localhost URL."],
    [/\/__private\/articles\//i, "Contains a private preview URL."],
  ];
  for (const [pattern, message] of rules) {
    if (pattern.test(markdown)) warnings.push(message);
  }
  return warnings;
}
