import type { ComponentContextWithEscape } from "@blog/component-api";

export function render({
  props,
  content,
  escape,
}: ComponentContextWithEscape): string {
  return `<aside class="component-callout component-callout--${props.tone}" data-component="shared.callout" data-tone="${props.tone}" data-size="${props.size}">
  <p class="component-callout__label">${escape(props.title)}</p>
  <div class="component-callout__body">${content}</div>
</aside>`;
}
