export function parseDateInput(value) {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/
  );
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3] ?? "1");
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.valueOf()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function formatDate(isoString) {
  if (!isoString) {
    return "";
  }

  try {
    const date = parseDateInput(isoString);
    if (!date) {
      return isoString;
    }
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.warn("Failed to format date:", error);
    return isoString;
  }
}

export function setDocumentTitle(title) {
  if (!title) {
    return;
  }
  document.title = `${title} · Hongming Tan`;
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

const scriptUrl = new URL(import.meta.url);
const scriptsIndex = scriptUrl.pathname.lastIndexOf("/scripts/");
const derivedBase = scriptsIndex >= 0 ? scriptUrl.pathname.slice(0, scriptsIndex) : "";

export const BASE_URL = window.__BLOG_BASE_PATH__ ?? derivedBase;

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
