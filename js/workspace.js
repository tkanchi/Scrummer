
(function(){
  const $ = (id) => document.getElementById(id);

  function readLS(key, fallback=""){
    try{ const v = localStorage.getItem(key); return (v===null?fallback:v); }catch(e){ return fallback; }
  }
  function writeLS(key, value){
    try{ localStorage.setItem(key, value); }catch(e){}
  }

  function bindValue(id, key){
    const el = $(id);
    if (!el) return;
    el.value = readLS(key, "");
    el.addEventListener("input", ()=> writeLS(key, el.value));
  }

  function syncToSetup(){
    const map = [
      ["planCommitted","committedSP"],
      ["planSprintDays","sprintDays"],
      ["planTeamMembers","teamMembers"],
      ["planLeaveDays","leaveDays"]
    ];
    const data = {};
    map.forEach(([from,to])=>{
      const el = $(from);
      if (el && el.value !== "") data[to] = el.value;
    });
    if (window.Scrummer?.setup?.saveSetup){
      const existing = window.Scrummer.setup.loadSetup();
      window.Scrummer.setup.saveSetup(Object.assign({}, existing, data));
    }
  }

  // Planning inputs
  bindValue("planCommitted", "ws.plan.committed");
  bindValue("planSprintDays", "ws.plan.days");
  bindValue("planTeamMembers", "ws.plan.team");
  bindValue("planLeaveDays", "ws.plan.leave");
  ["planCommitted","planSprintDays","planTeamMembers","planLeaveDays"].forEach(id=>{
    const el=$(id);
    if (el) el.addEventListener("change", syncToSetup);
  });

  // Notes
  [
    ["planningNotes","ws.notes.planning"],
    ["dailyNotes","ws.notes.daily"],
    ["refineNotes","ws.notes.refine"],
    ["reviewNotes","ws.notes.review"],
    ["retroImprove","ws.notes.retroImprove"],
    ["retroActions","ws.notes.retroActions"]
  ].forEach(([id,key])=> bindValue(id,key));

  function wireSave(btnId, msgId, msg){
    const b=$(btnId); const m=$(msgId);
    if (!b) return;
    b.addEventListener("click", ()=>{
      syncToSetup();
      if (m){
        m.textContent = msg || "Saved";
        m.style.display = "block";
        setTimeout(()=>{ m.style.display="none"; }, 1600);
      }
    });
  }

  wireSave("savePlanning","msgPlanning","Saved locally (and synced to Setup).");
  wireSave("saveDaily","msgDaily","Saved locally.");
  wireSave("saveRefine","msgRefine","Saved locally.");
  wireSave("saveReview","msgReview","Saved locally.");
  wireSave("saveRetro","msgRetro","Saved locally.");
})();
