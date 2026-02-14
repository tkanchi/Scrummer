/* =========================================================
   Scrummer — shell.js
   - Active left nav highlight (body[data-page])
   - Workspace ceremony pills (data-ceremony / data-panel)
   - Injects hero tagline (.heroTag) into .topbarLeft consistently
   ========================================================= */

(() => {
  // ----------------------------
  // 1) Active sidebar link
  // ----------------------------
  const page = document.body?.getAttribute("data-page") || "";
  if (page) {
    document.querySelectorAll(".nav a[data-page]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-page") === page);
    });
  }

  // ----------------------------
  // 2) Workspace ceremony pills
  // ----------------------------
  const pills = document.querySelectorAll("[data-ceremony]");
  const panels = document.querySelectorAll("[data-panel]");

  if (pills.length && panels.length) {
    const setActive = (name) => {
      pills.forEach(p =>
        p.classList.toggle("active", p.getAttribute("data-ceremony") === name)
      );
      panels.forEach(el => {
        el.style.display = (el.getAttribute("data-panel") === name ? "block" : "none");
      });
    };

    pills.forEach(p => {
      p.addEventListener("click", () => setActive(p.getAttribute("data-ceremony")));
    });

    // default
    setActive("planning");
  }

  // ----------------------------
  // 3) Inject hero tagline consistently
  // ----------------------------
  const host = document.querySelector(".topbarLeft");
  if (!host) return;

  // avoid duplicates (important!)
  if (host.querySelector(".heroTag")) return;

  const tag = document.createElement("div");
  tag.className = "heroTag";
  tag.innerHTML = `
    <div class="heroLine">Know What’s Happening. Know What To Do Next.</div>
    <div class="heroSub">AI-powered delivery intelligence for modern Agile teams.</div>
  `;

  host.prepend(tag);
})();