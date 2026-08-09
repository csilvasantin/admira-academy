(() =>{
  "use strict";
  const A=window.AcademyAdvisorCore;
  if(!A) throw new Error("AcademyAdvisorCore no está disponible");
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const params=new URLSearchParams(location.search);
  let audience=A.audience(params.get("audiencia"));
  let selectedPeriod=A.period(params.get("periodo")).id;

  function states(){
    return {academy:localStorage.getItem("admira-academy-v1-progress"),platform:localStorage.getItem("admira-academy-platform-v1"),carbon:localStorage.getItem("admira-academy-carbon-v1"),coach:localStorage.getItem("admira-academy-coach-v1")};
  }
  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function syncUrl(){
    const next=new URL(location.href); next.searchParams.set("audiencia",audience); next.searchParams.set("periodo",selectedPeriod); history.replaceState(null,"",next);
  }
  function periodTotals(currentStates){
    return Object.fromEntries(A.PERIODS.map(period=>[period.id,A.leaderboard(audience,currentStates,period.id).reduce((sum,row)=>sum+row.score,0)]));
  }
  function renderPeriods(currentStates){
    const totals=periodTotals(currentStates);
    $("#period-tabs").innerHTML=A.PERIODS.map(period=>`<button type="button" class="${period.id===selectedPeriod ? "active" : ""}" data-period="${period.id}" aria-pressed="${period.id===selectedPeriod}"><span>${escapeHtml(period.label)}</span><b>${totals[period.id]}</b></button>`).join("");
    $$('[data-period]').forEach(button=>button.addEventListener("click",()=>{ selectedPeriod=A.period(button.dataset.period).id; syncUrl(); render(); }));
  }
  function renderPodium(rows){
    const leaders=rows.filter(row=>row.score>0).slice(0,3);
    if(!leaders.length){ $("#podium").innerHTML='<div class="podium-empty"><strong>Aún no hay líder en este periodo.</strong><br>El primer estudio trazado abrirá el podio.</div>'; return; }
    const classes=["first","second","third"], medals=["01","02","03"];
    $("#podium").innerHTML=leaders.map((row,index)=>`<article class="podium-card ${classes[index]}" style="--tone:${escapeHtml(row.tone)}"><div class="podium-rank"><span>SILLA ${escapeHtml(row.seat)}</span><b>${medals[index]}</b></div><h3>${escapeHtml(row.role)}</h3><p>${escapeHtml(row.alias)}</p><div class="podium-score"><strong>${row.score}</strong><span>${row.score===1 ? "estudio" : "estudios"}</span></div><a href="/consejeros/?id=${row.id}&audiencia=${audience}&periodo=${selectedPeriod}" aria-label="Abrir detalle de ${escapeHtml(row.role)}"></a></article>`).join("");
  }
  function renderTable(rows){
    $("#ranking-body").innerHTML=rows.map(row=>`<tr style="--tone:${escapeHtml(row.tone)}"><td class="rank">${row.rank ? String(row.rank).padStart(2,"0") : "—"}</td><td><div class="student"><span class="seat">${escapeHtml(row.seat)}</span><div><strong>${escapeHtml(row.role)}</strong><small>${escapeHtml(row.alias)}</small></div></div></td><td class="score">${row.score}</td><td class="number">${row.read}</td><td class="number">${row.viewed}</td><td class="number">${row.lifetime}</td><td><a class="detail-link" href="/consejeros/?id=${row.id}&audiencia=${audience}&periodo=${selectedPeriod}">Ver ficha ↗</a></td></tr>`).join("");
  }
  function render(){
    const currentStates=states(), rows=A.leaderboard(audience,currentStates,selectedPeriod), active=rows.filter(row=>row.score>0), total=rows.reduce((sum,row)=>sum+row.score,0), leader=active[0] || null;
    $$('[data-audience]').forEach(button=>{ const pressed=button.dataset.audience===audience; button.classList.toggle("active",pressed); button.setAttribute("aria-pressed",String(pressed)); });
    $("#data-scope").textContent=audience==="silicio" ? "Silicio · trazabilidad local de este navegador" : "Carbono · registro local independiente";
    $("#total-studies").textContent=String(total); $("#selected-period-label").textContent=A.period(selectedPeriod).label.toLowerCase();
    $("#active-students").textContent=`${active.length}/8`; $("#leader-name").textContent=leader ? `${leader.role} · ${leader.alias}` : "Sin actividad"; $("#leader-score").textContent=`${leader?.score || 0} ${(leader?.score || 0)===1 ? "estudio" : "estudios"}`;
    $("#updated-at").textContent=`Actualizado ${new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`;
    renderPeriods(currentStates); renderPodium(rows); renderTable(rows);
  }
  $$('[data-audience]').forEach(button=>button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); syncUrl(); render(); }));
  window.addEventListener("storage",render);
  syncUrl(); render();
})();
