(() => {
  const list = document.getElementById("suggestionsList");
  const setupApi = window.Scrummer?.setup;
  const compute = window.Scrummer?.computeSignals;

  function card(title, desc){
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.innerHTML = `<div class="cardTitle">${title}</div><p class="cardDesc m0">${desc}</p>`;
    return wrap;
  }

  function render(){
    if (!list || !setupApi || !compute) return;
    list.innerHTML = "";

    const s = compute(setupApi.loadSetup());

    if (!(s.committed > 0) || !(s.avgVelocity > 0)){
      list.appendChild(card("Add your setup first",
        "Go to Launchpad and fill Sprint Days, Team Members, Commitment and last 3 sprint velocities. Then come back here."));
      return;
    }

    // Always show summary
    list.appendChild(card("Sprint Summary",
      `Risk: <b>${Math.round(s.riskScore)} (${s.riskBand})</b> • Confidence: <b>${Math.round(s.confidence)}%</b> • Focus: <b>${s.focusFactor.toFixed(2)}</b>`
    ));

    // Overcommit
    if (s.overcommitRatio > 1.1){
      list.appendChild(card("✅ Reduce overcommit now",
        "Your commitment is significantly above your average velocity. Renegotiate scope early: de-scope lowest value items, split stories, or move stretch work out of sprint."));
    } else if (s.overcommitRatio > 1.0){
      list.appendChild(card("✅ Tight sprint — protect the plan",
        "Commitment is slightly above your average velocity. Avoid adding new work mid-sprint and keep WIP low to improve throughput."));
    } else {
      list.appendChild(card("✅ Scope looks reasonable",
        "Commitment is within historical velocity. Focus on flow: reduce blockers and keep work moving to Done."));
    }

    // Capacity
    if (s.capacityShortfallRatio > 1.2){
      list.appendChild(card("✅ Capacity shortfall — adjust immediately",
        "Your effective capacity (based on leaves/holidays) is much lower than commitment. Reduce commitment or re-balance by shifting non-critical work."));
    } else if (s.capacityShortfallRatio > 1.0){
      list.appendChild(card("✅ Watch capacity — plan buffer",
        "Capacity is slightly below commitment. Create a buffer: identify 1–2 stories that can be dropped if surprises appear."));
    } else {
      list.appendChild(card("✅ Capacity is healthy",
        "Capacity appears sufficient for the committed scope. Use the extra room to finish strong and improve quality."));
    }

    // Volatility
    if (s.vol > 0.35){
      list.appendChild(card("✅ Stabilize delivery",
        "Your velocity has high variability. Focus on reducing large stories, limiting WIP, and improving refinement clarity to make execution more predictable."));
    } else if (s.vol > 0.20){
      list.appendChild(card("✅ Improve predictability",
        "Velocity is somewhat variable. Make sprint goals clearer and reduce scope churn to improve stability."));
    } else {
      list.appendChild(card("✅ Predictability looks good",
        "Velocity is stable. Maintain your current operating rhythm and invest in one improvement experiment."));
    }

    // Always: “what to do next”
    list.appendChild(card("Next best action",
      "Pick ONE improvement for this sprint: reduce WIP, shift testing left, or remove a top dependency. Track it daily and review impact in retro."));
  }

  render();
})();
