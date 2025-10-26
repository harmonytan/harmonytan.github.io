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
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formatter.format(new Date(isoString));
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
