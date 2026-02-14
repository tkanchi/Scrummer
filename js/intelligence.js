(() => {
  const $ = (id) => document.getElementById(id);
  const setupApi = window.Scrummer?.setup;
  const compute = window.Scrummer?.computeSignals;
  const snapApi = window.Scrummer?.snapshots;

  function fmt(n, digits=0){
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(digits);
  }

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function setBar(id, percent){
    const el = $(id);
    if (!el) return;
    const p = clamp(percent, 0, 100);
    el.style.width = p + "%";
  }

  function deltaClass(d){
    if (!Number.isFinite(d) || d === 0) return "deltaFlat";
    return d > 0 ? "deltaUp" : "deltaDown";
  }

  function deltaText(d, suffix=""){
    if (!Number.isFinite(d) || d === 0) return "0" + suffix;
    const sign = d > 0 ? "+" : "";
    return sign + d + suffix;
  }

  function row(snapshot, prev){
    const wrap = document.createElement("div");
    wrap.className = "historyRow";

    const dt = new Date(snapshot.ts);
    const when = isNaN(dt.getTime()) ? snapshot.ts : dt.toLocaleString();

    const risk = Math.round(snapshot.riskScore || 0);
    const conf = Math.round(snapshot.confidence || 0);

    const prevRisk = prev ? Math.round(prev.riskScore || 0) : null;
    const prevConf = prev ? Math.round(prev.confidence || 0) : null;

    const dRisk = (prevRisk === null) ? 0 : (risk - prevRisk);
    const dConf = (prevConf === null) ? 0 : (conf - prevConf);

    const riskCls = deltaClass(-dRisk); // risk down is good
    const confCls = deltaClass(dConf);

    wrap.innerHTML = `
      <div class="historyLeft">
        <div class="historyTitle">Snapshot • ${when}</div>
        <div class="historyMeta">
          Committed: <b>${Math.round(snapshot.committed || 0)}</b> • Avg Velocity: <b>${fmt(snapshot.avgVelocity || 0, 1)}</b> • Focus: <b>${fmt(snapshot.focusFactor || 0, 2)}</b>
        </div>
      </div>

      <div class="historyRight">
        <span class="pillMini">Risk: <b>${risk} (${snapshot.riskBand || "—"})</b> <span class="${riskCls}">(${deltaText(-dRisk)})</span></span>
        <span class="pillMini">Confidence: <b>${conf}%</b> <span class="${confCls}">(${deltaText(dConf, "%")})</span></span>
        <span class="pillMini">Capacity: <b>${snapshot.capacityHealth || "—"}</b></span>
      </div>
    `;
    return wrap;
  }

  function renderHistory(){
    if (!snapApi) return;
    const list = $("historyList");
    const empty = $("historyEmpty");
    if (!list || !empty) return;

    const snaps = snapApi.loadSnapshots();
    list.innerHTML = "";

    if (!snaps.length){
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    const show = snaps.slice(0, 8);
    show.forEach((s, i) => {
      const prev = show[i+1] || null;
      list.appendChild(row(s, prev));
    });
  }

  function fingerprintSnapshot(s){
    const obj = {
      committed: Math.round(s.committed||0),
      avgVelocity: Number((s.avgVelocity||0).toFixed(2)),
      capacitySP: Number((s.capacitySP||0).toFixed(2)),
      focus: Number((s.focusFactor||0).toFixed(2)),
      risk: Math.round(s.riskScore||0),
      conf: Math.round(s.confidence||0)
    };
    return JSON.stringify(obj);
  }

  function driverCard({title, score, maxScore, desc, action}){
    const wrap = document.createElement("div");
    wrap.className = "driverItem";

    const pct = maxScore > 0 ? clamp((score / maxScore) * 100, 0, 100) : 0;

    wrap.innerHTML = `
      <div class="driverLeft">
        <div class="driverTitle">${title}</div>
        <div class="driverDesc">${desc}</div>
        <div class="driverDesc"><b>Next action:</b> ${action}</div>
      </div>
      <div class="driverRight">
        <div class="driverScore">${Math.round(score)} / ${Math.round(maxScore)}</div>
        <div class="driverBar"><div class="driverBarFill" style="width:${pct}%"></div></div>
        <div class="driverMini">${Math.round(pct)}% contribution</div>
      </div>
    `;
    return wrap;
  }

  function renderDrivers(signals){
    const list = $("driversList");
    const empty = $("driversEmpty");
    if (!list || !empty) return;

    list.innerHTML = "";

    if (!(signals.committed > 0) || !(signals.avgVelocity > 0)){
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    const c = signals.components || { over:0, cap:0, vola:0 };
    const drivers = [
      {
        key: "over",
        title: "Scope pressure (Overcommit)",
        score: c.over || 0,
        maxScore: 50,
        desc: `Commitment vs average velocity: <b>${fmt(signals.overcommitRatio, 2)}</b>.`,
        action: (signals.overcommitRatio > 1.1)
          ? "De-scope 10–20% of lowest value work or split 1–2 large stories today."
          : "Protect the plan: avoid mid-sprint additions and keep WIP low."
      },
      {
        key: "cap",
        title: "Capacity shortfall (Availability)",
        score: c.cap || 0,
        maxScore: 35,
        desc: `Effective capacity vs commitment: <b>${fmt(signals.capacitySP / Math.max(signals.committed, 1), 2)}</b>. (Leaves/holidays reduce capacity.)`,
        action: (signals.capacityShortfallRatio > 1.2)
          ? "Reduce commitment or shift non-critical work; align with PO immediately."
          : "Create buffer: identify 1–2 optional items that can be dropped if surprises hit."
      },
      {
        key: "vola",
        title: "Predictability (Velocity volatility)",
        score: c.vola || 0,
        maxScore: 15,
        desc: `Velocity variability: <b>${Math.round(signals.vol * 100)}%</b> (higher = less predictable).`,
        action: (signals.vol > 0.35)
          ? "Stabilize: split large work, tighten refinement, and limit WIP for smoother throughput."
          : "Maintain stability: keep story sizes small and clarify acceptance criteria early."
      }
    ];

    // Sort by score desc
    drivers.sort((a,b)=> (b.score||0) - (a.score||0));

    drivers.forEach(d => list.appendChild(driverCard(d)));
  }

  function update(){
    if (!setupApi || !compute) return;

    const setup = setupApi.loadSetup();
    const s = compute(setup);

    // Guided summary banner
    const banner = document.getElementById('summaryBanner');
    const st = document.getElementById('summaryTitle');
    const sx = document.getElementById('summaryText');
    const sb = document.getElementById('summaryBadge');
    if (banner && st && sx && sb) {
      if (!(s.committed > 0) || !(s.avgVelocity > 0)) {
        banner.style.display = 'flex';
        banner.className = 'banner mt12 bannerWarn';
        st.textContent = 'Step 1 required: complete Sprint Setup';
        sx.textContent = 'Go to Launchpad and enter commitment + last 3 sprint velocities. Then return here to see risk, confidence and actions.';
        sb.textContent = 'Setup needed';
      } else {
        banner.style.display = 'flex';
        const risk = Math.round(s.riskScore || 0);
        const conf = Math.round(s.confidence || 0);
        if (risk <= 30) {
          banner.className = 'banner mt12 bannerOk';
          st.textContent = 'Healthy sprint — keep execution steady';
          sx.textContent = `Risk is ${risk} (${s.riskBand}). Confidence is ${conf}%. Focus on removing blockers early and keeping WIP low.`;
          sb.textContent = 'On track';
        } else if (risk <= 60) {
          banner.className = 'banner mt12 bannerWarn';
          st.textContent = 'Moderate risk — protect scope and capacity';
          sx.textContent = `Risk is ${risk} (${s.riskBand}). Confidence is ${conf}%. Create buffer (optional items) and review dependencies today.`;
          sb.textContent = 'Watch closely';
        } else {
          banner.className = 'banner mt12 bannerDanger';
          st.textContent = 'High risk — take action now';
          sx.textContent = `Risk is ${risk} (${s.riskBand}). Confidence is ${conf}%. Reduce scope 10–20% and re-check capacity/leave impact.`;
          sb.textContent = 'Action required';
        }
      }
    }

    // KPIs
    $("kpiRisk").textContent = Number.isFinite(s.riskScore) ? `${Math.round(s.riskScore)} (${s.riskBand})` : "—";
    $("kpiConfidence").textContent = Number.isFinite(s.confidence) ? `${Math.round(s.confidence)}%` : "—";
    $("kpiFocus").textContent = (s.avgVelocity > 0) ? `${Math.round(s.focusFactor * 100)}%` : "—";
    $("kpiCapacity").textContent = s.capacityHealth || "—";

    // Bars
    setBar("barRisk", Number.isFinite(s.riskScore) ? s.riskScore : 0);
    setBar("barConfidence", Number.isFinite(s.confidence) ? s.confidence : 0);

    // Snapshot
    $("detailAvgVelocity").textContent = s.avgVelocity > 0 ? fmt(s.avgVelocity, 1) : "—";
    $("detailCapacitySP").textContent = s.capacitySP > 0 ? fmt(s.capacitySP, 1) : "—";
    $("detailCommitted").textContent = s.committed > 0 ? fmt(s.committed, 0) : "—";
    $("detailVol").textContent = (s.avgVelocity > 0) ? `${Math.round(s.vol * 100)}%` : "—";

    // Formula row (quick context under KPIs)
    if ($("detailOvercommit")) $("detailOvercommit").textContent = (s.avgVelocity > 0) ? `${s.overcommitRatio.toFixed(2)}×` : "—";
    if ($("detailCapRatio")) $("detailCapRatio").textContent = (s.capacitySP > 0) ? `${s.capacityShortfallRatio.toFixed(2)}×` : "—";
    if ($("detailFocusPct")) $("detailFocusPct").textContent = (s.avgVelocity > 0) ? `${Math.round(s.focusFactor * 100)}%` : "—";
    if ($("detailRiskScore")) $("detailRiskScore").textContent = Number.isFinite(s.riskScore) ? `${Math.round(s.riskScore)}` : "—";


    // Risk signals (MVP heuristics)
    const scopeText = (s.overcommitRatio > 1.1) ? "High (overcommitted)" :
                      (s.overcommitRatio > 1.0) ? "Moderate (tight)" :
                      (s.overcommitRatio > 0) ? "Low" : "—";
    const capText = (s.capacityShortfallRatio > 1.2) ? "High (capacity shortfall)" :
                    (s.capacityShortfallRatio > 1.0) ? "Moderate (watch)" :
                    (s.capacitySP > 0) ? "Low" : "—";
    const flowText = (s.vol > 0.35) ? "High (unstable velocity)" :
                     (s.vol > 0.20) ? "Moderate (variable)" :
                     (s.avgVelocity > 0) ? "Low" : "—";

    const scopeEl = $("sigScope"); if (scopeEl){ scopeEl.className = 'chip ' + (scopeText.startsWith('High') ? 'danger' : (scopeText.startsWith('Moderate') ? 'warn' : 'ok')); scopeEl.innerHTML = `<span class="chipDot"></span> Scope: <b>${scopeText}</b>`; }
    const capEl = $("sigCapacity"); if (capEl){ capEl.className = 'chip ' + (capText.startsWith('High') ? 'danger' : (capText.startsWith('Moderate') ? 'warn' : 'ok')); capEl.innerHTML = `<span class="chipDot"></span> Capacity: <b>${capText}</b>`; }
    const flowEl = $("sigFlow"); if (flowEl){ flowEl.className = 'chip ' + (flowText.startsWith('High') ? 'danger' : (flowText.startsWith('Moderate') ? 'warn' : 'ok')); flowEl.innerHTML = `<span class="chipDot"></span> Flow: <b>${flowText}</b>`; }
    const depEl = $("sigDeps"); if (depEl){ depEl.className = 'chip warn'; depEl.innerHTML = `<span class="chipDot"></span> Dependencies: <b>Manual (add later)</b>`; }

    // Drivers + History
    renderDrivers(s);
    renderHistory();

    return s;
  }

  function wire(){
    const saveBtn = $("saveSnapshot");
    const clearBtn = $("clearHistory");

    if (saveBtn && setupApi && compute && snapApi){
      saveBtn.addEventListener("click", () => {
        const s = compute(setupApi.loadSetup());
        if (!(s.committed > 0) || !(s.avgVelocity > 0)){
          if (sb) { sb.textContent = "Setup needed"; }
          return;
        }
        const snap = snapApi.makeSnapshot(s);
        snapApi.addSnapshot(snap);
        renderHistory();
        if (sb) { sb.textContent = "Snapshot saved"; setTimeout(()=>{ sb.textContent = "—"; }, 1600); }
      });
    }

    if (clearBtn && snapApi){
      clearBtn.addEventListener("click", () => {
        snapApi.saveSnapshots([]);
        renderHistory();
      });
    }
  }

  update();
  wire();

  window.addEventListener("storage", (e) => {
    const keySetup = window.Scrummer?.setup?.STORAGE_KEY || "scrummer-setup-v1";
    const keySnap = window.Scrummer?.snapshots?.SNAP_KEY || "scrummer-snapshots-v1";
    if (e.key === keySetup || e.key === keySnap) update();
  });
})();
