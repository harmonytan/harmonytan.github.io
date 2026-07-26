#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const FORBIDDEN = [
  "__workbench",
  "/__workbench/api/catalog",
  'id="workbench-app"',
];

export async function checkDistForWorkbench(dist = DIST): Promise<void> {
  const files = await listFiles(dist);
  const leakedPaths = files
    .map((file) => path.relative(dist, file).split(path.sep).join("/"))
    .filter((file) => FORBIDDEN.some((token) => file.includes(token)));
  const leakedContent: string[] = [];

  for (const file of files) {
    if (!/\.(?:html|css|js|mjs|json|txt|xml|svg)$/.test(file)) continue;
    const source = await fs.readFile(file, "utf8");
    if (FORBIDDEN.some((token) => source.includes(token))) {
      leakedContent.push(path.relative(dist, file).split(path.sep).join("/"));
    }
  }

  const leaks = [...new Set([...leakedPaths, ...leakedContent])];
  if (leaks.length > 0) {
    throw new Error(
      `Local Component Workbench leaked into dist:\n${
        leaks.map((file) => `- ${file}`).join("\n")
      }`
    );
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  }));
  return nested.flat();
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  checkDistForWorkbench()
    .then(() => console.log("Validated production output: Workbench is absent."))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
