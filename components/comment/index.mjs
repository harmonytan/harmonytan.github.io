export function render({ props, content, escape }) {
  const title = String(props.title ?? "Comment");
  const author = String(props.author ?? "Guest contributor");
  const affiliation = String(props.affiliation ?? "");
  const url = String(props.url ?? "").trim();
  const authorLabel = url
    ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(author)}</a>`
    : escape(author);
  const affiliationLabel = affiliation ? `, ${escape(affiliation)}` : "";

  return `<aside class="component-comment" data-component="shared.comment">
  <h3 class="component-comment__title">${escape(title)}</h3>
  <p class="component-comment__byline">${authorLabel}${affiliationLabel}</p>
  <div class="component-comment__body">${content}</div>
</aside>`;
}

