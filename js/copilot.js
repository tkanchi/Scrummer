(function(){
  const $ = (id) => document.getElementById(id);
  const setupApi = window.Scrummer?.setup;
  const computeSignals = window.Scrummer?.computeSignals;

  const COPILOT_KEY = "scrummer-copilot-v1";

  function loadCopilot(){
    try{
      const raw = localStorage.getItem(COPILOT_KEY);
      const v = raw ? JSON.parse(raw) : {};
      return (v && typeof v === "object") ? v : {};
    }catch{ return {}; }
  }

  function saveCopilot(obj){
    try{ localStorage.setItem(COPILOT_KEY, JSON.stringify(obj)); }catch(e){}
  }

  /* =========================================================
     FIX 1: Tab active class should match CSS: .is-active
     ========================================================= */
  function setActiveTab(tab){
    document.querySelectorAll(".segBtn").forEach(b=>{
      b.classList.toggle("is-active", b.dataset.tab === tab);
    });
  }

  function showMsg(text){
    const el = $("copilotMsg");
    if (!el) return;
    el.style.display = "block";
    el.textContent = text;
    setTimeout(()=>{ el.style.display="none"; }, 1800);
  }

  // --- Recommendation logic (Level 1, deterministic) ---
  function recommend(signals){
    const over = signals.overcommitRatio || 0;
    const capRatio = (signals.avgVelocity > 0) ? (signals.capacitySP / signals.avgVelocity) : 0;
    const focus = signals.focusFactor || 0;
    const vol = signals.vol || 0;
    const conf = signals.confidence || 0;

    // Thresholds (tunable)
    if (over > 1.10 || capRatio < 1.0) return "planning";
    if (focus < 0.90) return "daily";
    if (vol > 0.18) return "retro";
    if (conf < 70) return "review";
    return "planning";
  }

  function setRecommendationUI(tab){
    const map = {
      planning: ["badgePlanning", "Planning"],
      daily: ["badgeDaily", "Daily"],
      refine: ["badgeRefine", "Refinement"],
      review: ["badgeReview", "Review"],
      retro: ["badgeRetro", "Retro"]
    };

    Object.keys(map).forEach(k=>{
      const el = $(map[k][0]);
      if (!el) return;
      el.style.display = (k === tab) ? "inline-flex" : "none";
    });

    const badge = $("copilotRecommended");
    if (badge) badge.textContent = "Recommended: " + (map[tab]?.[1] || "—");
  }

  function fmtX(n){
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(2) + "×";
  }

  /* =========================================================
     FIX 2: Green/Yellow/Red coloring for brief KPI values
     Uses CSS vars: --success --warning --danger
     ========================================================= */
  function paint(el, tone){
    if (!el) return;
    el.style.color = tone ? `var(--${tone})` : "";
    el.style.fontWeight = "950";
  }

  function renderBrief(s){
    const scopeEl = $("briefScope");
    const capEl = $("briefCapRatio");
    const confEl = $("briefConf");
    const riskEl = $("briefRisk");

    const over = s.overcommitRatio || 0;
    const capRatio = (s.avgVelocity > 0) ? (s.capacitySP / s.avgVelocity) : 0;
    const conf = Number.isFinite(s.confidence) ? Math.round(s.confidence) : NaN;
    const risk = Number.isFinite(s.riskScore) ? Math.round(s.riskScore) : NaN;

    if (scopeEl) scopeEl.textContent = fmtX(over);
    if (capEl) capEl.textContent = fmtX(capRatio);
    if (confEl) confEl.textContent = Number.isFinite(conf) ? (conf + "%") : "—";
    if (riskEl) riskEl.textContent = Number.isFinite(risk) ? String(risk) : "—";

    const meta = $("briefRiskMeta");
    if (meta) meta.textContent = (s.riskBand ? (s.riskBand + " risk") : "—");

    // If setup missing, don’t color anything
    if (!(s.committed > 0) || !(s.avgVelocity > 0)){
      paint(scopeEl, null);
      paint(capEl, null);
      paint(confEl, null);
      paint(riskEl, null);
      if (meta) meta.textContent = "Complete Setup first";
      const badge = $("copilotRecommended");
      if (badge) badge.textContent = "Recommended: Setup required";
      return;
    }

    // Scope pressure: <=1 OK, 1–1.1 warn, >1.1 danger
    if (over > 1.10) paint(scopeEl, "danger");
    else if (over > 1.00) paint(scopeEl, "warning");
    else paint(scopeEl, "success");

    // Capacity ratio vs velocity: <1 danger, 1–1.1 warn, >=1.1 ok
    if (capRatio < 1.00) paint(capEl, "danger");
    else if (capRatio < 1.10) paint(capEl, "warning");
    else paint(capEl, "success");

    // Confidence: >=80 ok, 60–79 warn, <60 danger
    if (conf >= 80) paint(confEl, "success");
    else if (conf >= 60) paint(confEl, "warning");
    else paint(confEl, "danger");

    // Risk: <=30 ok, 31–60 warn, >60 danger
    if (risk <= 30) paint(riskEl, "success");
    else if (risk <= 60) paint(riskEl, "warning");
    else paint(riskEl, "danger");
  }

  // Content templates
  function contentFor(tab, s){
    const over = s.overcommitRatio || 0;
    const capShort = s.capacityShortfallRatio || 0;
    const capRatio = (s.avgVelocity > 0) ? (s.capacitySP / s.avgVelocity) : 0;
    const focus = s.focusFactor || 0;
    const vol = s.vol || 0;
    const conf = s.confidence || 0;

    const base = {
      planning: {
        title: "Sprint Planning",
        why: "Confirm commitment with confidence. Planning is where you prevent spillover before it starts.",
        list: [
          "Validate committed scope against average velocity (avoid optimistic planning).",
          "Confirm availability assumptions (leave/holidays) and adjust capacity.",
          "Identify optional backlog items and agree de-scope triggers."
        ],
        fields: [
          { id:"finalCommit", label:"Final Commitment (SP)", type:"number", placeholder:"e.g., 135" },
          { id:"scopeAdjusted", label:"Scope Adjusted?", type:"select", options:["No","Yes"] },
          { id:"riskAcceptance", label:"Risk Acceptance Level", type:"select", options:["Low","Medium","High"] },
          { id:"owner", label:"Owner for Follow-Up", type:"text", placeholder:"Name / role" }
        ]
      },
      daily: {
        title: "Daily Scrum",
        why: "Protect flow and unblock work fast. Daily is a risk-control loop, not a status meeting.",
        list: [
          "Identify items aging too long and remove blockers with owners.",
          "Limit parallel work and focus on finishing (reduce WIP).",
          "Escalate dependencies early (same day)."
        ],
        fields: [
          { id:"flowAdjusted", label:"Flow Adjustment Made?", type:"select", options:["No","Yes"] },
          { id:"blockerOwner", label:"Blocker Owner", type:"text", placeholder:"Name / role" },
          { id:"wipMove", label:"WIP Decision", type:"select", options:["No change","Reduce WIP","Swarm on critical","Pause new work"] }
        ]
      },
      refine: {
        title: "Backlog Refinement",
        why: "Reduce future delivery surprises by improving story readiness before planning.",
        list: [
          "Confirm acceptance criteria and split oversized items.",
          "Identify unknowns, dependencies, and test data needs early.",
          "Ensure top items are truly 'Ready' before sprint start."
        ],
        fields: [
          { id:"readyCount", label:"Items marked Ready", type:"number", placeholder:"e.g., 8" },
          { id:"riskNotes", label:"Top risk clarified", type:"text", placeholder:"Dependency / unknown resolved" }
        ]
      },
      review: {
        title: "Sprint Review",
        why: "Make progress visible and validate value. Use feedback to steer the next sprint.",
        list: [
          "Highlight what shipped vs committed and why gaps happened.",
          "Capture stakeholder feedback and translate into backlog updates.",
          "Confirm next sprint priority alignment."
        ],
        fields: [
          { id:"shipped", label:"Shipped vs Committed", type:"select", options:["Ahead","On track","Behind"] },
          { id:"feedbackOwner", label:"Owner for feedback items", type:"text", placeholder:"Name / role" }
        ]
      },
      retro: {
        title: "Retrospective",
        why: "Improve the system. Pick one experiment that reduces risk next sprint.",
        list: [
          "Identify the biggest constraint (process, dependency, quality, or WIP).",
          "Choose ONE measurable experiment (avoid many weak actions).",
          "Assign owner + review date for the experiment."
        ],
        fields: [
          { id:"experiment", label:"Chosen Experiment", type:"text", placeholder:"e.g., Reduce WIP to 4" },
          { id:"expOwner", label:"Owner", type:"text", placeholder:"Name / role" },
          { id:"reviewWhen", label:"Review In", type:"select", options:["Next Daily","Mid-sprint","Next Retro"] }
        ]
      }
    };

    // Signal-driven adjustments (executive, subtle)
    if (tab === "planning"){
      const list = base.planning.list.slice();
      if (over > 1.10) list.unshift("Scope pressure detected: re-check commitment vs velocity before locking sprint.");
      if (capShort > 1.00 || capRatio < 1.0) list.unshift("Capacity is tight: adjust commitment or staffing assumptions.");
      base.planning.list = list.slice(0, 5);
      base.planning.why = (over > 1.10 || capRatio < 1.0)
        ? "Signals suggest commitment pressure. Use planning to re-balance scope and capacity."
        : base.planning.why;
    }
    if (tab === "daily"){
      if (focus < 0.90){
        base.daily.list.unshift("Focus is low: too much parallel work is likely. Consider swarming and reducing WIP.");
      }
      base.daily.list = base.daily.list.slice(0,5);
    }
    if (tab === "retro"){
      if (vol > 0.18){
        base.retro.list.unshift("Predictability variance detected: dig into what changed sprint-to-sprint.");
      }
      base.retro.list = base.retro.list.slice(0,5);
    }
    if (tab === "review"){
      if (conf < 70){
        base.review.list.unshift("Confidence is low: use review to confirm expectations and reset scope/priorities early.");
      }
      base.review.list = base.review.list.slice(0,5);
    }

    return base[tab];
  }

  function renderPanel(tab, s){
    const c = contentFor(tab, s);
    $("panelTitle").textContent = c.title;
    $("panelWhy").textContent = c.why;

    const ul = $("panelList");
    ul.innerHTML = "";
    c.list.forEach(t=>{
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });

    const grid = $("decisionFields");
    grid.innerHTML = "";

    const store = loadCopilot();
    const saved = store[tab] || {};

    c.fields.forEach(f=>{
      const wrap = document.createElement("label");
      const d = document.createElement("div");
      d.className = "cardDesc m0";
      d.textContent = f.label;
      wrap.appendChild(d);

      let input;
      if (f.type === "select"){
        input = document.createElement("select");
        input.className = "selectLike"; // ok even if not styled; will render native
        f.options.forEach(opt=>{
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement("input");
        input.className = "btn";
        input.type = f.type;
        input.placeholder = f.placeholder || "";
        input.style.width = "100%";
      }

      input.id = "cp_" + f.id;
      const v = saved[f.id];
      if (v !== undefined && v !== null) input.value = v;
      wrap.appendChild(input);
      grid.appendChild(wrap);
    });

    // Wire Save/Clear for this tab
    $("copilotSave").onclick = () => {
      const store = loadCopilot();
      const obj = {};
      c.fields.forEach(f=>{
        const el = $("cp_" + f.id);
        obj[f.id] = el ? el.value : "";
      });
      obj.savedAt = new Date().toISOString();
      store[tab] = obj;
      saveCopilot(store);
      showMsg("Saved.");
    };

    $("copilotClear").onclick = () => {
      const store = loadCopilot();
      delete store[tab];
      saveCopilot(store);
      renderPanel(tab, s);
      showMsg("Cleared.");
    };
  }

  function init(){
    if (!setupApi || !computeSignals) return;

    const setup = setupApi.loadSetup();
    const s = computeSignals(setup);

    renderBrief(s);

    // If setup missing, still allow tabs + panel, but recommendation is setup-required safe default
    const rec = (s.committed > 0 && s.avgVelocity > 0) ? recommend(s) : "planning";
    setRecommendationUI(rec);

    // tabs
    document.querySelectorAll(".segBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tab = btn.dataset.tab;
        setActiveTab(tab);
        renderPanel(tab, s);
      });
    });

    // initial
    setActiveTab(rec);
    renderPanel(rec, s);
  }

  init();

  // Optional: refresh KPIs if setup changes in another tab
  window.addEventListener("storage", (e) => {
    const keySetup = window.Scrummer?.setup?.STORAGE_KEY || "scrummer-setup-v1";
    if (e.key === keySetup) init();
  });

})();