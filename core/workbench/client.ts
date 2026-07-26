import type {
  ComponentPropDefinition,
  ComponentPropValue,
} from "../build/component-contract.ts";
import type {
  WorkbenchArticle,
  WorkbenchCatalog,
  WorkbenchComponent,
  WorkbenchRenderResponse,
  WorkbenchTheme,
} from "./types.ts";

interface WorkbenchState {
  catalog: WorkbenchCatalog;
  themeId: string;
  articleSlug: string;
  componentKey: string;
  showIncompatible: boolean;
  query: string;
  props: Record<string, ComponentPropValue | undefined>;
  body: string;
  markdown: string;
}

const app = requireElement<HTMLDivElement>("#workbench-app");
let state: WorkbenchState;
let renderSequence = 0;
let renderTimer: ReturnType<typeof setTimeout> | undefined;

void initialize();

async function initialize(): Promise<void> {
  try {
    const catalog = await fetchJson<WorkbenchCatalog>(
      "/__workbench/api/catalog"
    );
    if (catalog.themes.length === 0) {
      throw new Error("No Themes were discovered.");
    }
    if (catalog.components.length === 0) {
      throw new Error("No registered components were discovered.");
    }

    const params = new URLSearchParams(location.search);
    const requestedArticle = catalog.articles.find(
      (article) => article.slug === params.get("article")
    );
    const requestedTheme = catalog.themes.find(
      (theme) => theme.id === params.get("theme")
    );
    const articleSlug = requestedArticle?.slug ?? "";
    const themeId = requestedTheme?.id
      ?? requestedArticle?.theme
      ?? catalog.themes[0].id;
    const visible = visibleComponents(catalog, articleSlug);
    const requestedComponent = visible.find(
      (component) => component.key === params.get("component")
    );
    const component = requestedComponent
      ?? visible.find((item) => isCompatible(item, findTheme(catalog, themeId)))
      ?? visible[0];

    state = {
      catalog,
      themeId,
      articleSlug,
      componentKey: component.key,
      showIncompatible: false,
      query: "",
      props: {},
      body: "",
      markdown: "",
    };
    loadComponentDefaults(component);
    renderApplication();
    schedulePreview(0);
  } catch (error) {
    app.innerHTML = `<main class="fatal-error">
      <p class="eyebrow">Workbench unavailable</p>
      <h1>Could not load the component catalog.</h1>
      <p>${escapeHtml(errorMessage(error))}</p>
    </main>`;
  }
}

function renderApplication(): void {
  const component = currentComponent();
  app.innerHTML = `
    <div class="workbench-shell">
      <header class="topbar">
        <a class="brand" href="/" aria-label="Back to the blog">
          <img class="brand-mark" src="/favicon.svg" alt="" aria-hidden="true">
          <span><strong>Component Workbench</strong><small>Local authoring environment</small></span>
        </a>
        <div class="context-controls">
          <label>
            <span>Theme</span>
            <select id="theme-select">${state.catalog.themes.map((theme) =>
              `<option value="${escapeAttribute(theme.id)}"${
                theme.id === state.themeId ? " selected" : ""
              }>${escapeHtml(theme.label)}</option>`
            ).join("")}</select>
          </label>
          <label>
            <span>Article context</span>
            <select id="article-select">
              <option value="">Shared components only</option>
              ${state.catalog.articles.map((article) =>
                `<option value="${escapeAttribute(article.slug)}"${
                  article.slug === state.articleSlug ? " selected" : ""
                }>${escapeHtml(article.title)}${article.draft ? " · Draft" : ""}</option>`
              ).join("")}
            </select>
          </label>
        </div>
        <a class="exit-link" href="/">Exit <span aria-hidden="true">↗</span></a>
      </header>

      <aside class="component-browser">
        <div class="browser-heading">
          <p class="eyebrow">Registry</p>
          <strong>${state.catalog.components.length} components</strong>
        </div>
        <label class="search-field">
          <span class="sr-only">Search components</span>
          <input id="component-search" type="search" value="${escapeAttribute(state.query)}" placeholder="Filter components">
        </label>
        <div class="component-list" id="component-list"></div>
        <label class="compatibility-toggle">
          <input id="show-incompatible" type="checkbox"${state.showIncompatible ? " checked" : ""}>
          <span>Show incompatible components</span>
        </label>
      </aside>

      <main class="editor-panel">
        <div class="component-heading">
          <div>
            <p class="eyebrow">${component.scope === "shared" ? "Shared component" : "Article-private component"}</p>
            <h1>${escapeHtml(titleCase(component.name))}</h1>
            <p>${escapeHtml(component.description)}</p>
          </div>
          <span class="reference-pill">${escapeHtml(component.reference)}</span>
        </div>
        <div id="compatibility-message"></div>
        <form id="component-form" autocomplete="off">
          ${renderPropertyFields(component)}
          <label class="body-field">
            <span>Markdown body</span>
            <textarea id="component-body" rows="10" spellcheck="true">${escapeHtml(state.body)}</textarea>
          </label>
        </form>
        <div class="editor-actions">
          <button class="button button--quiet" id="reset-button" type="button">Reset</button>
          <button class="button button--primary" id="copy-button" type="button">Copy Markdown</button>
        </div>
        <details class="documentation">
          <summary>Authoring documentation</summary>
          <pre>${escapeHtml(component.readme)}</pre>
        </details>
      </main>

      <section class="preview-panel" aria-labelledby="preview-title">
        <div class="preview-heading">
          <div>
            <p class="eyebrow">Rendered output</p>
            <h2 id="preview-title">Live preview</h2>
          </div>
          <span id="preview-status" class="preview-status">Rendering…</span>
        </div>
        <div id="preview-error" class="preview-error" hidden></div>
        <iframe id="preview-frame" title="Rendered component preview"></iframe>
        <details class="markdown-output">
          <summary>Generated Markdown</summary>
          <pre id="markdown-output"></pre>
        </details>
      </section>
    </div>`;

  bindApplicationEvents();
  renderComponentList();
  renderCompatibilityMessage();
}

function bindApplicationEvents(): void {
  requireElement<HTMLSelectElement>("#theme-select").addEventListener(
    "change",
    (event) => {
      state.themeId = (event.currentTarget as HTMLSelectElement).value;
      ensureSelectedComponent();
      renderApplication();
      syncUrl();
      schedulePreview(0);
    }
  );
  requireElement<HTMLSelectElement>("#article-select").addEventListener(
    "change",
    (event) => {
      state.articleSlug = (event.currentTarget as HTMLSelectElement).value;
      const article = currentArticle();
      if (article) state.themeId = article.theme;
      ensureSelectedComponent();
      loadComponentDefaults(currentComponent());
      renderApplication();
      syncUrl();
      schedulePreview(0);
    }
  );
  requireElement<HTMLInputElement>("#component-search").addEventListener(
    "input",
    (event) => {
      state.query = (event.currentTarget as HTMLInputElement).value;
      renderComponentList();
    }
  );
  requireElement<HTMLInputElement>("#show-incompatible").addEventListener(
    "change",
    (event) => {
      state.showIncompatible = (event.currentTarget as HTMLInputElement).checked;
      renderComponentList();
    }
  );
  requireElement<HTMLFormElement>("#component-form").addEventListener(
    "input",
    () => {
      readEditorState();
      schedulePreview();
    }
  );
  requireElement<HTMLButtonElement>("#reset-button").addEventListener(
    "click",
    () => {
      loadComponentDefaults(currentComponent());
      renderApplication();
      schedulePreview(0);
    }
  );
  requireElement<HTMLButtonElement>("#copy-button").addEventListener(
    "click",
    () => void copyMarkdown()
  );
}

function renderComponentList(): void {
  const list = requireElement<HTMLDivElement>("#component-list");
  const theme = currentTheme();
  const query = state.query.trim().toLowerCase();
  const candidates = visibleComponents(state.catalog, state.articleSlug)
    .filter((component) =>
      !query
      || component.name.includes(query)
      || component.description.toLowerCase().includes(query)
      || component.reference.includes(query)
    )
    .filter((component) =>
      state.showIncompatible || isCompatible(component, theme)
    );
  const shared = candidates.filter((component) => component.scope === "shared");
  const local = candidates.filter((component) => component.scope === "local");

  list.innerHTML = [
    renderComponentGroup("Shared library", shared),
    state.articleSlug
      ? renderComponentGroup("Private to this article", local)
      : "",
    candidates.length === 0
      ? `<p class="empty-list">No components match this context.</p>`
      : "",
  ].join("");

  list.querySelectorAll<HTMLButtonElement>("[data-component-key]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        const component = state.catalog.components.find(
          (item) => item.key === button.dataset.componentKey
        );
        if (!component) return;
        state.componentKey = component.key;
        loadComponentDefaults(component);
        renderApplication();
        syncUrl();
        schedulePreview(0);
      });
    }
  );
}

function renderComponentGroup(
  label: string,
  components: WorkbenchComponent[]
): string {
  if (components.length === 0) return "";
  return `<section class="component-group">
    <h2>${escapeHtml(label)} <span>${components.length}</span></h2>
    ${components.map((component) => {
      const compatible = isCompatible(component, currentTheme());
      return `<button type="button" class="component-item${
        component.key === state.componentKey ? " is-selected" : ""
      }" data-component-key="${escapeAttribute(component.key)}">
        <span><strong>${escapeHtml(titleCase(component.name))}</strong>
          <small>${escapeHtml(component.description)}</small>
        </span>
        <i class="${compatible ? "status-dot" : "status-dot is-incompatible"}" title="${
          compatible ? "Compatible" : "Incompatible"
        }"></i>
      </button>`;
    }).join("")}
  </section>`;
}

function renderPropertyFields(component: WorkbenchComponent): string {
  const fields = Object.entries(component.props);
  if (fields.length === 0) {
    return `<p class="empty-properties">This component has no configurable properties.</p>`;
  }
  return `<fieldset class="property-grid">
    <legend>Properties</legend>
    ${fields.map(([name, definition]) =>
      renderPropertyField(name, definition, state.props[name])
    ).join("")}
  </fieldset>`;
}

function renderPropertyField(
  name: string,
  definition: ComponentPropDefinition,
  value: ComponentPropValue | undefined
): string {
  const meta = [
    definition.required ? "Required" : "Optional",
    definition.type,
  ].join(" · ");
  const description = definition.description
    ? `<small>${escapeHtml(definition.description)}</small>`
    : "";
  let control: string;

  if (definition.type === "enum") {
    control = `<select data-prop="${escapeAttribute(name)}">
      ${definition.default === undefined && !definition.required
        ? `<option value="">Not set</option>`
        : ""}
      ${(definition.values ?? []).map((option) =>
        `<option value="${escapeAttribute(option)}"${
          value === option ? " selected" : ""
        }>${escapeHtml(titleCase(option))}</option>`
      ).join("")}
    </select>`;
  } else if (definition.type === "boolean") {
    control = `<select data-prop="${escapeAttribute(name)}">
      ${definition.default === undefined && !definition.required
        ? `<option value="">Not set</option>`
        : ""}
      <option value="true"${value === true ? " selected" : ""}>True</option>
      <option value="false"${value === false ? " selected" : ""}>False</option>
    </select>`;
  } else {
    const inputType = definition.type === "number" || definition.type === "integer"
      ? "number"
      : definition.type === "url"
        ? "url"
        : "text";
    const step = definition.type === "integer"
      ? ` step="1"`
      : definition.type === "number"
        ? ` step="any"`
        : "";
    const bounds = typeof definition.min === "number"
      ? ` min="${definition.min}"`
      : "";
    const upperBound = typeof definition.max === "number"
      ? ` max="${definition.max}"`
      : "";
    control = `<input data-prop="${escapeAttribute(name)}" type="${inputType}" value="${
      escapeAttribute(value ?? "")
    }"${step}${bounds}${upperBound}>`;
  }

  return `<label class="property-field">
    <span><strong>${escapeHtml(titleCase(name))}</strong><em>${escapeHtml(meta)}</em></span>
    ${control}
    ${description}
  </label>`;
}

function renderCompatibilityMessage(): void {
  const container = requireElement<HTMLDivElement>("#compatibility-message");
  const component = currentComponent();
  const theme = currentTheme();
  const reasons = incompatibilityReasons(component, theme);
  container.innerHTML = reasons.length
    ? `<div class="compatibility-warning">
        <strong>Unavailable in ${escapeHtml(theme.label)}</strong>
        <span>${escapeHtml(reasons.join(" "))}</span>
      </div>`
    : "";
}

function readEditorState(): void {
  const component = currentComponent();
  const props: Record<string, ComponentPropValue | undefined> = {};
  for (const [name, definition] of Object.entries(component.props)) {
    const control = document.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(`[data-prop="${CSS.escape(name)}"]`);
    if (!control) continue;
    const raw = control.value;
    if (raw === "" && definition.default === undefined && !definition.required) {
      props[name] = undefined;
    } else if (definition.type === "boolean") {
      props[name] = raw === "true";
    } else if (definition.type === "number" || definition.type === "integer") {
      props[name] = raw === "" ? undefined : Number(raw);
    } else {
      props[name] = raw;
    }
  }
  state.props = props;
  state.body = requireElement<HTMLTextAreaElement>("#component-body").value;
}

function loadComponentDefaults(component: WorkbenchComponent): void {
  const example = component.examples[0];
  const props: Record<string, ComponentPropValue | undefined> = {};
  for (const [name, definition] of Object.entries(component.props)) {
    const exampleValue = example?.props[name];
    if (exampleValue !== undefined) {
      props[name] = coerceExampleValue(exampleValue, definition);
    } else {
      props[name] = definition.default;
    }
  }
  state.props = props;
  state.body = example?.body
    ?? "Write the component content here. **Markdown** is supported.";
  state.markdown = "";
}

function schedulePreview(delay = 180): void {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => void updatePreview(), delay);
}

async function updatePreview(): Promise<void> {
  const sequence = ++renderSequence;
  const status = requireElement<HTMLSpanElement>("#preview-status");
  const errorPanel = requireElement<HTMLDivElement>("#preview-error");
  status.textContent = "Rendering…";
  status.classList.add("is-busy");
  errorPanel.hidden = true;

  try {
    const props = Object.fromEntries(
      Object.entries(state.props).filter(([, value]) => value !== undefined)
    );
    const response = await fetchJson<WorkbenchRenderResponse>(
      "/__workbench/api/render",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: state.themeId,
          ...(state.articleSlug ? { articleSlug: state.articleSlug } : {}),
          componentKey: state.componentKey,
          props,
          body: state.body,
        }),
      }
    );
    if (sequence !== renderSequence) return;
    state.markdown = response.markdown;
    requireElement<HTMLIFrameElement>("#preview-frame").srcdoc = response.document;
    requireElement<HTMLElement>("#markdown-output").textContent = response.markdown;
    status.textContent = "Ready";
    status.classList.remove("is-busy");
  } catch (error) {
    if (sequence !== renderSequence) return;
    status.textContent = "Invalid configuration";
    status.classList.remove("is-busy");
    errorPanel.textContent = errorMessage(error);
    errorPanel.hidden = false;
  }
}

async function copyMarkdown(): Promise<void> {
  if (!state.markdown) await updatePreview();
  if (!state.markdown) return;
  await navigator.clipboard.writeText(state.markdown);
  const button = requireElement<HTMLButtonElement>("#copy-button");
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = "Copy Markdown";
  }, 1400);
}

function ensureSelectedComponent(): void {
  const visible = visibleComponents(state.catalog, state.articleSlug);
  if (visible.some((component) => component.key === state.componentKey)) return;
  state.componentKey = (
    visible.find((component) => isCompatible(component, currentTheme()))
    ?? visible[0]
  ).key;
}

function currentTheme(): WorkbenchTheme {
  return findTheme(state.catalog, state.themeId);
}

function currentArticle(): WorkbenchArticle | undefined {
  return state.catalog.articles.find(
    (article) => article.slug === state.articleSlug
  );
}

function currentComponent(): WorkbenchComponent {
  const component = state.catalog.components.find(
    (item) => item.key === state.componentKey
  );
  if (!component) throw new Error("Selected component is no longer available.");
  return component;
}

function visibleComponents(
  catalog: WorkbenchCatalog,
  articleSlug: string
): WorkbenchComponent[] {
  return catalog.components.filter(
    (component) =>
      component.scope === "shared"
      || component.ownerArticle === articleSlug
  );
}

function isCompatible(
  component: WorkbenchComponent,
  theme: WorkbenchTheme
): boolean {
  return incompatibilityReasons(component, theme).length === 0;
}

function incompatibilityReasons(
  component: WorkbenchComponent,
  theme: WorkbenchTheme
): string[] {
  const reasons: string[] = [];
  const missing = component.requires.filter(
    (requirement) => !theme.capabilities.includes(requirement)
  );
  if (missing.length > 0) {
    reasons.push(`Missing capabilities: ${missing.join(", ")}.`);
  }
  if (component.themes && !component.themes.only.includes(theme.id)) {
    reasons.push(`Supported Themes: ${component.themes.only.join(", ")}.`);
  }
  return reasons;
}

function findTheme(catalog: WorkbenchCatalog, id: string): WorkbenchTheme {
  const theme = catalog.themes.find((item) => item.id === id);
  if (!theme) throw new Error(`Theme "${id}" is not registered.`);
  return theme;
}

function coerceExampleValue(
  value: string,
  definition: ComponentPropDefinition
): ComponentPropValue {
  if (definition.type === "boolean") return value === "true";
  if (definition.type === "number" || definition.type === "integer") {
    return Number(value);
  }
  return value;
}

function syncUrl(): void {
  const params = new URLSearchParams();
  params.set("theme", state.themeId);
  if (state.articleSlug) params.set("article", state.articleSlug);
  params.set("component", state.componentKey);
  history.replaceState(null, "", `${location.pathname}?${params}`);
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Workbench element: ${selector}`);
  return element;
}

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: unknown): string {
  return escapeHtml(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
