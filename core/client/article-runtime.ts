import "katex/dist/katex.min.css";

document.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]").forEach((link) => {
  const href = link.getAttribute("href");
  if (!href) return;
  const target = document.querySelector(href);
  if (!target) return;
  link.parentElement?.classList.add("footnote-ref");
  const popover = document.createElement("span");
  popover.className = "footnote-popover";
  popover.setAttribute("role", "tooltip");
  popover.textContent = (target.textContent ?? "")
    .replace(/↩|Back to content/g, "")
    .trim();
  link.parentElement?.append(popover);
});

const dialog = document.querySelector("[data-lightbox-dialog]");
if (dialog instanceof HTMLDialogElement) {
  const dialogImage = dialog.querySelector<HTMLImageElement>("img");
  const dialogCaption = dialog.querySelector<HTMLParagraphElement>("p");
  document.querySelectorAll<HTMLAnchorElement>("[data-lightbox]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const image = link.querySelector<HTMLImageElement>("img");
      if (!image || !dialogImage || !dialogCaption) return;
      dialogImage.src = link.href;
      dialogImage.alt = image.alt;
      dialogCaption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent ?? "";
      dialog.showModal();
    });
  });
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
