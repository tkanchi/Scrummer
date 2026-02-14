(() => {
  const STORAGE_KEY = "scrummer-theme";
  const root = document.documentElement;

  function getSystemTheme() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const mode = document.getElementById("themeMode");
    const btn = document.getElementById("themeToggle");
    if (mode) mode.textContent = theme === "dark" ? "Dark" : "Light";
    if (btn) btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved || getSystemTheme();
  applyTheme(initial);

  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });
  }

  // Follow system changes if user never chose manually
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if (mq && !saved) {
    mq.addEventListener("change", () => applyTheme(getSystemTheme()));
  }
})();
