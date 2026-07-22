export function hydrateComponent(name, hydrate) {
  if (typeof hydrate !== "function") {
    throw new TypeError(`Component "${name}" does not export hydrate().`);
  }
  const selector = `[data-component="${CSS.escape(name)}"]`;
  document.querySelectorAll(selector).forEach((element) => hydrate(element));
}
