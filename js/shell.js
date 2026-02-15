/* =========================================================
   Scrummer — shell.js (FIXED TAGLINE)
   - Active left nav highlight (body[data-page])
   - Workspace ceremony pills (data-ceremony / data-panel)
   - Injects a compact header brand strip into .topbarLeft OR .topbar
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
  // 3) Inject compact header brand + tagline
  //    Works even if .topbarLeft is missing.
  // ----------------------------
  const host =
    document.querySelector(".topbarLeft") ||
    document.querySelector(".topbar") ||
    null;

  if (!host) return;

  // avoid duplicates
  if (host.querySelector(".headerBrand")) return;

  const brand = document.createElement("div");
  brand.className = "headerBrand";
  brand.innerHTML = `
    <div class="hbLeft">
      <div class="hbMark">▦</div>
      <div class="hbText">
        <div class="hbLine">SCRUMMER</div>
        <div class="hbSub">Know what’s happening. Know what to do next.</div>
      </div>
    </div>
  `;

  // Put it at the top of the header area
  host.prepend(brand);
})();