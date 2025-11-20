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

  const DISPLAY_MATH_DELIMITERS = {
    $$: { open: "$$", close: "$$" },
    "\\[": { open: "\\[", close: "\\]" },
  };
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let inCodeBlock = false;
  let inMathBlock = false;
  let codeBuffer = [];
  let codeLanguage = "";
  let mathBuffer = [];
  let mathDelimiter = null;

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

  const flushMath = () => {
    if (inMathBlock) {
      const delimiter = mathDelimiter ?? DISPLAY_MATH_DELIMITERS["$$"];
      const content = mathBuffer.join("\n");
      html.push(
        `<div class="math-block">${delimiter.open}\n${content}\n${delimiter.close}</div>`
      );
      inMathBlock = false;
      mathBuffer = [];
      mathDelimiter = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushMath();
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!inCodeBlock) {
      if (inMathBlock) {
        const expectedClose = mathDelimiter?.close ?? "$$";
        if (trimmed === expectedClose) {
          flushMath();
          continue;
        }
      } else if (trimmed === "$$" || trimmed === "\\[") {
        flushList();
        inMathBlock = true;
        mathDelimiter = DISPLAY_MATH_DELIMITERS[trimmed];
        mathBuffer = [];
        continue;
      }
    }

    if (
      !inCodeBlock &&
      !inMathBlock &&
      ((trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) ||
        (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4))
    ) {
      flushList();
      const delimiter = trimmed.startsWith("\\[")
        ? DISPLAY_MATH_DELIMITERS["\\["]
        : DISPLAY_MATH_DELIMITERS["$$"];
      const content = trimmed.slice(delimiter.open.length, -delimiter.close.length).trim();
      html.push(`<div class="math-block">${delimiter.open} ${content} ${delimiter.close}</div>`);
      continue;
    }

    if (inMathBlock) {
      mathBuffer.push(line);
      continue;
    }

    if (trimmed === "") {
      flushMath();
      flushList();
      html.push("");
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      flushMath();
      flushList();
      const level = line.match(/^#{1,6}/)[0].length;
      const content = line.replace(/^#{1,6}\s*/, "");
      html.push(`<h${level}>${renderInline(content)}</h${level}>`);
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      flushMath();
      if (!inList) {
        inList = true;
        html.push("<ul>");
      }
      const content = line.replace(/^[-*+]\s+/, "");
      html.push(`<li>${renderInline(content)}</li>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushMath();
      flushList();
      const content = line.replace(/^>\s?/, "");
      html.push(`<blockquote>${renderInline(content)}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushMath();
      flushList();
      html.push("<hr />");
      continue;
    }

    flushMath();
    flushList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  flushList();
  flushCode();
  flushMath();

  return html.join("\n");
}
