const header = document.querySelector(".site-header");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const themeLabel = document.querySelector("[data-theme-label]");
const prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const THEME_STORAGE_KEY = "hm-blog-theme";

let activeTheme = null;

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
  if (themeIcon) {
    themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  }
  if (themeLabel) {
    themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
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
