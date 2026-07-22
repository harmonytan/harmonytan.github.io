export function hydrate(element) {
  const trigger = element.querySelector(".render-spec__trigger");
  const panel = element.querySelector(".render-spec__panel");
  if (!trigger || !panel) return;

  trigger.addEventListener("click", () => {
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
    const icon = trigger.querySelector("[aria-hidden]");
    if (icon) icon.textContent = expanded ? "+" : "−";
  });
}

