import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { assertSafeName } from "./utils.mjs";

export class ComponentRegistry {
  constructor({ root, articleDir, theme, articleSlug }) {
    this.root = root;
    this.articleDir = articleDir;
    this.theme = theme;
    this.articleSlug = articleSlug;
    this.cache = new Map();
    this.used = new Map();
  }

  async render(reference, props, content) {
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

    const html = await component.module.render({
      props,
      content,
      article: { slug: this.articleSlug },
      theme: this.theme,
      escape: component.escape,
    });

    this.used.set(reference, component);
    return html;
  }

  getAssets() {
    return [...this.used.values()].map((component) => ({
      reference: component.reference,
      styleHref: component.hasStyle ? component.publicPath("style.css") : "",
      clientHref: component.hasClient ? component.publicPath("client.js") : "",
    }));
  }

  async load(reference) {
    if (this.cache.has(reference)) return this.cache.get(reference);

    const match = String(reference).match(/^(shared|local)\.([a-z0-9][a-z0-9-]*)$/);
    if (!match) {
      throw new Error(
        `${this.articleSlug}: component name must be "shared.name" or "local.name": ${reference}`
      );
    }

    const [, scope, name] = match;
    assertSafeName(name, "Component name");
    const directory = scope === "shared"
      ? path.join(this.root, "components", name)
      : path.join(this.articleDir, "components", name);
    const manifestPath = path.join(directory, "component.yaml");
    const readmePath = path.join(directory, "README.md");
    const modulePath = path.join(directory, "index.mjs");

    const [manifestSource] = await Promise.all([
      fs.readFile(manifestPath, "utf8"),
      fs.access(readmePath),
      fs.access(modulePath),
    ]).catch((error) => {
      throw new Error(`${this.articleSlug}: incomplete component "${reference}": ${error.message}`);
    });

    const manifest = parseYaml(manifestSource) ?? {};
    if (manifest.name !== name) {
      throw new Error(
        `${manifestPath}: manifest name "${manifest.name}" does not match directory "${name}".`
      );
    }
    if (manifest.scope !== scope) {
      throw new Error(
        `${manifestPath}: manifest scope must be "${scope}" for reference "${reference}".`
      );
    }

    manifest.requires = Array.isArray(manifest.requires) ? manifest.requires : [];
    const imported = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
    if (typeof imported.render !== "function") {
      throw new Error(`${modulePath} must export a render() function.`);
    }

    const publicPath = (file) => scope === "shared"
      ? `../../components/${name}/${file}`
      : `./components/${name}/${file}`;
    const [hasStyle, hasClient] = await Promise.all([
      exists(path.join(directory, "style.css")),
      exists(path.join(directory, "client.js")),
    ]);

    const component = {
      reference,
      manifest,
      module: imported,
      hasStyle,
      hasClient,
      publicPath,
      escape: escapeHtml,
    };
    this.cache.set(reference, component);
    return component;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

