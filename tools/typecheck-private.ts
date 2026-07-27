#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import { resolvePrivateArticlesDir } from "../core/private-content.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface TypecheckPrivateOptions {
  root?: string;
  privateArticlesDir?: string;
}

export async function typecheckPrivateContent({
  root = ROOT,
  privateArticlesDir = resolvePrivateArticlesDir(root),
}: TypecheckPrivateOptions = {}): Promise<number> {
  const configPath = path.join(root, "tsconfig.private.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(formatDiagnostics([config.error], root));

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    { noEmit: true },
    configPath
  );
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors, root));
  }

  const privateFiles = await collectTypeScriptFiles(privateArticlesDir);
  const rootNames = [...new Set([...parsed.fileNames, ...privateFiles])];
  const program = ts.createProgram({
    rootNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics, root));
  }
  return privateFiles.length;
}

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Private TypeScript source must not be a symbolic link: ${filePath}`
      );
    }
    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(filePath));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(filePath);
    }
  }
  return files;
}

function formatDiagnostics(
  diagnostics: readonly ts.Diagnostic[],
  root: string
): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => path.relative(root, fileName),
    getCurrentDirectory: () => root,
    getNewLine: () => "\n",
  }).trim();
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  typecheckPrivateContent()
    .then((count) => {
      console.log(`Type-checked ${count} private TypeScript source file(s).`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
