const TONES = new Set(["note", "caution", "claim"]);

export function render({ props, content, escape }) {
  const tone = TONES.has(props.tone) ? props.tone : "note";
  const title = String(props.title ?? "Note");
  return `<aside class="component-callout component-callout--${tone}" data-component="shared.callout">
  <p class="component-callout__label">${escape(title)}</p>
  <div class="component-callout__body">${content}</div>
</aside>`;
}

