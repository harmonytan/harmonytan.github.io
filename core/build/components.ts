import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { assertSafeName } from "./utils.ts";
import {
  normalizeComponentProps,
  validateComponentManifest,
} from "./component-contract.ts";
import type {
  ComponentManifest,
  ComponentProps,
  ComponentScope,
} from "./component-contract.ts";

export interface ThemeManifest {
  id: string;
  capabilities: string[];
  [key: string]: unknown;
}

export interface ComponentAsset {
  reference: string;
  styleHref: string;
  clientHref: string;
}

export interface ComponentContext {
  props: ComponentProps;
  content: string;
  article: {
    slug: string;
  };
  theme: ThemeManifest;
}

export interface ComponentContextWithEscape extends ComponentContext {
  escape: (value: unknown) => string;
}

export interface ComponentModule {
  validate?: (context: ComponentContext) => void | Promise<void>;
  render: (context: ComponentContextWithEscape) => string | Promise<string>;
}

interface LoadedComponent {
  reference: string;
  manifest: ComponentManifest;
  module: ComponentModule;
  hasStyle: boolean;
  hasClient: boolean;
  publicPath: (file: string) => string;
  escape: (value: unknown) => string;
}

interface ComponentRegistryOptions {
  root: string;
  articleDir: string;
  theme: ThemeManifest;
  articleSlug: string;
}

export class ComponentRegistry {
  readonly root: string;
  readonly articleDir: string;
  readonly theme: ThemeManifest;
  readonly articleSlug: string;
  readonly cache = new Map<string, LoadedComponent>();
  readonly used = new Map<string, LoadedComponent>();

  constructor({
    root,
    articleDir,
    theme,
    articleSlug,
  }: ComponentRegistryOptions) {
    this.root = root;
    this.articleDir = articleDir;
    this.theme = theme;
    this.articleSlug = articleSlug;
  }

  async render(
    reference: string,
    props: Record<string, unknown>,
    content: string
  ): Promise<string> {
    const component = await this.load(reference);
    const missing = component.manifest.requires.filter(
      (capability) => !this.theme.capabilities.includes(capability)
    );

    if (missing.length > 0) {
      if (component.manifest.fallback === "content") return content;
      throw new Error(
        `${this.articleSlug}: component "${reference}" requires ${missing
          .map((item) => `"${item}"`)
          .join(", ")}, but theme "${this.theme.id}" does not provide it.`
      );
    }

    const allowedThemes = component.manifest.themes?.only;
    if (Array.isArray(allowedThemes) && !allowedThemes.includes(this.theme.id)) {
      throw new Error(
        `${this.articleSlug}: component "${reference}" only supports themes: ${allowedThemes.join(", ")}.`
      );
    }

    const normalizedProps = normalizeComponentProps(
      reference,
      component.manifest.props,
      props
    );
    const context = {
      props: normalizedProps,
      content,
      article: { slug: this.articleSlug },
      theme: this.theme,
    };
    if (component.module.validate) {
      try {
        await component.module.validate(context);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${this.articleSlug}: component "${reference}" rejected its properties: ${message}`
        );
      }
    }
    const html = await component.module.render({
      ...context,
      escape: component.escape,
    });

    this.used.set(reference, component);
    return html;
  }

  getAssets(): ComponentAsset[] {
    return [...this.used.values()].map((component) => ({
      reference: component.reference,
      styleHref: component.hasStyle ? component.publicPath("style.css") : "",
      clientHref: component.hasClient ? component.publicPath("client.ts") : "",
    }));
  }

  async load(reference: string): Promise<LoadedComponent> {
    const cached = this.cache.get(reference);
    if (cached) return cached;

    const match = String(reference).match(/^(shared|local)\.([a-z0-9][a-z0-9-]*)$/);
    if (!match) {
      throw new Error(
        `${this.articleSlug}: component name must be "shared.name" or "local.name": ${reference}`
      );
    }

    const scope = match[1] as ComponentScope;
    const name = match[2];
    assertSafeName(name, "Component name");
    const directory = scope === "shared"
      ? path.join(this.root, "components", name)
      : path.join(this.articleDir, "components", name);
    const manifestPath = path.join(directory, "component.yaml");
    const readmePath = path.join(directory, "README.md");
    const modulePath = path.join(directory, "index.ts");

    const [manifestSource] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.access(readmePath),
      fs.access(modulePath),
    ]).catch((error: unknown) => {
      throw new Error(
        `${this.articleSlug}: incomplete component "${reference}": ${errorMessage(error)}`
      );
    });

    const manifest = validateComponentManifest(parseYaml(manifestSource), {
      manifestPath,
      expectedName: name,
      expectedScope: scope,
    });
    const imported: Partial<ComponentModule> = await import(
      `${pathToFileURL(modulePath).href}?v=${Date.now()}`
    );
    if (typeof imported.render !== "function") {
      throw new Error(`${modulePath} must export a render() function.`);
    }
    if (imported.validate !== undefined && typeof imported.validate !== "function") {
      throw new Error(`${modulePath} validate export must be a function.`);
    }

    const module = imported as ComponentModule;
    const publicPath = (file: string) => scope === "shared"
      ? `../../components/${name}/${file}`
      : `./components/${name}/${file}`;
    const [hasStyle, hasClient] = await Promise.all([
      exists(path.join(directory, "style.css")),
      exists(path.join(directory, "client.ts")),
    ]);

    const component = {
      reference,
      manifest,
      module,
      hasStyle,
      hasClient,
      publicPath,
      escape: escapeHtml,
    };
    this.cache.set(reference, component);
    return component;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
