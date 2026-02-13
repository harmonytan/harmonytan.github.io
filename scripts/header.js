const header = document.querySelector(".site-header");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const themeOptionButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector(".site-nav");
const mobileNavQuery = window.matchMedia ? window.matchMedia("(max-width: 720px)") : null;
const prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const THEME_STORAGE_KEY = "hm-blog-theme";

let activeTheme = null;
let isMenuOpen = false;

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

const getThemeLabel = (theme) => (theme === "dark" ? "Dark theme" : "Light theme");

const decorateThemeOptions = () => {
  for (const button of themeOptionButtons) {
    const buttonTheme = normalizeTheme(button.dataset.themeOption);
    if (!buttonTheme) {
      continue;
    }

    let icon = button.querySelector(".mobile-theme-option-icon");

    if (!icon) {
      icon = document.createElement("span");
      icon.className = "mobile-theme-option-icon";
      icon.setAttribute("aria-hidden", "true");
    }

    button.setAttribute("aria-label", getThemeLabel(buttonTheme));
    button.setAttribute("title", getThemeLabel(buttonTheme));
    button.textContent = "";
    button.append(icon);
  }
};

const persistTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore storage errors (private mode or blocked storage)
  }
};

const updateThemeOptionsUi = (theme) => {
  for (const button of themeOptionButtons) {
    const buttonTheme = normalizeTheme(button.dataset.themeOption);
    const icon = button.querySelector(".mobile-theme-option-icon");
    const isActive = buttonTheme === theme;
    if (icon) {
      icon.innerHTML = buttonTheme === "dark" ? MOON_ICON : SUN_ICON;
    }
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
};

const updateToggleUi = (theme) => {
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (themeIcon) {
      themeIcon.innerHTML = theme === "dark" ? MOON_ICON : SUN_ICON;
    }
  }
  updateThemeOptionsUi(theme);
};

const applyTheme = (theme) => {
  const finalTheme = normalizeTheme(theme) ?? getSystemTheme();
  activeTheme = finalTheme;
  document.documentElement.dataset.theme = finalTheme;
  updateToggleUi(finalTheme);
};

const isMobileView = () => (mobileNavQuery ? mobileNavQuery.matches : window.innerWidth <= 720);

const setMenuOpen = (open) => {
  if (!header || !menuToggle) {
    return;
  }
  isMenuOpen = Boolean(open);
  header.classList.toggle("is-menu-open", isMenuOpen);
  menuToggle.setAttribute("aria-expanded", isMenuOpen ? "true" : "false");
  menuToggle.setAttribute("aria-label", isMenuOpen ? "Close navigation menu" : "Open navigation menu");
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

decorateThemeOptions();
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
    persistTheme(nextTheme);
  });
}

for (const button of themeOptionButtons) {
  button.addEventListener("click", () => {
    const nextTheme = normalizeTheme(button.dataset.themeOption);
    if (!nextTheme) {
      return;
    }
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  });
}

if (header && menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    setMenuOpen(!isMenuOpen);
  });

  siteNav.addEventListener("click", (event) => {
    const targetLink = event.target instanceof Element ? event.target.closest("a") : null;
    if (targetLink && isMobileView()) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!isMenuOpen || !(event.target instanceof Node)) {
      return;
    }
    if (!header.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen) {
      setMenuOpen(false);
    }
  });

  const syncMenuWithViewport = (event) => {
    if (!event.matches) {
      setMenuOpen(false);
    }
  };

  if (mobileNavQuery?.addEventListener) {
    mobileNavQuery.addEventListener("change", syncMenuWithViewport);
  } else if (mobileNavQuery?.addListener) {
    mobileNavQuery.addListener(syncMenuWithViewport);
  }

  setMenuOpen(false);
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

    if (isMenuOpen) {
      header.classList.remove("is-hidden");
      header.classList.add("is-floating");
      lastScrollY = currentY;
      ticking = false;
      return;
    }

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
