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
  let inQuote = false;
  let quoteBuffer = [];

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

  const flushQuote = () => {
    if (inQuote) {
      const content = quoteBuffer
        .map((line) => renderInline(line))
        .join("<br>");
      html.push(`<blockquote>${content}</blockquote>`);
      inQuote = false;
      quoteBuffer = [];
    }
  };
  const isTableRow = (text) => /^\|.+\|$/.test(text);
  const isTableDivider = (text) =>
    /^\|\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|$/.test(text);
  const parseCells = (row) =>
    row
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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

    if (!inCodeBlock && !inMathBlock && /^>\s?/.test(line)) {
      flushList();
      if (!inQuote) {
        inQuote = true;
        quoteBuffer = [];
      }
      const content = line.replace(/^>\s?/, "");
      quoteBuffer.push(content);
      continue;
    }

    if (inQuote && trimmed === "") {
      flushQuote();
      html.push("");
      continue;
    }

    if (
      !inCodeBlock &&
      !inMathBlock &&
      isTableRow(trimmed) &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1].trim())
    ) {
      flushList();
      const headerCells = parseCells(trimmed);
      const bodyRows = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j].trim())) {
        bodyRows.push(parseCells(lines[j].trim()));
        j += 1;
      }
      const headerHtml = headerCells
        .map((cell) => `<th>${renderInline(cell)}</th>`)
        .join("");
      const bodyHtml = bodyRows
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`
        )
        .join("");
      html.push(
        `<table class="md-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
      );
      i = j - 1;
      continue;
    }

    if (trimmed === "") {
      flushMath();
      flushQuote();
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

    if (/^---+$/.test(trimmed)) {
      flushMath();
      flushQuote();
      flushList();
      html.push("<hr />");
      continue;
    }

    flushMath();
    flushQuote();
    flushList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  flushList();
  flushCode();
  flushMath();
  flushQuote();

  return html.join("\n");
}
