(() => {
  const STORAGE_KEY = "scrummer-setup-v1";

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function safeNum(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function mean(arr){
    const a = arr.filter(n => Number.isFinite(n));
    if (!a.length) return 0;
    return a.reduce((x,y)=>x+y,0) / a.length;
  }

  function stdev(arr){
    const a = arr.filter(n => Number.isFinite(n));
    if (a.length < 2) return 0;
    const m = mean(a);
    const v = a.reduce((s,x)=>s + (x-m)*(x-m), 0) / (a.length - 1);
    return Math.sqrt(v);
  }

  function loadSetup(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveSetup(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Core calculations (MVP, deterministic)
  function computeSignals(setup){
    const sprintDays = safeNum(setup.sprintDays);
    const teamMembers = safeNum(setup.teamMembers);
    const leaveDays = safeNum(setup.leaveDays);
    const committed = safeNum(setup.committedSP);

    const v1 = safeNum(setup.v1);
    const v2 = safeNum(setup.v2);
    const v3 = safeNum(setup.v3);
    const velocities = [v1, v2, v3].filter(n => n > 0);

    const avgVelocity = mean(velocities);

    // Ideal person-days
    const idealPD = sprintDays * teamMembers;                 // e.g., 10*7=70
    const availablePD = Math.max(0, idealPD - leaveDays);     // total lost days aggregated
    const availabilityRatio = idealPD > 0 ? (availablePD / idealPD) : 0;

    // Convert person-day availability into "effective velocity capacity".
    // Assumption: velocity roughly scales with availability.
    const capacitySP = avgVelocity > 0 ? (avgVelocity * availabilityRatio) : 0;

    // Ratios
    const overcommitRatio = avgVelocity > 0 ? (committed / avgVelocity) : 0; // >1 means overcommit
    const capacityShortfallRatio = capacitySP > 0 ? (committed / capacitySP) : 0; // >1 means shortfall
    const focusFactor = avgVelocity > 0 ? (capacitySP / avgVelocity) : availabilityRatio; // equals availabilityRatio

    const vol = (avgVelocity > 0) ? (stdev(velocities) / avgVelocity) : 0;

    // Risk components (0..100)
    // Overcommit penalty: 0..50
    const over = clamp((overcommitRatio - 1) * 60, 0, 50);
    // Capacity penalty: 0..35
    const cap = clamp((capacityShortfallRatio - 1) * 50, 0, 35);
    // Volatility penalty: 0..15 (vol 0.0 to 0.5 maps roughly)
    const vola = clamp(vol * 30, 0, 15);

    const riskScore = clamp(over + cap + vola, 0, 100);

    // Confidence: start from capacity-to-commitment, penalize volatility, cap at 100
    const base = committed > 0 ? (capacitySP / committed) * 100 : 0;
    const confidence = clamp(base - (vola * 2), 0, 100);

    // Capacity health label
    let capacityHealth = "—";
    if (committed > 0 && capacitySP > 0){
      const ratio = capacitySP / committed;
      if (ratio >= 1.0) capacityHealth = "Healthy";
      else if (ratio >= 0.85) capacityHealth = "At Risk";
      else capacityHealth = "Critical";
    }

    // Signal labels for UI
    const riskBand = riskScore <= 30 ? "Low" : (riskScore <= 60 ? "Moderate" : "High");

    return {
      sprintDays, teamMembers, leaveDays, committed,
      velocities, avgVelocity, idealPD, availablePD, availabilityRatio,
      capacitySP, overcommitRatio, capacityShortfallRatio, focusFactor, vol,
      riskScore, riskBand, confidence, capacityHealth,
      components: { over, cap, vola }
    };
  }



  // Snapshot storage (for "SaaS feel" + history)
  const SNAP_KEY = "scrummer-snapshots-v1";

  function loadSnapshots(){
    try{
      const raw = localStorage.getItem(SNAP_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch{
      return [];
    }
  }

  function saveSnapshots(arr){
    localStorage.setItem(SNAP_KEY, JSON.stringify(arr));
  }

  function addSnapshot(snapshot){
    const arr = loadSnapshots();
    arr.unshift(snapshot);
    // Keep last 30
    saveSnapshots(arr.slice(0, 30));
    return arr;
  }

  function makeSnapshot(signals){
    const now = new Date();
    return {
      id: `${now.getTime()}`,
      ts: now.toISOString(),
      committed: signals.committed || 0,
      avgVelocity: signals.avgVelocity || 0,
      capacitySP: signals.capacitySP || 0,
      focusFactor: signals.focusFactor || 0,
      riskScore: signals.riskScore || 0,
      riskBand: signals.riskBand || "—",
      confidence: signals.confidence || 0,
      capacityHealth: signals.capacityHealth || "—",
      vol: signals.vol || 0
    };
  }

  // Expose a small API on window
  window.Scrummer = window.Scrummer || {};
  window.Scrummer.setup = { loadSetup, saveSetup, STORAGE_KEY };
  window.Scrummer.snapshots = { loadSnapshots, saveSnapshots, addSnapshot, makeSnapshot, SNAP_KEY };
  window.Scrummer.computeSignals = computeSignals;
})();
