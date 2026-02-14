(() => {
  const list = document.getElementById("suggestionsList");
  const setupApi = window.Scrummer?.setup;
  const compute = window.Scrummer?.computeSignals;

  function card(title, descHtml, tone = "neutral") {
    const wrap = document.createElement("div");
    wrap.className = `actionCard ${tone}`;

    wrap.innerHTML = `
      <div class="actionHead">
        <div class="actionTitle">${title}</div>
        <span class="actionPill ${tone}">${tone.toUpperCase()}</span>
      </div>
      <p class="actionDesc m0">${descHtml}</p>
    `;
    return wrap;
  }

  function toneFromRisk(riskScore) {
    if (!Number.isFinite(riskScore)) return "neutral";
    if (riskScore <= 30) return "ok";
    if (riskScore <= 60) return "warn";
    return "danger";
  }

  function render() {
    if (!list || !setupApi || !compute) return;
    list.innerHTML = "";

    const s = compute(setupApi.loadSetup());

    if (!(s.committed > 0) || !(s.avgVelocity > 0)) {
      list.appendChild(
        card(
          "Add your setup first",
          "Go to Launchpad and fill Sprint Days, Team Members, Commitment and last 3 sprint velocities. Then come back here.",
          "warn"
        )
      );
      return;
    }

    // Summary card uses overall sprint risk tone
    const sprintTone = toneFromRisk(s.riskScore);
    list.appendChild(
      card(
        "Sprint Summary",
        `Risk: <b>${Math.round(s.riskScore)} (${s.riskBand})</b> • Confidence: <b>${Math.round(s.confidence)}%</b> • Focus: <b>${s.focusFactor.toFixed(
          2
        )}</b>`,
        sprintTone
      )
    );

    // Overcommit
    if (s.overcommitRatio > 1.1) {
      list.appendChild(
        card(
          "Reduce overcommit now",
          "Commitment is significantly above average velocity. Renegotiate scope early: de-scope lowest value items, split stories, or move stretch work out of sprint.",
          "danger"
        )
      );
    } else if (s.overcommitRatio > 1.0) {
      list.appendChild(
        card(
          "Tight sprint — protect the plan",
          "Commitment is slightly above average velocity. Avoid adding new work mid-sprint and keep WIP low.",
          "warn"
        )
      );
    } else {
      list.appendChild(
        card(
          "Scope looks reasonable",
          "Commitment is within historical velocity. Focus on flow: remove blockers and keep work moving to Done.",
          "ok"
        )
      );
    }

    // Capacity
    if (s.capacityShortfallRatio > 1.2) {
      list.appendChild(
        card(
          "Capacity shortfall — adjust immediately",
          "Effective capacity (after leave/holidays) is much lower than commitment. Reduce commitment or shift non-critical work.",
          "danger"
        )
      );
    } else if (s.capacityShortfallRatio > 1.0) {
      list.appendChild(
        card(
          "Watch capacity — plan buffer",
          "Capacity is slightly below commitment. Create a buffer: identify 1–2 stories that can be dropped if surprises appear.",
          "warn"
        )
      );
    } else {
      list.appendChild(
        card(
          "Capacity is healthy",
          "Capacity appears sufficient for the committed scope. Use the room to finish strong and improve quality.",
          "ok"
        )
      );
    }

    // Volatility
    if (s.vol > 0.35) {
      list.appendChild(
        card(
          "Stabilize delivery",
          "Velocity variability is high. Reduce large stories, limit WIP, and improve refinement clarity to become more predictable.",
          "danger"
        )
      );
    } else if (s.vol > 0.20) {
      list.appendChild(
        card(
          "Improve predictability",
          "Velocity is somewhat variable. Clarify sprint goals and reduce scope churn to improve stability.",
          "warn"
        )
      );
    } else {
      list.appendChild(
        card(
          "Predictability looks good",
          "Velocity is stable. Maintain rhythm and run one improvement experiment.",
          "ok"
        )
      );
    }

    // Next action
    list.appendChild(
      card(
        "Next best action",
        "Pick ONE improvement for this sprint: reduce WIP, shift testing left, or remove a top dependency. Track it daily and review impact in retro.",
        "neutral"
      )
    );
  }

  render();
})();