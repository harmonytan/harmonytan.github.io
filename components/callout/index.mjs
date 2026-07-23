export function render({ props, content, escape }) {
  return `<aside class="component-callout component-callout--${props.tone}" data-component="shared.callout" data-tone="${props.tone}" data-size="${props.size}">
  <p class="component-callout__label">${escape(props.title)}</p>
  <div class="component-callout__body">${content}</div>
</aside>`;
}
