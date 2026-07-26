interface TextNode {
  value?: unknown;
  children?: unknown;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value: unknown): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

export function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function slugify(value: unknown, fallback = "section"): string {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function textFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const current = node as TextNode;
  if (typeof current.value === "string") return current.value;
  if (!Array.isArray(current.children)) return "";
  return current.children.map(textFromNode).join("");
}

export function assertSafeName(value: unknown, label: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(value ?? ""))) {
    throw new Error(`${label} must use lowercase letters, numbers, and hyphens: ${value}`);
  }
}
