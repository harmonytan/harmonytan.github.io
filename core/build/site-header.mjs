import { escapeAttribute } from "./utils.mjs";

export function renderSiteHeader({ homeHref }) {
  const iconHref = `${homeHref}favicon.svg`;
  return `<header class="site-header">
    <div class="site-header__inner">
      <a class="site-brand" href="${escapeAttribute(homeHref)}" aria-label="Hongming Tan, articles home">
        <img class="site-brand__mark" src="${escapeAttribute(iconHref)}" alt="" aria-hidden="true">
        <span>Hongming Tan</span>
      </a>
      <div class="site-header__controls">
        <nav class="site-nav" aria-label="Site links">
          <a href="https://github.com/harmonytan" target="_blank" rel="noopener">GitHub</a>
        </nav>
        <button class="site-theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme" aria-pressed="false">
          <span data-theme-icon aria-hidden="true">☀</span>
        </button>
      </div>
    </div>
  </header>`;
}

export function renderThemeBootstrap() {
  return `(function(){try{var k="hm-blog-theme",s=localStorage.getItem(k),d=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=s==="light"||s==="dark"?s:d}catch(e){}})();`;
}
