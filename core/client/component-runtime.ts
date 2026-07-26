export type ComponentHydrator = (element: Element) => void;

export function hydrateComponent(
  name: string,
  hydrate: ComponentHydrator
): void {
  if (typeof hydrate !== "function") {
    throw new TypeError(`Component "${name}" does not export hydrate().`);
  }
  const selector = `[data-component="${CSS.escape(name)}"]`;
  document.querySelectorAll(selector).forEach((element) => hydrate(element));
}
