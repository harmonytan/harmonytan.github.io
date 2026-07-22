import { escapeAttribute } from "./utils.mjs";

export function renderSiteHeader({ homeHref }) {
  return `<header class="site-header">
    <div class="site-header__inner">
      <a class="site-brand" href="${escapeAttribute(homeHref)}" aria-label="Hongming Tan, articles home">
        <svg class="site-brand__mark" viewBox="0 0 28 28" aria-hidden="true">
          <path d="M5 3.5v21M23 3.5v21M5 14h18"></path>
        </svg>
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
