(()=>{
  "use strict";
  const A=window.AcademyAdvisorCore, C=window.AcademyCoachCore;
  if(!A || !C) throw new Error("El núcleo del Coach no está disponible");
  const STORAGE_KEY="admira-academy-coach-v1", LOG_ENDPOINT="/api/coach-log", LAUNCH_ENDPOINT="/api/coach-launch", PROGRESS_ENDPOINT="/api/coach-progress", SOURCE_ENDPOINT="/api/coach-source";
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const params=new URLSearchParams(location.search);
  let audience=A.audience(params.get("audiencia")), agentId=A.council(params.get("id")).id, visibleSlot="", sourceRequest=0, progressRequest=0, launching=false, autoLaunchAttempted="";
  const PROGRESS_STEPS=[
    {id:"opening_terminal",label:"Abrir terminal",progress:5},
    {id:"asking_grok",label:"Consultar Grok",progress:15},
    {id:"searching_youtube",label:"Buscar YouTube",progress:30},
    {id:"selecting_source",label:"Elegir fuente",progress:42},
    {id:"transcribing",label:"Transcribir",progress:55},
    {id:"synthesizing",label:"Interpretar",progress:68},
    {id:"importing_pixeria",label:"Importar vídeo",progress:82},
    {id:"publishing_capsule",label:"Publicar cápsula",progress:92},
    {id:"verifying_yokup",label:"Verificar Yokup",progress:97}
  ];

  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if(parsed && parsed.records) return {version:1,records:{silicio:parsed.records.silicio || {},carbono:parsed.records.carbono || {}},launches:{silicio:parsed.launches?.silicio || {},carbono:parsed.launches?.carbono || {}}};
    }catch(_error){}
    return {version:1,records:{silicio:{},carbono:{}},launches:{silicio:{},carbono:{}}};
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
  function selectedLaunch(state=load()){ return state.launches?.[audience]?.[agentId] || null; }
  function saveLaunch(launch){ const state=load(); state.launches[audience] ||= {}; state.launches[audience][agentId]=launch; save(state); }
  function active(){
    const hourly=current(), launch=selectedLaunch();
    if(!launch || !Number.isInteger(Number(launch.targetSlotId))) return hourly;
    const targetSlot=Number(launch.targetSlotId);
    if(targetSlot<hourly.slot || targetSlot>hourly.slot+1) return hourly;
    const now=new Date(targetSlot*C.HOUR), lesson=C.lessonAt(now);
    if(lesson.id!==launch.lessonId || lesson.dimension!==launch.dimension) return hourly;
    return {now,lesson,slot:targetSlot,id:C.completionId(audience,agentId,now,lesson.id),manual:true,launch};
  }
  function syncUrl(){ const next=new URL(location.href); next.searchParams.set("id",agentId); next.searchParams.set("audiencia",audience); history.replaceState(null,"",next); }
  function status(message,type="info"){
    const node=$("#sync-status"); node.textContent=message; node.dataset.type=type; node.hidden=false;
  }
  function sourceStatus(message,type="info"){
    const node=$("#source-status"); node.textContent=message; node.dataset.type=type; node.hidden=false;
  }
  function progressHourStart(){
    const slot=C.slotAt(new Date()), launch=selectedLaunch(), target=Number(launch?.targetSlotId);
    return Number.isInteger(target) && target>=slot-1 && target<=slot+1 ? target*C.HOUR : slot*C.HOUR;
  }
  function renderLatestCapsule(capsule){
    if(!capsule?.smith || capsule.smith.status!=="verified") return;
    const dimension=C.DIMENSIONS.find(item=>item.id===capsule.tema), finishedAt=Number(capsule.smith.updated_at || capsule.at || 0), link=$("#latest-capsule-link"), time=$("#latest-capsule-time");
    $("#latest-capsule-title").textContent=capsule.title || "Cápsula de conocimiento";
    $("#latest-capsule-type").textContent=dimension?.label || capsule.tema_nombre || "Formación";
    $(".latest-capsule").style.setProperty("--latest-tone",dimension?.tone || "#ffd76a");
    link.href=capsule.smith.capsule_id ? `https://www.pixeria.com/stock.html?highlight=${encodeURIComponent(capsule.smith.capsule_id)}` : "https://www.pixeria.com/stock.html";
    if(finishedAt){
      const date=new Date(finishedAt); time.dateTime=date.toISOString(); time.textContent=`finalizada ${new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(date)}`;
    }
  }
  function renderAgentProgress(capsule){
    const smith=capsule?.smith || {}, statusValue=smith.status || "pending", stage=smith.stage || "queued", progress=statusValue==="verified" ? 100 : Math.max(0,Math.min(99,Number(smith.progress)||0));
    const node=$("#agent-progress"), title={queued:"Esperando a Smith",opening_terminal:"Abriendo terminal",asking_grok:"Grok prepara la búsqueda",searching_youtube:"Buscando en YouTube",selecting_source:"Eligiendo la mejor fuente",transcribing:"Transcribiendo el vídeo",synthesizing:"Interpretando el conocimiento",importing_pixeria:"Importando en Pixeria",publishing_capsule:"Publicando la cápsula",verifying_yokup:"Verificando en Yokup",verified:"Cápsula terminada",error:"Smith necesita reintentar"}[stage] || "Smith está trabajando";
    node.dataset.state=statusValue;
    $("#agent-progress-title").textContent=title; $("#agent-progress-percent").textContent=`${progress}%`; $("#agent-progress-bar").style.width=`${progress}%`;
    $("#agent-progress-detail").textContent=smith.detail || "Yokup mostrará aquí cada hito real del agente.";
    $("#agent-progress-steps").innerHTML=PROGRESS_STEPS.map(item=>{ const current=item.id===stage, done=statusValue==="verified" || item.progress<progress || (item.progress===progress && !current); return `<li class="${current ? "current" : done ? "done" : ""}" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</li>`; }).join("");
    const updated=Number(smith.updated_at || capsule?.at || 0);
    $("#agent-progress-time").textContent=updated ? `Último hito confirmado por Yokup · ${new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(updated))}` : "Esperando el primer latido de Smith";
  }
  async function pollAgentProgress(){
    const request=++progressRequest, hourStart=progressHourStart();
    try{
      const response=await fetch(`${PROGRESS_ENDPOINT}?hourStart=${hourStart}`,{headers:{Accept:"application/json"},cache:"no-store"});
      const result=await response.json().catch(()=>({}));
      if(request!==progressRequest) return;
      if(response.ok && result.ok){ if(result.capsula) renderAgentProgress(result.capsula); if(result.latest) renderLatestCapsule(result.latest); }
    }catch(_error){ /* Se conserva el último hito visible; el polling reintentará. */ }
  }
  function splitCapsule(summary){
    const text=String(summary || "").replace(/\r/g,"").trim();
    const carbon=text.match(/PARA CARBONO\s*\n([\s\S]*?)(?=\n\s*PARA SILICIO|$)/i)?.[1]?.trim() || "";
    const silicon=text.match(/PARA SILICIO\s*\n([\s\S]*?)(?=\n\s*APLICACIÓN|$)/i)?.[1]?.trim() || "";
    const application=text.match(/APLICACIÓN\s*\n([\s\S]*)$/i)?.[1]?.trim() || "";
    return {carbon,silicon,application};
  }
  function renderSource(result){
    const registry=result?.registry?.source || result, pixeria=result?.pixeria || {}, structured=pixeria.summary || {};
    if(!registry?.capsuleAssetId || !registry?.previewAssetId) return;
    const parts=splitCapsule(registry.summary || pixeria.capsule?.comment), preview=$("#source-preview");
    $("#source-title").textContent=registry.title || pixeria.capsule?.title || "Cápsula de conocimiento";
    $("#source-carbon").textContent=structured.carbono || parts.carbon;
    $("#source-silicon").textContent=structured.silicio || parts.silicon;
    $("#source-application").textContent=structured.aplicacion || parts.application;
    $("#source-original").href=registry.sourceUrl || pixeria.sourceUrl;
    $("#source-pixeria").href=registry.pixeriaUrl || `https://www.pixeria.com/stock.html?highlight=${encodeURIComponent(registry.capsuleAssetId)}`;
    preview.src=registry.imageUrl || pixeria.preview?.url || ""; preview.alt=`Previo de ${$("#source-title").textContent}`;
    $("#source-result").hidden=false;
  }
  async function loadSources(){
    const request=++sourceRequest, expectedAudience=audience, expectedAgent=agentId;
    try{
      const response=await fetch(`${SOURCE_ENDPOINT}?audience=${encodeURIComponent(expectedAudience)}&counselor=${encodeURIComponent(expectedAgent)}`,{headers:{Accept:"application/json"}});
      const result=await response.json().catch(()=>({}));
      if(request!==sourceRequest || expectedAudience!==audience || expectedAgent!==agentId) return;
      if(response.ok && result.ok && result.sources?.[0]) renderSource(result.sources[0]);
      else $("#source-result").hidden=true;
    }catch(_error){ if(request===sourceRequest) $("#source-result").hidden=true; }
  }
  function renderSelectors(){
    $("#student-select").innerHTML=A.COUNCIL.map(agent=>`<option value="${agent.id}" ${agent.id===agentId ? "selected" : ""}>${escapeHtml(agent.seat)} · ${escapeHtml(agent.role)} · ${escapeHtml(agent.alias)}</option>`).join("");
    $$('[data-audience]').forEach(button=>{ const active=button.dataset.audience===audience; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
    const agent=A.council(agentId); $("#learner-label").textContent=`${agent.role} · ${agent.alias}`; $("#audience-label").textContent=audience;
    $("#source-target").textContent=`${agent.role} · ${agent.alias} · ${audience}`;
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
    const snapshot=active(), completions=selectedCompletions(), existing=completions.find(item=>item.id===snapshot.id);
    visibleSlot=snapshot.slot;
    document.documentElement.style.setProperty("--lesson-tone",snapshot.lesson.tone);
    $("#dimension-number").textContent=snapshot.lesson.number; $("#dimension-name").textContent=snapshot.lesson.dimensionLabel;
    $("#lesson-title").textContent=snapshot.lesson.title; $("#lesson-principle").textContent=snapshot.lesson.principle; $("#lesson-practice").textContent=snapshot.lesson.practice;
    $("#dimension-promise").textContent=snapshot.lesson.promise; $("#slot-label").textContent=`${snapshot.manual ? "Cápsula manual · " : "Franja "}${C.slotLabel(snapshot.now).slice(11)}:00–${String((snapshot.now.getHours()+1)%24).padStart(2,"0")}:00`;
    $("#lesson-id").textContent=snapshot.id;
    const button=$("#complete-lesson"), application=$("#application");
    if(existing?.yokup?.status==="verified"){
      button.disabled=true; button.textContent="Lección registrada ✓"; application.value=existing.application || ""; application.disabled=true;
      status(`Registro confirmado en Yokup · ${existing.yokup.registry || existing.yokup.missionId}`,"success");
    }else{
      button.disabled=false; button.textContent=existing ? "Reintentar registro en Yokup" : "Completar y registrar en Yokup"; application.disabled=false; application.value=existing?.application || application.value;
      if(existing) status(`Pendiente de sincronizar: ${existing.yokup?.error || "vuelve a intentarlo"}`,"error");
      else if(snapshot.manual) status(`Cápsula manual lanzada y registrada en Yokup · ${snapshot.lesson.dimensionLabel}`,"success");
      else $("#sync-status").hidden=true;
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
    const application=$("#application").value.replace(/\s+/g," ").trim(), snapshot=active();
    if(snapshot.slot!==visibleSlot){ renderLesson(); status("La hora cambió: ya tienes delante la nueva lección.","info"); return; }
    if(application.length<20){ status("Describe en al menos 20 caracteres cómo aplicarás esta lección.","error"); $("#application").focus(); return; }
    const agent=A.council(agentId), base={id:snapshot.id,audience,counselor:agent.id,slotId:snapshot.slot,lessonId:snapshot.lesson.id,dimension:snapshot.lesson.dimension,dimensionLabel:snapshot.lesson.dimensionLabel,title:snapshot.lesson.title,at:new Date().toISOString(),application,launchId:snapshot.launch?.launchId || "",yokup:{status:"pending"}};
    upsertCompletion(base); await syncCompletion(base);
  }
  async function launchNextCapsule({automatic=false}={}){
    if(launching) return;
    const button=$("#launch-next-capsule"); launching=true; button.disabled=true; status(automatic ? "El reloj llegó a cero: Yokup está lanzando automáticamente la próxima cápsula…" : "Yokup está fijando la franja para que Smith prepare la próxima cápsula…","info");
    try{
      const response=await fetch(LAUNCH_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({audience})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.ok) throw new Error(result.error || `Yokup respondió ${response.status}`);
      const targetAt=new Date(Number(result.targetSlotId)*C.HOUR), derived=C.lessonAt(targetAt);
      if(!Number.isInteger(Number(result.targetSlotId)) || result.dimension!==derived.dimension || result.lessonId!==derived.id) throw new Error("Yokup devolvió una cápsula incoherente con el ciclo");
      const capsuleAgent=A.council(result.capsula?.seat).id;
      if(result.counselor!==capsuleAgent) throw new Error("Yokup devolvió una silla incoherente con la cápsula");
      const requestedAt=Date.now();
      agentId=capsuleAgent; syncUrl(); renderSelectors(); saveLaunch({...result,targetSlotId:Number(result.targetSlotId),requestedAt:new Date(requestedAt).toISOString(),nextLaunchAt:new Date(requestedAt+C.HOUR).toISOString()}); autoLaunchAttempted=""; renderLesson();
      renderAgentProgress(result.capsula); pollAgentProgress();
      status(`${automatic ? "Lanzamiento automático" : "Cápsula"} · ${derived.dimensionLabel} · Smith trabaja para ${A.council(agentId).role} · Yokup ${result.reused ? "reutilizó el registro" : "confirmó el registro"}`,"success");
    }catch(error){ status(`${automatic ? "El disparo automático falló" : "No se pudo lanzar la cápsula"}: ${String(error.message || error).slice(0,180)}`,"error"); }
    finally{ launching=false; tick(); }
  }
  async function importSiteSource(event){
    event.preventDefault();
    const input=$("#site-source-url"), button=$("#import-site-source"), url=input.value.trim(), agent=A.council(agentId);
    if(!url){ sourceStatus("Pega la URL pública del conocimiento que quieres incorporar.","error"); input.focus(); return; }
    button.disabled=true; $("#source-result").hidden=true; sourceStatus("Leyendo el sitio y extrayendo su contenido…","info");
    try{
      const response=await fetch(SOURCE_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({url,audience,counselor:agent.id})});
      sourceStatus("Pixeria está creando el previo y las dos interpretaciones…","info");
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.ok) throw new Error(result.error || `La importación respondió ${response.status}`);
      renderSource(result);
      sourceStatus(`Cápsula ${result.reused ? "reutilizada" : "creada"} y verificada en Yokup para ${agent.role} · ${audience}.`,"success");
      input.value=result.registry?.source?.sourceUrl || result.pixeria?.sourceUrl || url;
    }catch(error){ sourceStatus(`No se registró la cápsula: ${String(error.message || error).slice(0,180)}`,"error"); }
    finally{ button.disabled=false; }
  }
  function tick(){
    const hourly=current(), next=C.nextCapsule(hourly.now), shown=active();
    const launched=selectedLaunch(), cooldown=Date.parse(launched?.nextLaunchAt || "") || ((Date.parse(launched?.launchedAt || "") || 0)+C.HOUR), now=Date.now(), left=Math.max(0,cooldown-now), button=$("#launch-next-capsule");
    const transition=C.autoLaunchTransition(launched,cooldown,now,autoLaunchAttempted);
    if(transition.due && !launching){ autoLaunchAttempted=transition.key; void launchNextCapsule({automatic:true}); }
    if(left>0){
      const minutes=Math.floor(left/60000), seconds=Math.floor((left%60000)/1000);
      $("#countdown").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
      $("#next-dimension").textContent=C.DIMENSIONS.find(item=>item.id===launched.dimension)?.label || next.dimensionLabel;
      $("#launch-hint").textContent="Encargo activo · lanzamiento automático al llegar a 00:00";
    }else{
      $("#countdown").textContent=C.countdown(hourly.now).label; $("#next-dimension").textContent=next.dimensionLabel;
      $("#launch-hint").textContent=`Smith preparará la cápsula de las ${String(next.scheduledAt.getHours()).padStart(2,"0")}:00`;
    }
    button.disabled=launching || left>0;
    if(visibleSlot && shown.slot!==visibleSlot) renderLesson();
  }
  $("#student-select").addEventListener("change",event=>{ agentId=A.council(event.target.value).id; syncUrl(); renderSelectors(); renderLesson(); loadSources(); pollAgentProgress(); });
  $$('[data-audience]').forEach(button=>button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); syncUrl(); renderSelectors(); renderLesson(); loadSources(); pollAgentProgress(); }));
  $("#complete-lesson").addEventListener("click",completeLesson);
  $("#launch-next-capsule").addEventListener("click",()=>launchNextCapsule({automatic:false}));
  $("#source-import-form").addEventListener("submit",importSiteSource);
  window.addEventListener("storage",renderLesson);
  syncUrl(); renderSelectors(); renderLesson(); loadSources(); renderAgentProgress(null); pollAgentProgress(); tick(); setInterval(tick,1000); setInterval(pollAgentProgress,2000);
})();
