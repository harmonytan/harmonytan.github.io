const header = document.querySelector(".site-header");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const THEME_STORAGE_KEY = "hm-blog-theme";

let activeTheme = null;

const SUN_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />

  <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="12" y1="19" x2="12" y2="21.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="2.5" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="19" y1="12" x2="21.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />

  <line x1="5.4" y1="5.4" x2="7.1" y2="7.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="16.9" y1="16.9" x2="18.6" y2="18.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="16.9" y1="7.1" x2="18.6" y2="5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  <line x1="5.4" y1="18.6" x2="7.1" y2="16.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
</svg>

`;

const MOON_ICON = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12 3
       A9 9 0 1 0 21 12
       A6.5 6.5 0 1 1 12 3Z"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

`;

const normalizeTheme = (value) => (value === "dark" || value === "light" ? value : null);

const getStoredTheme = () => {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (_error) {
    return null;
  }
};

const getSystemTheme = () => (prefersDark && prefersDark.matches ? "dark" : "light");

const updateToggleUi = (theme) => {
  if (!themeToggle) {
    return;
  }
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  if (themeIcon) {
    themeIcon.innerHTML = theme === "dark" ? MOON_ICON : SUN_ICON;
  }
};

const applyTheme = (theme) => {
  const finalTheme = normalizeTheme(theme) ?? getSystemTheme();
  activeTheme = finalTheme;
  document.documentElement.dataset.theme = finalTheme;
  updateToggleUi(finalTheme);
};

const resolveInitialTheme = () => {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }

  const existing = normalizeTheme(document.documentElement.dataset.theme);
  if (existing) {
    return existing;
  }

  return getSystemTheme();
};

applyTheme(resolveInitialTheme());

const syncSystemPreference = (event) => {
  if (getStoredTheme()) {
    return;
  }
  applyTheme(event.matches ? "dark" : "light");
};

if (prefersDark?.addEventListener) {
  prefersDark.addEventListener("change", syncSystemPreference);
} else if (prefersDark?.addListener) {
  prefersDark.addListener(syncSystemPreference);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = activeTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (_error) {
      // Ignore storage errors (private mode or blocked storage)
    }
  });
}

if (header) {
  const HIDE_THRESHOLD = 10;
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateHeaderState = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    const scrollingDown = delta > HIDE_THRESHOLD;
    const scrollingUp = delta < -HIDE_THRESHOLD;
    const nearTop = currentY < 20;

    if (scrollingDown && currentY > header.offsetHeight * 1.5) {
      header.classList.add("is-hidden");
    } else if (scrollingUp || nearTop) {
      header.classList.remove("is-hidden");
    }

    if (nearTop) {
      header.classList.remove("is-floating");
    } else {
      header.classList.add("is-floating");
    }

    lastScrollY = currentY;
    ticking = false;
  };

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderState);
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  updateHeaderState();
}
