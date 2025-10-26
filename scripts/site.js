export function updateCurrentYear() {
  const target = document.querySelectorAll("[data-current-year]");
  const year = new Date().getFullYear();
  target.forEach((node) => {
    node.textContent = year;
  });
}

export function formatDate(isoString) {
  if (!isoString) {
    return "";
  }

  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.valueOf())) {
      return isoString;
    }
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formatter.format(date);
  } catch (error) {
    console.warn("Failed to format date:", error);
    return isoString;
  }
}

export function setDocumentTitle(title) {
  if (!title) {
    return;
  }
  document.title = `${title} · Harmony Tan`;
}

export function escapeHtml(text) {
  if (text == null) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseFrontMatter(markdown) {
  const FRONT_MATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;
  const match = markdown.match(FRONT_MATTER_REGEX);

  if (!match) {
    return { attributes: {}, body: markdown };
  }

  const rawAttributes = match[1];
  const attributes = {};

  rawAttributes.split("\n").forEach((line) => {
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

  const body = markdown.slice(match[0].length);
  return { attributes, body };
}
