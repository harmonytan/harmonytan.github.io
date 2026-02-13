import { BASE_URL, formatDate, parseFrontMatter, setDocumentTitle } from "./site.js";
import { renderMarkdown } from "./markdown.js";

const STORAGE_KEY = "hm-blog-editor-draft-v1";
const THEME_STORAGE_KEY = "hm-blog-theme";
const PREVIEW_RETRY_INTERVAL_MS = 180;
const WORDS_PER_MINUTE = 240;
const AUTO_SAVE_DELAY_MS = 1400;

const editorInput = document.querySelector("[data-editor-input]");
const previewBody = document.querySelector("[data-preview-body]");
const previewTitle = document.querySelector("[data-preview-title]");
const previewDate = document.querySelector("[data-preview-date]");
const previewCategory = document.querySelector("[data-preview-category]");
const previewMeta = document.querySelector("[data-preview-meta]");
const statusNode = document.querySelector("[data-editor-status]");
const docNameNode = document.querySelector("[data-doc-name]");
const fileInput = document.querySelector("[data-file-input]");
const sourceSelect = document.querySelector("[data-source-select]");
const postSelect = document.querySelector("[data-post-select]");
const panelsNode = document.querySelector(".editor-panels");
const sourcePanelNode = document.querySelector(".editor-panel-source");
const slashMenuNode = document.querySelector("[data-slash-menu]");
const slashListNode = document.querySelector("[data-slash-list]");
const slashHintNode = document.querySelector("[data-slash-hint]");
const desktopLayoutQuery = window.matchMedia("(max-width: 900px)");
const themePreferenceQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

const actionNodes = {
  newDoc: document.querySelector('[data-action="new"]'),
  open: document.querySelector('[data-action="open"]'),
  save: document.querySelector('[data-action="save"]'),
  saveAs: document.querySelector('[data-action="save-as"]'),
  loadPost: document.querySelector('[data-action="load-post"]'),
  toggleTheme: document.querySelector('[data-action="toggle-theme"]'),
};
const themeIconNode = document.querySelector("[data-theme-icon]");
const CONTENT_SOURCES = {
  posts: {
    label: "posts/",
    indexPath: "data/posts.json",
    contentDir: "posts",
    chooseText: "Choose a post",
    emptyText: "No posts found",
    indexErrorText: "Cannot load posts index",
  },
  drafts: {
    label: "drafts/",
    indexPath: "data/drafts.json",
    contentDir: "drafts",
    chooseText: "Choose a draft",
    emptyText: "No drafts found",
    indexErrorText: "Cannot load drafts index",
  },
};

const SUN_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />
  <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="12" y1="19" x2="12" y2="21.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="2.5" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="19" y1="12" x2="21.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="5.4" y1="5.4" x2="7.1" y2="7.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="16.9" y1="16.9" x2="18.6" y2="18.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="16.9" y1="7.1" x2="18.6" y2="5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="5.4" y1="18.6" x2="7.1" y2="16.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
</svg>
`;

const MOON_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 3
       A9 9 0 1 0 21 12
       A6.5 6.5 0 1 1 12 3Z"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
`;

const SLASH_COMMANDS = [
  {
    id: "math-inline",
    label: "Inline Math",
    aliases: ["math", "latex", "formula", "公式"],
    description: "Insert inline TeX formula",
    syntax: "$x^2 + y^2 = z^2$",
    template: "${{selection:x^2 + y^2 = z^2}}$",
  },
  {
    id: "math-block",
    label: "Math Block",
    aliases: ["equation", "display", "mathblock", "公式块"],
    description: "Insert display math block",
    syntax: "$$ ... $$",
    template: "$$\n{{selection:x^2 + y^2 = z^2}}\n$$",
  },
  {
    id: "bold",
    label: "Bold",
    aliases: ["strong", "加粗"],
    description: "Insert bold text",
    syntax: "**text**",
    template: "**{{selection:bold text}}**",
  },
  {
    id: "italic",
    label: "Italic",
    aliases: ["em", "斜体"],
    description: "Insert italic text",
    syntax: "*text*",
    template: "*{{selection:italic text}}*",
  },
  {
    id: "link",
    label: "Link",
    aliases: ["url", "超链接"],
    description: "Insert markdown link",
    syntax: "[title](https://example.com)",
    template: "[{{selection:link title}}](https://example.com)",
  },
  {
    id: "image",
    label: "Figure Image",
    aliases: ["img", "photo", "图片", "图"],
    description: "Insert image syntax supported by the renderer",
    syntax: "![Title | Caption](./assets/example.png \"Caption\"){width=70%}",
    template:
      "![{{selection:Title | Caption}}](./assets/example.png \"Caption\"){width=70%}",
  },
  {
    id: "inline-code",
    label: "Inline Code",
    aliases: ["code", "代码"],
    description: "Insert inline code",
    syntax: "`code`",
    template: "`{{selection:code}}`",
  },
  {
    id: "code-block",
    label: "Code Block",
    aliases: ["fence", "代码块"],
    description: "Insert fenced code block",
    syntax: "```lang ... ```",
    template: "```text\n{{selection:code here}}\n```",
  },
  {
    id: "quote",
    label: "Blockquote",
    aliases: ["引用", "blockquote"],
    description: "Insert quote block",
    syntax: "> quote",
    template: "> {{selection:quoted line}}",
  },
  {
    id: "list-bullet",
    label: "Bullet List",
    aliases: ["list", "ul", "列表"],
    description: "Insert bullet list item",
    syntax: "- item",
    template: "- {{selection:list item}}",
  },
  {
    id: "table",
    label: "Table",
    aliases: ["表格"],
    description: "Insert markdown table",
    syntax: "| A | B |",
    template:
      "| Column A | Column B |\n| --- | --- |\n| {{selection:Value A}} | Value B |",
  },
  {
    id: "hr",
    label: "Horizontal Rule",
    aliases: ["divider", "分隔线"],
    description: "Insert horizontal rule",
    syntax: "---",
    template: "---",
  },
  {
    id: "citation",
    label: "Citation",
    aliases: ["ref", "引用标注"],
    description: "Insert citation and reference entry",
    syntax: "[1] and [1]: https://...",
    template: "[{{selection:1}}]\n\n[1]: https://example.com",
  },
];

const state = {
  source: "",
  fileHandle: null,
  fileName: "untitled.md",
  dirty: false,
  lastSavedSource: "",
  renderTimer: null,
  mathRetryTimer: null,
  autoSaveTimer: null,
  autoSaveInFlight: false,
  autoSavePending: false,
  documentVersion: 0,
  slashMenuOpen: false,
  slashQuery: "",
  slashTriggerIndex: -1,
  slashItems: [],
  slashActiveIndex: 0,
};

const todayIso = new Date().toISOString().slice(0, 10);
const DEFAULT_TEMPLATE = `---
title: Untitled Draft
date: ${todayIso}
category: Notebook
toc: true
---

## Start here

Write your draft in this panel.
`;

bootstrap();

function bootstrap() {
  if (!editorInput) {
    return;
  }
  bindActions();
  syncThemeToggleUi();
  restoreDraft();
  loadPostOptions();
  updateWorkingAreaHeight();
  scheduleRender();
}

function bindActions() {
  editorInput.addEventListener("input", handleEditorInputChanged);
  editorInput.addEventListener("keydown", handleSlashMenuKeydown);
  editorInput.addEventListener("click", updateSlashMenu);
  editorInput.addEventListener("keyup", updateSlashMenu);
  editorInput.addEventListener("scroll", () => {
    if (state.slashMenuOpen) {
      positionSlashMenu();
    }
  });

  slashListNode?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  slashListNode?.addEventListener("mousemove", handleSlashMenuHover);
  slashListNode?.addEventListener("click", handleSlashMenuClick);

  if (fileInput) {
    fileInput.addEventListener("change", handleFallbackFileInput);
  }

  actionNodes.newDoc?.addEventListener("click", createNewDocument);
  actionNodes.open?.addEventListener("click", openDocument);
  actionNodes.save?.addEventListener("click", saveDocument);
  actionNodes.saveAs?.addEventListener("click", saveAsDocument);
  actionNodes.loadPost?.addEventListener("click", loadSelectedPost);
  sourceSelect?.addEventListener("change", () => {
    loadPostOptions();
  });
  actionNodes.toggleTheme?.addEventListener("click", toggleTheme);

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });

  document.addEventListener("keydown", (event) => {
    if (!event.metaKey && !event.ctrlKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      if (event.shiftKey) {
        saveAsDocument();
        return;
      }
      saveDocument();
      return;
    }
    if (key === "o") {
      event.preventDefault();
      openDocument();
      return;
    }
    if (key === "n") {
      event.preventDefault();
      createNewDocument();
    }
  });

  window.addEventListener("resize", () => {
    updateWorkingAreaHeight();
    if (state.slashMenuOpen) {
      positionSlashMenu();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushAutoSave();
    }
  });
  document.addEventListener("mousedown", (event) => {
    if (!state.slashMenuOpen) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      closeSlashMenu();
      return;
    }
    if (target === editorInput || editorInput.contains(target) || slashMenuNode?.contains(target)) {
      return;
    }
    closeSlashMenu();
  });
  window.addEventListener("pagehide", () => {
    void flushAutoSave();
  });
  if (themePreferenceQuery?.addEventListener) {
    themePreferenceQuery.addEventListener("change", handleSystemThemeChange);
  } else if (themePreferenceQuery?.addListener) {
    themePreferenceQuery.addListener(handleSystemThemeChange);
  }
  if (desktopLayoutQuery.addEventListener) {
    desktopLayoutQuery.addEventListener("change", () => {
      updateWorkingAreaHeight();
      if (state.slashMenuOpen) {
        positionSlashMenu();
      }
    });
  } else if (desktopLayoutQuery.addListener) {
    desktopLayoutQuery.addListener(() => {
      updateWorkingAreaHeight();
      if (state.slashMenuOpen) {
        positionSlashMenu();
      }
    });
  }
}

function handleEditorInputChanged() {
  state.source = editorInput.value;
  state.dirty = state.source !== state.lastSavedSource;
  persistDraft();
  scheduleRender();
  refreshUi();
  scheduleAutoSave();
  updateSlashMenu();
}

function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : null;
}

function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (_error) {
    return null;
  }
}

function getSystemTheme() {
  return themePreferenceQuery?.matches ? "dark" : "light";
}

function getCurrentTheme() {
  const active = normalizeTheme(document.documentElement.dataset.theme);
  if (active) {
    return active;
  }
  return getStoredTheme() ?? getSystemTheme();
}

function syncThemeToggleUi(theme = getCurrentTheme()) {
  const toggle = actionNodes.toggleTheme;
  if (!toggle) {
    return;
  }
  const isDark = theme === "dark";
  const ariaLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
  toggle.setAttribute("aria-label", ariaLabel);
  toggle.title = ariaLabel;
  if (themeIconNode) {
    themeIconNode.innerHTML = isDark ? MOON_ICON : SUN_ICON;
  }
}

function applyTheme(theme, options = {}) {
  const finalTheme = normalizeTheme(theme) ?? getSystemTheme();
  document.documentElement.dataset.theme = finalTheme;
  if (options.persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, finalTheme);
    } catch (_error) {
      // Ignore local storage errors.
    }
  }
  syncThemeToggleUi(finalTheme);
}

function toggleTheme() {
  const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme, { persist: true });
}

function handleSystemThemeChange(event) {
  if (getStoredTheme()) {
    return;
  }
  applyTheme(event.matches ? "dark" : "light");
}

function restoreDraft() {
  const draft = readStoredDraft();
  if (draft?.source) {
    state.source = draft.source;
    state.fileName = draft.fileName || "untitled.md";
    state.lastSavedSource = draft.lastSavedSource ?? draft.source;
    state.dirty = state.source !== state.lastSavedSource;
    setStatus(
      state.dirty
        ? "Recovered draft from local storage (unsaved changes)."
        : "Recovered local draft."
    );
  } else {
    state.source = DEFAULT_TEMPLATE;
    state.lastSavedSource = state.source;
    state.dirty = false;
    setStatus("New local draft created.");
  }
  editorInput.value = state.source;
  refreshUi();
}

function readStoredDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.source !== "string") {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function persistDraft() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        source: state.source,
        fileName: state.fileName,
        lastSavedSource: state.lastSavedSource,
        updatedAt: Date.now(),
      })
    );
  } catch (_error) {
    // Ignore local storage errors.
  }
}

function refreshUi() {
  if (docNameNode) {
    docNameNode.textContent = state.dirty ? `${state.fileName} *` : state.fileName;
  }
  setDocumentTitle(`Editor - ${state.fileName}`);
}

function scheduleRender() {
  if (state.renderTimer) {
    clearTimeout(state.renderTimer);
  }
  state.renderTimer = window.setTimeout(() => {
    state.renderTimer = null;
    renderPreview();
  }, 80);
}

function updateWorkingAreaHeight() {
  if (!panelsNode) {
    return;
  }
  if (desktopLayoutQuery.matches) {
    panelsNode.style.removeProperty("height");
    return;
  }
  const rect = panelsNode.getBoundingClientRect();
  const available = Math.floor(window.innerHeight - rect.top - 18);
  const clamped = Math.max(360, available);
  panelsNode.style.height = `${clamped}px`;
}

function renderPreview() {
  const { attributes, body } = parseFrontMatter(state.source);
  const title = attributes.title || inferTitle(body) || "Untitled Draft";
  const category = attributes.category || "Notebook";
  const dateRaw = attributes.date || "";
  const dateText = dateRaw ? formatDate(dateRaw) : "";
  const stats = computeStats(body);

  if (previewTitle) {
    previewTitle.textContent = title;
  }
  if (previewCategory) {
    previewCategory.textContent = category;
  }
  if (previewDate) {
    previewDate.textContent = dateText;
    if (dateRaw) {
      previewDate.setAttribute("datetime", dateRaw);
    } else {
      previewDate.removeAttribute("datetime");
    }
  }
  if (previewMeta) {
    previewMeta.textContent = `${stats.words} words · ${stats.minutes} min read`;
  }
  if (previewBody) {
    previewBody.innerHTML = renderMarkdown(body || "");
    highlightCode(previewBody);
    typesetMath(previewBody);
  }
}

function computeStats(markdown) {
  if (!markdown) {
    return { words: 0, minutes: 1 };
  }
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ");
  const wordUnits = cleaned
    .split(/\s+/)
    .filter(Boolean).length;
  const hanMatches = cleaned.match(/[\u4e00-\u9fff]/g) ?? [];
  const total = wordUnits + hanMatches.length;
  const minutes = Math.max(1, Math.round(total / WORDS_PER_MINUTE));
  return { words: total, minutes };
}

function inferTitle(body) {
  if (!body) {
    return "";
  }
  const headingMatch = body.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : "";
}

function typesetMath(target) {
  const mathJax = window.MathJax;
  if (mathJax?.typesetPromise) {
    mathJax.typesetPromise([target]).catch((error) => {
      console.error("MathJax typeset failed:", error);
    });
    return;
  }
  if (state.mathRetryTimer) {
    return;
  }
  state.mathRetryTimer = window.setInterval(() => {
    const mj = window.MathJax;
    if (!mj?.typesetPromise) {
      return;
    }
    window.clearInterval(state.mathRetryTimer);
    state.mathRetryTimer = null;
    mj.typesetPromise([target]).catch((error) => {
      console.error("MathJax typeset failed after load:", error);
    });
  }, PREVIEW_RETRY_INTERVAL_MS);
}

function highlightCode(root) {
  const hljs = window.hljs;
  if (!hljs?.highlightElement) {
    return;
  }
  const blocks = root.querySelectorAll("pre code");
  blocks.forEach((node) => hljs.highlightElement(node));
}

async function createNewDocument() {
  if (!(await confirmDiscardIfNeeded())) {
    return;
  }
  closeSlashMenu();
  clearScheduledAutoSave();
  state.autoSavePending = false;
  state.documentVersion += 1;
  state.source = DEFAULT_TEMPLATE;
  state.fileHandle = null;
  state.fileName = "untitled.md";
  state.lastSavedSource = state.source;
  state.dirty = false;
  editorInput.value = state.source;
  persistDraft();
  scheduleRender();
  refreshUi();
  setStatus("Started a new draft.");
}

async function openDocument() {
  if (!(await confirmDiscardIfNeeded())) {
    return;
  }
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Markdown files",
            accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] },
          },
        ],
      });
      if (!handle) {
        return;
      }
      const file = await handle.getFile();
      const source = await file.text();
      const autoSaveReady = await prepareAutoSavePermission(handle);
      applyLoadedSource(source, file.name, handle);
      if (autoSaveReady) {
        setStatus(`Opened ${file.name}. Auto-save is enabled.`);
      } else {
        setStatus(`Opened ${file.name}. Auto-save needs write permission.`);
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error(error);
      setStatus("Open failed. Check browser permissions.");
    }
    return;
  }
  fileInput?.click();
}

async function handleFallbackFileInput(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    applyLoadedSource(text, file.name, null);
    setStatus(`Opened ${file.name} via file input (read-only source). Use Save As to bind a writable file.`);
  } catch (error) {
    console.error(error);
    setStatus("Could not read selected file.");
  } finally {
    input.value = "";
  }
}

async function saveDocument() {
  clearScheduledAutoSave();
  if (!state.dirty) {
    setStatus("No changes to save.");
    return;
  }
  if (!state.fileHandle) {
    const bound = await bindWritableFileHandle();
    if (!bound) {
      setStatus("Save canceled. No writable file is bound.");
      return;
    }
  }
  if (state.fileHandle) {
    await writeToHandle(state.fileHandle, state.fileName, { mode: "manual" });
    return;
  }
  setStatus("Current browser cannot bind a writable local file. Use Save As.");
}

async function saveAsDocument() {
  clearScheduledAutoSave();
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: normalizeFileName(state.fileName),
        types: [
          {
            description: "Markdown files",
            accept: { "text/markdown": [".md"], "text/plain": [".txt"] },
          },
        ],
      });
      if (!handle) {
        return;
      }
      state.fileHandle = handle;
      state.fileName = normalizeFileName(handle.name || state.fileName);
      await writeToHandle(handle, state.fileName, { mode: "manual" });
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error(error);
      setStatus("Save As failed. Download fallback is available.");
    }
  }
  downloadSnapshot();
}

async function writeToHandle(handle, displayName, options = {}) {
  const mode = options.mode || "manual";
  const sourceToWrite = options.sourceToWrite ?? state.source;
  const documentVersion = options.documentVersion ?? state.documentVersion;
  try {
    if (!handle || typeof handle.createWritable !== "function") {
      throw new TypeError("Handle does not support createWritable().");
    }
    const writable = await handle.createWritable();
    await writable.write(sourceToWrite);
    await writable.close();
    if (state.fileHandle !== handle || documentVersion !== state.documentVersion) {
      return false;
    }
    markSaved(sourceToWrite);
    if (mode === "auto") {
      setStatus(`Auto-saved ${displayName} at ${formatTime(new Date())}.`);
    } else {
      setStatus(`Saved ${displayName}.`);
    }
    return true;
  } catch (error) {
    console.error(error);
    if (state.fileHandle !== handle || documentVersion !== state.documentVersion) {
      return false;
    }
    if (mode === "auto") {
      setStatus("Auto-save failed. Changes are still in local draft.");
    } else {
      setStatus("Save failed. Browser denied file write.");
    }
    return false;
  }
}

function downloadSnapshot() {
  const filename = normalizeFileName(state.fileName);
  const blob = new Blob([state.source], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  markSaved();
  setStatus(`Downloaded ${filename} (manual save mode).`);
}

function markSaved(savedSource = state.source) {
  state.lastSavedSource = savedSource;
  state.dirty = state.source !== state.lastSavedSource;
  persistDraft();
  refreshUi();
}

async function loadPostOptions() {
  if (!postSelect) {
    return;
  }
  const source = getSelectedContentSource();
  try {
    const response = await fetch(`${BASE_URL}/${source.indexPath}`);
    if (!response.ok) {
      throw new Error(`${source.indexPath} returned ${response.status}`);
    }
    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      postSelect.innerHTML = `<option value="">${source.emptyText}</option>`;
      return;
    }
    postSelect.innerHTML = `<option value="">${source.chooseText}</option>`;
    posts.forEach((post) => {
      const option = document.createElement("option");
      option.value = post.slug;
      option.textContent = `${post.title ?? post.slug} (${post.slug})`;
      postSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    postSelect.innerHTML = `<option value="">${source.indexErrorText}</option>`;
  }
}

async function loadSelectedPost() {
  const selectedSource = getSelectedContentSource();
  const slug = postSelect?.value;
  if (!slug) {
    setStatus(`Choose a markdown file from ${selectedSource.label} first.`);
    return;
  }
  if (!(await confirmDiscardIfNeeded())) {
    return;
  }
  try {
    const response = await fetch(`${BASE_URL}/${selectedSource.contentDir}/${encodeURIComponent(slug)}.md`);
    if (!response.ok) {
      throw new Error(`Could not load ${slug}: ${response.status}`);
    }
    const markdownSource = await response.text();
    applyLoadedSource(markdownSource, `${slug}.md`, null);
    setStatus(`Loaded ${slug}.md from ${selectedSource.label}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load ${slug}.md from ${selectedSource.label}.`);
  }
}

function getSelectedContentSource() {
  const key = sourceSelect?.value === "drafts" ? "drafts" : "posts";
  return CONTENT_SOURCES[key];
}

function applyLoadedSource(source, fileName, handle) {
  closeSlashMenu();
  clearScheduledAutoSave();
  state.autoSavePending = false;
  state.documentVersion += 1;
  state.source = source;
  state.fileName = normalizeFileName(fileName || "untitled.md");
  state.fileHandle = handle || null;
  state.lastSavedSource = source;
  state.dirty = false;
  editorInput.value = source;
  persistDraft();
  scheduleRender();
  refreshUi();
}

function normalizeFileName(name) {
  const safe = String(name || "untitled.md").trim() || "untitled.md";
  return safe.endsWith(".md") || safe.endsWith(".txt") ? safe : `${safe}.md`;
}

async function confirmDiscardIfNeeded() {
  if (!state.dirty) {
    return true;
  }
  return window.confirm("You have unsaved changes. Continue and discard them?");
}

function setStatus(message) {
  if (!statusNode) {
    return;
  }
  statusNode.textContent = message;
  statusNode.title = message;
  updateWorkingAreaHeight();
  if (state.slashMenuOpen) {
    positionSlashMenu();
  }
}

function updateSlashMenu() {
  if (!editorInput || !slashMenuNode || !slashListNode || !sourcePanelNode) {
    return;
  }
  const selectionStart = editorInput.selectionStart ?? 0;
  const selectionEnd = editorInput.selectionEnd ?? selectionStart;
  const context = getSlashContext(editorInput.value, selectionStart, selectionEnd);
  if (!context) {
    closeSlashMenu();
    return;
  }
  const matches = getSlashCommandMatches(context.query);
  if (matches.length === 0) {
    closeSlashMenu();
    return;
  }
  if (state.slashQuery !== context.query) {
    state.slashActiveIndex = 0;
  } else {
    state.slashActiveIndex = Math.min(state.slashActiveIndex, matches.length - 1);
  }
  state.slashQuery = context.query;
  state.slashTriggerIndex = context.slashIndex;
  state.slashItems = matches;
  renderSlashMenu();
  openSlashMenu();
  window.requestAnimationFrame(() => {
    positionSlashMenu();
  });
}

function handleSlashMenuKeydown(event) {
  if (!state.slashMenuOpen || event.isComposing) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActiveSlashItem(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActiveSlashItem(-1);
    return;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    applyActiveSlashCommand();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeSlashMenu();
  }
}

function moveActiveSlashItem(direction) {
  const total = state.slashItems.length;
  if (total === 0) {
    return;
  }
  state.slashActiveIndex = (state.slashActiveIndex + direction + total) % total;
  renderSlashMenu();
  ensureActiveSlashItemVisible();
}

function applyActiveSlashCommand() {
  const command = state.slashItems[state.slashActiveIndex];
  if (!command || !editorInput) {
    return;
  }
  const selectionStart = editorInput.selectionStart ?? 0;
  const selectionEnd = editorInput.selectionEnd ?? selectionStart;
  if (selectionStart !== selectionEnd || state.slashTriggerIndex < 0 || state.slashTriggerIndex > selectionStart) {
    closeSlashMenu();
    return;
  }

  const insertion = resolveSlashTemplate(command.template);
  insertTextWithUndo(editorInput, insertion.text, state.slashTriggerIndex, selectionStart);
  const insertedEnd = editorInput.selectionStart ?? (state.slashTriggerIndex + insertion.text.length);
  const insertedStart = Math.max(0, insertedEnd - insertion.text.length);
  const nextSelectionStart = insertedStart + insertion.selectionStart;
  const nextSelectionEnd = insertedStart + insertion.selectionEnd;
  editorInput.focus();
  editorInput.setSelectionRange(nextSelectionStart, nextSelectionEnd);
  closeSlashMenu();
  handleEditorInputChanged();
  setStatus(`Inserted ${command.label} syntax.`);
}

function renderSlashMenu() {
  if (!slashListNode || !slashHintNode) {
    return;
  }
  slashHintNode.textContent = state.slashQuery
    ? `Insert syntax · /${state.slashQuery}`
    : "Insert syntax";
  slashListNode.innerHTML = state.slashItems
    .map((command, index) => {
      const isActive = index === state.slashActiveIndex;
      return `
<li
  class="editor-slash-item${isActive ? " is-active" : ""}"
  role="option"
  aria-selected="${isActive ? "true" : "false"}"
  data-slash-index="${index}"
>
  <span class="editor-slash-item-title">${escapeHtml(command.label)}</span>
  <span class="editor-slash-item-desc">${escapeHtml(command.description)}</span>
  <span class="editor-slash-item-syntax">${escapeHtml(command.syntax)}</span>
</li>`.trim();
    })
    .join("");
}

function openSlashMenu() {
  if (!slashMenuNode) {
    return;
  }
  slashMenuNode.hidden = false;
  state.slashMenuOpen = true;
}

function closeSlashMenu() {
  if (!slashMenuNode) {
    return;
  }
  slashMenuNode.hidden = true;
  state.slashMenuOpen = false;
  state.slashQuery = "";
  state.slashTriggerIndex = -1;
  state.slashItems = [];
  state.slashActiveIndex = 0;
}

function handleSlashMenuHover(event) {
  const itemNode = event.target.closest("[data-slash-index]");
  if (!itemNode) {
    return;
  }
  const index = Number(itemNode.dataset.slashIndex);
  if (!Number.isInteger(index) || index < 0 || index >= state.slashItems.length) {
    return;
  }
  if (state.slashActiveIndex !== index) {
    state.slashActiveIndex = index;
    renderSlashMenu();
  }
}

function handleSlashMenuClick(event) {
  const itemNode = event.target.closest("[data-slash-index]");
  if (!itemNode) {
    return;
  }
  const index = Number(itemNode.dataset.slashIndex);
  if (!Number.isInteger(index) || index < 0 || index >= state.slashItems.length) {
    return;
  }
  state.slashActiveIndex = index;
  applyActiveSlashCommand();
}

function ensureActiveSlashItemVisible() {
  if (!slashListNode) {
    return;
  }
  const activeNode = slashListNode.querySelector(`[data-slash-index="${state.slashActiveIndex}"]`);
  activeNode?.scrollIntoView({ block: "nearest" });
}

function getSlashContext(source, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd) {
    return null;
  }
  const beforeCursor = source.slice(0, selectionStart);
  const match = beforeCursor.match(/(?:^|[\s(])\/([^\s/]*)$/);
  if (!match) {
    return null;
  }
  const query = match[1] ?? "";
  const slashIndex = selectionStart - query.length - 1;
  return { query, slashIndex };
}

function getSlashCommandMatches(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SLASH_COMMANDS;
  }
  return SLASH_COMMANDS.filter((command) => {
    const searchText = [
      command.id,
      command.label,
      command.description,
      command.syntax,
      ...(command.aliases || []),
    ]
      .join(" ")
      .toLowerCase();
    return searchText.includes(normalized);
  });
}

function resolveSlashTemplate(template) {
  const selectionMatch = template.match(/\{\{selection:([\s\S]*?)\}\}/);
  if (selectionMatch) {
    const marker = selectionMatch[0];
    const content = selectionMatch[1];
    const markerIndex = template.indexOf(marker);
    return {
      text: template.replace(marker, content),
      selectionStart: markerIndex,
      selectionEnd: markerIndex + content.length,
    };
  }
  const cursorToken = "{{cursor}}";
  const cursorIndex = template.indexOf(cursorToken);
  if (cursorIndex >= 0) {
    return {
      text: template.replace(cursorToken, ""),
      selectionStart: cursorIndex,
      selectionEnd: cursorIndex,
    };
  }
  return {
    text: template,
    selectionStart: template.length,
    selectionEnd: template.length,
  };
}

function positionSlashMenu() {
  if (!state.slashMenuOpen || !slashMenuNode || !sourcePanelNode || !editorInput) {
    return;
  }
  const caretRect = getTextareaCaretRect(editorInput, editorInput.selectionStart ?? 0);
  const sourceRect = sourcePanelNode.getBoundingClientRect();
  const menuRect = slashMenuNode.getBoundingClientRect();

  const horizontalMax = Math.max(8, sourceRect.width - menuRect.width - 8);
  const verticalMax = Math.max(60, sourceRect.height - menuRect.height - 8);
  const left = clamp(caretRect.left - sourceRect.left, 8, horizontalMax);
  const top = clamp(caretRect.top - sourceRect.top + caretRect.height + 8, 60, verticalMax);

  slashMenuNode.style.left = `${left}px`;
  slashMenuNode.style.top = `${top}px`;
}

function getTextareaCaretRect(textarea, position) {
  const textareaRect = textarea.getBoundingClientRect();
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const mirrorProps = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "textAlign",
    "whiteSpace",
    "wordBreak",
    "wordSpacing",
    "tabSize",
  ];

  mirror.style.position = "fixed";
  mirror.style.left = `${textareaRect.left}px`;
  mirror.style.top = `${textareaRect.top}px`;
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.overflow = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";

  mirrorProps.forEach((prop) => {
    mirror.style[prop] = style[prop];
  });

  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  mirror.scrollTop = textarea.scrollTop;
  mirror.scrollLeft = textarea.scrollLeft;

  const markerRect = marker.getBoundingClientRect();
  const lineHeight = Number.parseFloat(style.lineHeight) || 20;
  document.body.removeChild(mirror);

  return {
    left: markerRect.left,
    top: markerRect.top,
    height: markerRect.height || lineHeight,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function insertTextWithUndo(textarea, text, start, end) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  let inserted = false;
  try {
    if (typeof document.execCommand === "function") {
      inserted = document.execCommand("insertText", false, text);
    }
  } catch (_error) {
    inserted = false;
  }
  if (!inserted) {
    textarea.setRangeText(text, start, end, "end");
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function scheduleAutoSave() {
  if (!state.fileHandle?.createWritable || !state.dirty) {
    return;
  }
  clearScheduledAutoSave();
  state.autoSaveTimer = window.setTimeout(() => {
    state.autoSaveTimer = null;
    void flushAutoSave();
  }, AUTO_SAVE_DELAY_MS);
}

function clearScheduledAutoSave() {
  if (!state.autoSaveTimer) {
    return;
  }
  window.clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = null;
}

async function flushAutoSave() {
  if (!state.fileHandle?.createWritable || !state.dirty) {
    return;
  }
  if (state.autoSaveInFlight) {
    state.autoSavePending = true;
    return;
  }
  if (!(await canAutoSaveToHandle(state.fileHandle))) {
    return;
  }
  state.autoSaveInFlight = true;
  const snapshot = state.source;
  try {
    await writeToHandle(state.fileHandle, state.fileName, {
      mode: "auto",
      sourceToWrite: snapshot,
      documentVersion: state.documentVersion,
    });
  } finally {
    state.autoSaveInFlight = false;
    if (state.autoSavePending) {
      state.autoSavePending = false;
      void flushAutoSave();
    }
  }
}

async function canAutoSaveToHandle(handle) {
  if (typeof handle.queryPermission !== "function") {
    return true;
  }
  try {
    return (await handle.queryPermission({ mode: "readwrite" })) === "granted";
  } catch (_error) {
    return false;
  }
}

async function prepareAutoSavePermission(handle) {
  if (typeof handle.queryPermission !== "function" || typeof handle.requestPermission !== "function") {
    return true;
  }
  try {
    const current = await handle.queryPermission({ mode: "readwrite" });
    if (current === "granted") {
      return true;
    }
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch (_error) {
    return false;
  }
}

async function bindWritableFileHandle() {
  if (!("showOpenFilePicker" in window)) {
    return false;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Markdown files",
          accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] },
        },
      ],
    });
    if (!handle) {
      return false;
    }
    const granted = await prepareAutoSavePermission(handle);
    if (!granted) {
      setStatus("Cannot save without file write permission.");
      return false;
    }
    state.fileHandle = handle;
    state.fileName = normalizeFileName(handle.name || state.fileName);
    refreshUi();
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      return false;
    }
    console.error(error);
    setStatus("Binding writable file failed.");
    return false;
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
