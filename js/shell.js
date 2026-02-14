(() => {
  // Active sidebar link based on body data-page
  const page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll(".nav a[data-page]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-page") === page);
    });
  }

  // Workspace ceremony pills (if present)
  const pills = document.querySelectorAll("[data-ceremony]");
  const panels = document.querySelectorAll("[data-panel]");
  if (pills.length && panels.length) {
    const setActive = (name) => {
      pills.forEach(p => p.classList.toggle("active", p.getAttribute("data-ceremony") === name));
      panels.forEach(el => el.style.display = (el.getAttribute("data-panel") === name ? "block" : "none"));
    };

    pills.forEach(p => p.addEventListener("click", () => setActive(p.getAttribute("data-ceremony"))));

    // default
    setActive("planning");
  }
})();
