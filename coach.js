(()=>{
  "use strict";
  const A=window.AcademyAdvisorCore, C=window.AcademyCoachCore;
  if(!A || !C) throw new Error("El núcleo del Coach no está disponible");
  const STORAGE_KEY="admira-academy-coach-v1", LOG_ENDPOINT="/api/coach-log";
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const params=new URLSearchParams(location.search);
  let audience=A.audience(params.get("audiencia")), agentId=A.council(params.get("id")).id, visibleSlot="";

  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if(parsed && parsed.records) return {version:1,records:{silicio:parsed.records.silicio || {},carbono:parsed.records.carbono || {}}};
    }catch(_error){}
    return {version:1,records:{silicio:{},carbono:{}}};
  }
  function save(state){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  function record(state){
    state.records[audience] ||= {};
    state.records[audience][agentId] ||= {completions:[]};
    state.records[audience][agentId].completions ||= [];
    return state.records[audience][agentId];
  }
  function selectedCompletions(state=load()){ return record(state).completions; }
  function current(){ const now=new Date(), lesson=C.lessonAt(now); return {now,lesson,slot:C.slotAt(now),id:C.completionId(audience,agentId,now,lesson.id)}; }
  function syncUrl(){ const next=new URL(location.href); next.searchParams.set("id",agentId); next.searchParams.set("audiencia",audience); history.replaceState(null,"",next); }
  function status(message,type="info"){
    const node=$("#sync-status"); node.textContent=message; node.dataset.type=type; node.hidden=false;
  }
  function renderSelectors(){
    $("#student-select").innerHTML=A.COUNCIL.map(agent=>`<option value="${agent.id}" ${agent.id===agentId ? "selected" : ""}>${escapeHtml(agent.seat)} · ${escapeHtml(agent.role)} · ${escapeHtml(agent.alias)}</option>`).join("");
    $$('[data-audience]').forEach(button=>{ const active=button.dataset.audience===audience; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
    const agent=A.council(agentId); $("#learner-label").textContent=`${agent.role} · ${agent.alias}`; $("#audience-label").textContent=audience;
    $("#highscore-link").href=`/highscore/?audiencia=${audience}&periodo=day`;
  }
  function renderSchedule(now){
    $("#schedule").innerHTML=C.schedule(now,3).map(item=>`<article class="schedule-item ${item.current ? "current" : ""}" style="--tone:${item.tone}"><time>${item.hour}</time><span>${item.number}</span><div><strong>${escapeHtml(item.dimensionLabel)}</strong><small>${item.current ? "Ahora" : "Después"}</small></div></article>`).join("");
  }
  function renderBalance(completions){
    const result=C.balance(completions), maximum=Math.max(1,...Object.values(result.counts));
    $("#balance-label").textContent=result.label; $("#balance-total").textContent=String(result.total);
    $("#balance-grid").innerHTML=C.DIMENSIONS.map(dimension=>`<div class="balance-row" style="--tone:${dimension.tone}"><div><span>${escapeHtml(dimension.label)}</span><b>${result.counts[dimension.id]}</b></div><progress max="${maximum}" value="${result.counts[dimension.id]}">${result.counts[dimension.id]}</progress></div>`).join("");
    $("#balance-note").textContent=result.total===0 ? "Completa y registra una lección de cada dimensión para medir el equilibrio." : result.balanced ? "Las tres capacidades avanzan sin que ninguna quede atrás." : "La diferencia supera una lección: el ciclo te mostrará qué dimensión necesita recuperar terreno.";
  }
  function renderHistory(completions){
    const items=[...completions].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,6);
    $("#history").innerHTML=items.length ? items.map(item=>`<li><span class="history-mark" style="--tone:${escapeHtml(C.DIMENSIONS.find(d=>d.id===item.dimension)?.tone || "#a88cff")}"></span><div><strong>${escapeHtml(item.dimensionLabel)} · ${escapeHtml(item.title)}</strong><small>${new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.at))} · ${item.yokup?.status==="verified" ? "Yokup verificado" : "registro pendiente"}</small></div>${item.yokup?.status==="verified" ? "" : `<button type="button" class="retry" data-retry="${escapeHtml(item.id)}">Reintentar</button>`}</li>`).join("") : '<li class="empty-history">Aún no hay lecciones registradas para este agente.</li>';
    $$('[data-retry]').forEach(button=>button.addEventListener("click",()=>{ const pending=selectedCompletions().find(item=>item.id===button.dataset.retry); if(pending) syncCompletion(pending); }));
  }
  function renderLesson(){
    const snapshot=current(), completions=selectedCompletions(), existing=completions.find(item=>item.id===snapshot.id);
    visibleSlot=snapshot.slot;
    document.documentElement.style.setProperty("--lesson-tone",snapshot.lesson.tone);
    $("#dimension-number").textContent=snapshot.lesson.number; $("#dimension-name").textContent=snapshot.lesson.dimensionLabel;
    $("#lesson-title").textContent=snapshot.lesson.title; $("#lesson-principle").textContent=snapshot.lesson.principle; $("#lesson-practice").textContent=snapshot.lesson.practice;
    $("#dimension-promise").textContent=snapshot.lesson.promise; $("#slot-label").textContent=`Franja ${C.slotLabel(snapshot.now).slice(11)}:00–${String((snapshot.now.getHours()+1)%24).padStart(2,"0")}:00`;
    $("#lesson-id").textContent=snapshot.id;
    const button=$("#complete-lesson"), application=$("#application");
    if(existing?.yokup?.status==="verified"){
      button.disabled=true; button.textContent="Lección registrada ✓"; application.value=existing.application || ""; application.disabled=true;
      status(`Registro confirmado en Yokup · ${existing.yokup.registry || existing.yokup.missionId}`,"success");
    }else{
      button.disabled=false; button.textContent=existing ? "Reintentar registro en Yokup" : "Completar y registrar en Yokup"; application.disabled=false; application.value=existing?.application || application.value;
      if(existing) status(`Pendiente de sincronizar: ${existing.yokup?.error || "vuelve a intentarlo"}`,"error"); else $("#sync-status").hidden=true;
    }
    renderSchedule(snapshot.now); renderBalance(completions); renderHistory(completions);
  }
  function upsertCompletion(completion){
    const state=load(), completions=record(state).completions, index=completions.findIndex(item=>item.id===completion.id);
    if(index>=0) completions[index]=completion; else completions.push(completion);
    save(state);
  }
  async function syncCompletion(base){
    $("#complete-lesson").disabled=true; status("Registrando la evidencia en Yokup…","info");
    try{
      const response=await fetch(LOG_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({audience:base.audience,counselor:base.counselor,slotId:base.slotId,application:base.application})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.ok) throw new Error(result.error || `Yokup respondió ${response.status}`);
      upsertCompletion({...base,id:result.eventId,at:result.completedAt,lessonId:result.lessonId,dimension:result.dimension,dimensionLabel:C.DIMENSIONS.find(item=>item.id===result.dimension)?.label || base.dimensionLabel,yokup:{status:"verified",registry:result.registry,eventId:result.eventId,completedAt:result.completedAt,syncedAt:new Date().toISOString(),reused:Boolean(result.reused)}});
      renderLesson();
    }catch(error){
      upsertCompletion({...base,yokup:{status:"pending",error:String(error.message || error).slice(0,180)}});
      renderLesson();
    }
  }
  async function completeLesson(){
    const application=$("#application").value.replace(/\s+/g," ").trim(), snapshot=current();
    if(snapshot.slot!==visibleSlot){ renderLesson(); status("La hora cambió: ya tienes delante la nueva lección.","info"); return; }
    if(application.length<20){ status("Describe en al menos 20 caracteres cómo aplicarás esta lección.","error"); $("#application").focus(); return; }
    const agent=A.council(agentId), base={id:snapshot.id,audience,counselor:agent.id,slotId:snapshot.slot,lessonId:snapshot.lesson.id,dimension:snapshot.lesson.dimension,dimensionLabel:snapshot.lesson.dimensionLabel,title:snapshot.lesson.title,at:new Date().toISOString(),application,yokup:{status:"pending"}};
    upsertCompletion(base); await syncCompletion(base);
  }
  function tick(){
    const snapshot=current(); $("#countdown").textContent=C.countdown(snapshot.now).label;
    if(visibleSlot && snapshot.slot!==visibleSlot) renderLesson();
  }
  $("#student-select").addEventListener("change",event=>{ agentId=A.council(event.target.value).id; syncUrl(); renderSelectors(); renderLesson(); });
  $$('[data-audience]').forEach(button=>button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); syncUrl(); renderSelectors(); renderLesson(); }));
  $("#complete-lesson").addEventListener("click",completeLesson);
  window.addEventListener("storage",renderLesson);
  syncUrl(); renderSelectors(); renderLesson(); tick(); setInterval(tick,1000);
})();
