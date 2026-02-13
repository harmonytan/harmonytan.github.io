#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const verbose = args.has("--verbose");

const hashCache = new Map();
const missingAssets = new Set();

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((name) => name.endsWith(".html"))
  .map((name) => path.join(ROOT, name));

let changedFiles = 0;

for (const htmlPath of htmlFiles) {
  const original = fs.readFileSync(htmlPath, "utf8");
  const next = injectAssetHashes(original, htmlPath);

  if (next === original) {
    continue;
  }

  changedFiles += 1;
  if (!checkOnly) {
    fs.writeFileSync(htmlPath, next, "utf8");
  }
  if (verbose) {
    const mode = checkOnly ? "Would update" : "Updated";
    console.log(`${mode}: ${path.relative(ROOT, htmlPath)}`);
  }
}

if (missingAssets.size > 0) {
  console.warn("Skipped missing local assets:");
  for (const item of [...missingAssets].sort()) {
    console.warn(`- ${item}`);
  }
}

if (checkOnly) {
  if (changedFiles > 0) {
    console.log(`Hash injection check failed: ${changedFiles} HTML file(s) need updates.`);
    process.exit(1);
  }
  console.log("Hash injection check passed.");
  process.exit(0);
}

console.log(`Hash injection complete: ${changedFiles} HTML file(s) updated.`);

function injectAssetHashes(html, htmlPath) {
  const attrRegex = /\b(src|href)=("([^"]*)"|'([^']*)')/g;
  return html.replace(attrRegex, (full, attrName, wrapped, dqValue, sqValue) => {
    const quote = wrapped[0];
    const rawUrl = dqValue ?? sqValue ?? "";
    const updatedUrl = versionedAssetUrl(rawUrl, htmlPath);
    if (updatedUrl === rawUrl) {
      return full;
    }
    return `${attrName}=${quote}${updatedUrl}${quote}`;
  });
}

function versionedAssetUrl(url, htmlPath) {
  if (!url || isExternalUrl(url)) {
    return url;
  }

  const { pathname, query, fragment } = splitUrl(url);
  if (!/\.(js|css)$/i.test(pathname)) {
    return url;
  }

  const assetPath = resolveLocalAssetPath(pathname, htmlPath);
  if (!assetPath || !fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    missingAssets.add(path.relative(ROOT, htmlPath) + " -> " + pathname);
    return url;
  }

  const hash = getContentHash(assetPath);
  const params = new URLSearchParams(query);
  params.set("v", hash);
  const queryString = params.toString();

  return `${pathname}${queryString ? `?${queryString}` : ""}${fragment}`;
}

function splitUrl(url) {
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutFragment = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutFragment.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;
  const query = queryIndex >= 0 ? withoutFragment.slice(queryIndex + 1) : "";
  return { pathname, query, fragment };
}

function isExternalUrl(url) {
  return (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) ||
    /^(?:data:|mailto:|javascript:|about:|chrome-extension:|#)/i.test(url)
  );
}

function resolveLocalAssetPath(pathname, htmlPath) {
  if (pathname.startsWith("/")) {
    return path.join(ROOT, pathname.replace(/^\/+/, ""));
  }
  return path.resolve(path.dirname(htmlPath), pathname);
}

function getContentHash(assetPath) {
  const cached = hashCache.get(assetPath);
  if (cached) {
    return cached;
  }

  const content = fs.readFileSync(assetPath);
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 10);
  hashCache.set(assetPath, hash);
  return hash;
}
