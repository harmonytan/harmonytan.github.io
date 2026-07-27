import fs from "node:fs/promises";
import path from "node:path";

export const PRIVATE_CONTENT_DIRECTORY = "private-content";
export const PRIVATE_ARTICLES_DIRECTORY = "articles";
export const PRIVATE_ROUTE_PREFIX = "/__private/articles";

export function resolvePrivateArticlesDir(
  root: string,
  configuredPath = process.env.BLOG_PRIVATE_ARTICLES_DIR
): string {
  const value = String(configuredPath ?? "").trim();
  return value
    ? path.resolve(root, value)
    : path.join(root, PRIVATE_CONTENT_DIRECTORY, PRIVATE_ARTICLES_DIRECTORY);
}

export async function requirePrivateArticlesDir(
  root: string,
  configuredPath = process.env.BLOG_PRIVATE_ARTICLES_DIR
): Promise<string> {
  const directory = resolvePrivateArticlesDir(root, configuredPath);
  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(
      `Private articles directory was not found: ${directory}\n`
      + `Clone the private writing repository into "${PRIVATE_CONTENT_DIRECTORY}/" `
      + `or set BLOG_PRIVATE_ARTICLES_DIR.`
    );
  }
  return directory;
}

export function privateArticleRoute(slug: string): string {
  return `${PRIVATE_ROUTE_PREFIX}/${slug}/`;
}

export function publicArticleKey(slug: string): string {
  return `public:${slug}`;
}

export function privateArticleKey(slug: string): string {
  return `private:${slug}`;
}
