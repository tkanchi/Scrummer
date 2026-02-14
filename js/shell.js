/* =========================================================
   Scrummer — shell.js (FIXED)
   - Active left nav highlight (body[data-page])
   - Workspace ceremony pills (data-ceremony / data-panel)
   - Injects compact header brand strip (logo + tagline)
   - Removes legacy .heroTag if present (prevents double tagline)
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

    setActive("planning");
  }

  // ----------------------------
  // 3) Inject compact header strip (logo + tagline)
  // ----------------------------
  const host = document.querySelector(".topbarLeft");
  if (!host) return;

  // ✅ Remove legacy heroTag if it exists (prevents double tagline)
  const legacy = host.querySelector(".heroTag");
  if (legacy) legacy.remove();

  // avoid duplicates
  if (host.querySelector(".headerBrand")) return;

  const wrap = document.createElement("div");
  wrap.className = "headerBrand";
  wrap.innerHTML = `
    <div class="hbLeft">
      <div class="hbMark" aria-label="Scrummer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 12 L19 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      </div>

      <div class="hbText">
        <div class="hbLine">Know What’s Happening. Know What To Do Next.</div>
        <div class="hbSub">AI-powered delivery intelligence for modern Agile teams.</div>
      </div>
    </div>
  `;

  // Put strip at top of the header content area
  host.prepend(wrap);
})();