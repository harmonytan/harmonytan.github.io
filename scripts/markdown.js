const INLINE_PATTERNS = [
  { regex: /\[(.+?)\]\((.+?)\)/g, replace: '<a href="$2" target="_blank" rel="noopener">$1</a>' },
  { regex: /\*\*(.+?)\*\*/g, replace: "<strong>$1</strong>" },
  { regex: /\*(.+?)\*/g, replace: "<em>$1</em>" },
  { regex: /`([^`]+)`/g, replace: "<code>$1</code>" },
  { regex: /~~(.+?)~~/g, replace: "<del>$1</del>" },
];

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(text) {
  let result = escapeHtml(text);
  INLINE_PATTERNS.forEach(({ regex, replace }) => {
    result = result.replace(regex, replace);
  });
  return result;
}

export function renderMarkdown(markdown) {
  if (!markdown) {
    return "";
  }

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = "";

  const flushList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const flushCode = () => {
    if (inCodeBlock) {
      const codeContent = codeBuffer.join("\n");
      const langClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
      html.push(`<pre><code${langClass}>${escapeHtml(codeContent)}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
      codeLanguage = "";
    }
  };

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushList();
      html.push("");
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList();
      const level = line.match(/^#{1,6}/)[0].length;
      const content = line.replace(/^#{1,6}\s*/, "");
      html.push(`<h${level}>${renderInline(content)}</h${level}>`);
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      if (!inList) {
        inList = true;
        html.push("<ul>");
      }
      const content = line.replace(/^[-*+]\s+/, "");
      html.push(`<li>${renderInline(content)}</li>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      const content = line.replace(/^>\s?/, "");
      html.push(`<blockquote>${renderInline(content)}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushList();
      html.push("<hr />");
      continue;
    }

    flushList();
    html.push(`<p>${renderInline(line.trim())}</p>`);
  }

  flushList();
  flushCode();

  return html.join("\n");
}
