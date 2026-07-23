export function render({ props, content, escape }) {
  return `<section class="render-spec" data-component="local.render-spec">
  <button class="render-spec__trigger" type="button" aria-expanded="false">
    <span>${escape(props.title)}</span>
    <span aria-hidden="true">+</span>
  </button>
  <div class="render-spec__panel" hidden>${content}</div>
</section>`;
}
