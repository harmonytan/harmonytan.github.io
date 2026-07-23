export function render({ props, content, escape }) {
  const authorLabel = props.url
    ? `<a href="${escape(props.url)}" target="_blank" rel="noopener noreferrer">${escape(props.author)}</a>`
    : escape(props.author);
  const affiliationLabel = props.affiliation ? `, ${escape(props.affiliation)}` : "";

  return `<aside class="component-comment" data-component="shared.comment" data-size="${props.size}">
  <h3 class="component-comment__title">${escape(props.title)}</h3>
  <p class="component-comment__byline">${authorLabel}${affiliationLabel}</p>
  <div class="component-comment__body">${content}</div>
</aside>`;
}
