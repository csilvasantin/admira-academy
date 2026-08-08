(() => {
  "use strict";
  const A = window.AcademyAdvisorCore;
  const T = window.AcademyTrainingCore;
  if(!A || !T) throw new Error("Los módulos de consejeros y formación no están disponibles");

  const PIXERIA_IMPORT = "https://macmini.tail48b61c.ts.net/admira/tube/import-to-stock";
  const PIXERIA_STATUS = "https://macmini.tail48b61c.ts.net/admira/tube/status";
  const PIXERIA_INDEX = "https://pub-bf043a4daa3b43b7a0b769617729d074.r2.dev/stock/index.json";
  const PIXERIA_PUBLIC = "https://www.pixeria.com/stock.html";
  const MAX_VIDEO_MINUTES = 5;
  const $ = (selector,root=document) => root.querySelector(selector);
  const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  let agent = A.council(params.get("id"));
  let audience = A.audience(params.get("audiencia"));
  let selectedPeriod = A.period(params.get("periodo")).id;
  let trainingOpen = false;
  let polling = false;
  const states = {
    academy:localStorage.getItem("admira-academy-v1-progress"),
    platform:localStorage.getItem("admira-academy-platform-v1"),
    carbon:localStorage.getItem("admira-academy-carbon-v1")
  };

  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function formatDate(value){ try{return new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch(_error){return value;} }
  function delay(ms){ return new Promise(resolve => setTimeout(resolve,ms)); }
  function academyState(){ return A.parseState(states.academy); }
  function trainingFor(){ return A.parseState(academyState().trainings)[agent.id] || null; }
  function saveTraining(training){
    const state = academyState();
    state.trainings = A.parseState(state.trainings);
    state.trainings[agent.id] = training;
    states.academy = JSON.stringify(state);
    localStorage.setItem("admira-academy-v1-progress",states.academy);
  }
  function record(training,stage,status,detail){ T.transition(training,stage,status,detail); saveTraining(training); }
  function ensureTraining(){
    let training = trainingFor();
    if(!training){
      training = T.createTraining(agent.id,T.defaultTopic(agent.id),MAX_VIDEO_MINUTES);
      record(training,"formación","iniciada","Flujo iniciado desde la ficha pública del consejero.");
    }
    if(!training.topic) training.topic = T.defaultTopic(agent.id);
    if(!training.maxDurationMinutes) training.maxDurationMinutes = MAX_VIDEO_MINUTES;
    return training;
  }
  function syncUrl(){
    const next = new URL(location.href); next.searchParams.set("id",agent.id); next.searchParams.set("audiencia",audience); next.searchParams.set("periodo",selectedPeriod);
    history.replaceState(null,"",next); $("#canonical-link").href = `https://www.admira.academy/consejeros/?id=${agent.id}&audiencia=${audience}`;
  }
  function renderCouncilNav(){
    $("#council-nav").innerHTML = A.COUNCIL.map(item => `<a href="?id=${item.id}&audiencia=${audience}&periodo=${selectedPeriod}" class="${item.id === agent.id ? "active" : ""}" aria-current="${item.id === agent.id ? "page" : "false"}"><span>${item.seat}</span>${item.role}</a>`).join("");
  }
  function renderHeader(){
    document.title = `${agent.role} · Detalle del consejero — Admira Academy`;
    document.documentElement.style.setProperty("--tone",agent.tone);
    $("#seat").textContent = `SILLA ${agent.seat}`; $("#role").textContent = agent.role;
    $("#alias").textContent = `Espíritu operativo: ${agent.alias}`; $("#area").textContent = agent.area; $("#purpose").textContent = agent.purpose;
    $$('[data-audience]').forEach(button => { const active = button.dataset.audience === audience; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
    $("#audience-state").textContent = audience === "silicio" ? "Agente de silicio · trazabilidad de este navegador" : "Agente de carbono · registro independiente";
    const p = A.progress(agent.id,audience,states);
    $("#progress-label").textContent = p.label; $("#progress-detail").textContent = p.detail;
    $("#progress-meter").hidden = p.value === null;
    if(p.value !== null){ $("#progress-meter progress").value = p.value; $("#progress-value").textContent = `${p.value}%`; }
  }
  function renderPeriods(){
    const activities = A.collect(agent.id,audience,states);
    $("#period-grid").innerHTML = A.PERIODS.map(item => {
      const summary = A.summarize(activities,item.id);
      return `<button type="button" class="period-card${item.id === selectedPeriod ? " active" : ""}" data-period="${item.id}" aria-pressed="${item.id === selectedPeriod}"><span>${item.label}</span><strong>${summary.improvements}</strong><small>hitos de mejora</small><dl><div><dt>Leído</dt><dd>${summary.read}</dd></div><div><dt>Visto</dt><dd>${summary.viewed}</dd></div></dl></button>`;
    }).join("");
    $$('[data-period]').forEach(button => button.addEventListener("click",()=>{ selectedPeriod=button.dataset.period; syncUrl(); renderPeriods(); renderTimeline(); }));
  }
  function renderTimeline(){
    const summary = A.summarize(A.collect(agent.id,audience,states),selectedPeriod);
    $("#timeline-title").textContent = A.period(selectedPeriod).label;
    $("#timeline-count").textContent = `${summary.total} ${summary.total === 1 ? "registro" : "registros"}`;
    if(!summary.items.length){
      $("#timeline").innerHTML = `<div class="empty"><strong>Sin actividad trazada en este periodo.</strong><p>${audience === "carbono" ? "Carbono mantiene un registro separado: no se copiará ni simulará el aprendizaje de silicio." : "La ficha se actualizará cuando este navegador guarde lecturas, vídeos, transiciones o cierres para esta silla."}</p></div>`;
      return;
    }
    const labels={leido:"Leído",visto:"Visto",mejora:"Mejora"};
    $("#timeline").innerHTML = summary.items.map(item => `<article class="activity ${item.kind}"><span class="activity-kind">${labels[item.kind]}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail || "Actividad registrada sin detalle adicional.")}</p>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir fuente ↗</a>` : ""}</div><time datetime="${escapeHtml(item.at)}">${formatDate(item.at)}</time></article>`).join("");
  }

  function trainingStatus(training){
    if(audience === "carbono") return "Solo silicio";
    if(training?.pixeria?.status === "verified") return "Verificado";
    if(training?.pixeria?.status === "imported_needs_tags") return "Revisar etiquetas";
    if(training?.pixeria?.status === "processing") return "Procesando";
    if(training?.pixeria?.status === "error") return "Error";
    if(training?.video) return "Fuente validada";
    return "Pendiente";
  }
  function setNotice(message,tone=""){
    const notice = $("#training-notice");
    notice.textContent = message;
    notice.className = `flow-notice${tone ? ` ${tone}` : ""}`;
  }
  function setTrainingDisabled(disabled){
    ["#training-video-url","#training-video-minutes","#training-duration-confirmed","#training-video-review","#pixeria-consent","#pixeria-import"].forEach(selector => { $(selector).disabled = disabled; });
    $("#youtube-search").classList.toggle("disabled",disabled);
    $("#youtube-search").setAttribute("aria-disabled",String(disabled));
  }
  function pixeriaHref(itemId){
    const url = new URL(PIXERIA_PUBLIC);
    if(itemId) url.searchParams.set("highlight",itemId);
    return url.toString();
  }
  function renderPixeriaPreview(training){
    const preview = $("#pixeria-preview");
    const pixeria = training?.pixeria;
    if(!pixeria?.itemUrl){ preview.hidden = true; preview.innerHTML = ""; return; }
    const tags = Array.isArray(pixeria.tags) ? pixeria.tags.join(" · ") : "etiquetas pendientes";
    preview.hidden = false;
    preview.innerHTML = `<div class="preview-media"><video controls preload="metadata"${pixeria.thumbnail ? ` poster="${escapeHtml(pixeria.thumbnail)}"` : ""} src="${escapeHtml(pixeria.itemUrl)}"></video><span>PREVIO VERIFICADO · PIXERIA</span></div><div class="preview-copy"><p>${pixeria.status === "verified" ? "Archivo público y correctamente asignado" : "Archivo público; asignación pendiente de corregir"}</p><h3>${escapeHtml(pixeria.title || training.video?.title || "Vídeo de formación")}</h3><dl><div><dt>Consejero</dt><dd>${escapeHtml(agent.alias)}</dd></div><div><dt>Etiquetas</dt><dd>${escapeHtml(tags)}</dd></div></dl><div class="preview-links"><a href="${escapeHtml(training.video?.url || "#")}" target="_blank" rel="noopener">YouTube ↗</a><a href="${escapeHtml(pixeriaHref(pixeria.itemId))}" target="_blank" rel="noopener">Abrir en Pixeria ↗</a></div></div>`;
  }
  function renderTraining(){
    const panel = $("#training-panel");
    const training = audience === "silicio" ? trainingFor() : null;
    panel.hidden = !trainingOpen;
    $("#train-open").setAttribute("aria-expanded",String(trainingOpen));
    $("#train-open").classList.toggle("active",trainingOpen);
    $("#training-title").textContent = `Formar al ${agent.role}`;
    $("#training-status").textContent = trainingStatus(training);
    $("#search-query").textContent = T.youtubeSearchQuery(agent.id,training?.topic || T.defaultTopic(agent.id));
    $("#youtube-search").href = T.youtubeSearchUrl(agent.id,training?.topic || T.defaultTopic(agent.id));
    $("#training-intro").textContent = audience === "carbono"
      ? "La formación automatizada mediante Pixeria corresponde al agente de silicio. Carbono mantiene su evidencia y progreso en un registro independiente."
      : "Busca una fuente breve y pertinente. El vídeo aporta contexto; el aprendizaje se registra mediante evidencia y guion, no por la mera subida.";
    setTrainingDisabled(audience !== "silicio" || polling);
    $("#training-video-url").value = training?.video?.url || "";
    $("#training-video-minutes").value = training?.video?.durationSeconds ? String(Math.round(training.video.durationSeconds / 6) / 10) : "";
    $("#training-duration-confirmed").checked = Boolean(training?.video?.durationConfirmedAt);
    const youtubeCard = $("#youtube-card");
    if(training?.video){
      youtubeCard.hidden = false;
      youtubeCard.innerHTML = `${training.video.thumbnail ? `<img src="${escapeHtml(training.video.thumbnail)}" alt="">` : ""}<div><span>METADATOS VERIFICADOS · YOUTUBE</span><strong>${escapeHtml(training.video.title || "Vídeo verificado")}</strong><p>${escapeHtml(training.video.author || "Autor publicado en YouTube")}</p></div>`;
    }else{ youtubeCard.hidden = true; youtubeCard.innerHTML = ""; }
    const importButton = $("#pixeria-import");
    importButton.textContent = training?.pixeria?.status === "processing" ? "Comprobar estado" : "Subir a Pixeria";
    if(audience === "carbono") setNotice("Selecciona Silicio para formar este agente sin mezclar los registros.","warning");
    else if(training?.pixeria?.status === "verified") setNotice("Subida verificada en el índice público de Pixeria.","success");
    else if(training?.pixeria?.status === "imported_needs_tags") setNotice("El archivo está en Pixeria, pero aún no tiene todas las etiquetas canónicas.","warning");
    else if(training?.pixeria?.status === "processing") setNotice(training.pixeria.detail || "Pixeria continúa procesando el vídeo.","pending");
    else if(training?.pixeria?.status === "error") setNotice(training.pixeria.detail || "Pixeria devolvió un error.","warning");
    else if(training?.video) setNotice("Fuente validada. Confirma su duración y autoriza la importación.","pending");
    else setNotice("El previo aparecerá aquí cuando el archivo sea verificable en el índice público.");
    renderPixeriaPreview(training);
  }
  function render(){ syncUrl(); renderCouncilNav(); renderHeader(); renderTraining(); renderPeriods(); renderTimeline(); }

  async function fetchPixeriaItem(videoUrl){
    const response = await fetch(`${PIXERIA_INDEX}?t=${Date.now()}`,{cache:"no-store",headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error(`Índice de Pixeria: ${response.status}`);
    return A.findPixeriaVideo(await response.json(),videoUrl);
  }
  function acceptPixeriaItem(training,item){
    const tagged = T.hasRequiredPixeriaTags(agent.id,item);
    training.pixeria = {
      status:tagged ? "verified" : "imported_needs_tags",
      detail:tagged ? "Importado, etiquetado y verificable en Pixeria" : "Importado en Pixeria; faltan las etiquetas canónicas",
      itemId:item.id || null,itemUrl:item.url || null,thumbnail:item.thumbnail || null,title:item.title || null,
      tags:Array.isArray(item.tags) ? item.tags : [],mime:item.mime || null,verifiedAt:new Date().toISOString()
    };
    record(training,"Pixeria",training.pixeria.status,training.pixeria.detail);
    render();
  }
  async function validateVideo(){
    if(audience !== "silicio") return;
    const canonical = T.canonicalYouTubeUrl($("#training-video-url").value);
    if(!canonical){ setNotice("Introduce una URL válida de YouTube (watch, youtu.be, shorts o live).","warning"); return; }
    setNotice("Consultando los metadatos públicos de YouTube…","pending");
    $("#training-video-review").disabled = true;
    try{
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
      const response = await fetch(endpoint,{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error(`YouTube respondió ${response.status}`);
      const data = await response.json();
      const training = ensureTraining();
      training.video = {url:canonical,id:T.extractYouTubeId(canonical),title:data.title,author:data.author_name,thumbnail:data.thumbnail_url,verifiedAt:new Date().toISOString(),metadataSource:endpoint,durationSeconds:null,durationStatus:"pending",durationConfirmedAt:null};
      training.pixeria = {status:"pending",detail:"Pendiente de importar en Pixeria"};
      record(training,"vídeo","metadatos verificados · duración pendiente",`Metadatos públicos: ${data.title} — ${data.author_name}.`);
      render();
    }catch(error){ setNotice(`La fuente no se pudo verificar: ${error.message}.`,"warning"); }
    finally{ $("#training-video-review").disabled = false; }
  }
  function confirmDuration(training){
    const minutes = Number($("#training-video-minutes").value);
    const confirmed = $("#training-duration-confirmed").checked;
    const checked = T.validateVideoDuration(minutes * 60,MAX_VIDEO_MINUTES,confirmed);
    if(!checked.compatible){ setNotice(checked.reason,"warning"); return false; }
    training.video.durationSeconds = Math.round(minutes * 60);
    training.video.durationStatus = checked.status;
    training.video.durationConfirmedAt = new Date().toISOString();
    return true;
  }
  async function pollPixeria(training,maxAttempts=240){
    polling = true; renderTraining();
    for(let attempt=0;attempt<maxAttempts;attempt += 1){
      if(attempt) await delay(2000);
      try{
        const item = await fetchPixeriaItem(training.video.url);
        if(item){ polling=false; acceptPixeriaItem(training,item); return; }
        if(training.pixeria.jobId){
          const response = await fetch(`${PIXERIA_STATUS}?id=${encodeURIComponent(training.pixeria.jobId)}`,{headers:{Accept:"application/json"}});
          if(response.ok){
            const status = await response.json();
            if(status.state === "error"){
              training.pixeria = {...training.pixeria,status:"error",detail:`Pixeria no pudo procesar el vídeo${status.error ? `: ${status.error}` : "."}`};
              record(training,"Pixeria","error",training.pixeria.detail); polling=false; render(); return;
            }
          }
        }
      }catch(_error){}
    }
    training.pixeria = {...training.pixeria,status:"processing",detail:"La importación sigue pendiente de confirmación pública. Usa «Comprobar estado» sin volver a subir."};
    record(training,"Pixeria","procesando",training.pixeria.detail); polling=false; render();
  }
  async function importPixeria(){
    if(audience !== "silicio" || polling) return;
    const training = trainingFor();
    if(!training?.video){ setNotice("Primero pega y valida una URL real de YouTube.","warning"); return; }
    const canonical = T.canonicalYouTubeUrl($("#training-video-url").value);
    if(canonical !== training.video.url){ setNotice("La URL ha cambiado. Vuelve a validar sus metadatos.","warning"); return; }
    if(training.pixeria?.status === "processing"){ pollPixeria(training); return; }
    if(!confirmDuration(training)) return;
    if(!$("#pixeria-consent").checked){ setNotice("Autoriza explícitamente la importación antes de continuar.","warning"); return; }
    setNotice("Comprobando si esta fuente ya existe en Pixeria…","pending");
    try{
      const existing = await fetchPixeriaItem(training.video.url);
      if(existing){ acceptPixeriaItem(training,existing); return; }
      const info = T.role(agent.id);
      const response = await fetch(PIXERIA_IMPORT,{
        method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({url:training.video.url,format:"video",comment:T.buildPixeriaComment(agent.id,training.topic),tags:["formacion",info.tag]})
      });
      if(!response.ok) throw new Error(`Pixeria respondió ${response.status}`);
      const job = await response.json();
      training.pixeria = {status:"processing",detail:"Pixeria está procesando el vídeo; no cierres esta página.",jobId:job.jobId || job.id || null,requestedAt:new Date().toISOString()};
      record(training,"Pixeria","procesando",`Solicitud aceptada${training.pixeria.jobId ? ` (trabajo ${training.pixeria.jobId})` : ""}.`);
      render();
      pollPixeria(training);
    }catch(error){
      training.pixeria = {...training.pixeria,status:"error",detail:`Importación no completada: ${error.message}`};
      record(training,"Pixeria","error",training.pixeria.detail); render();
    }
  }

  $("#train-open").addEventListener("click",()=>{ trainingOpen=!trainingOpen; renderTraining(); if(trainingOpen) $("#training-panel").scrollIntoView({behavior:"smooth",block:"start"}); });
  $("#youtube-search").addEventListener("click",event=>{
    if(audience !== "silicio"){ event.preventDefault(); return; }
    const training = ensureTraining();
    training.search = {status:"ready_for_review",query:T.youtubeSearchQuery(agent.id,training.topic),url:T.youtubeSearchUrl(agent.id,training.topic),detail:"Búsqueda pública abierta; selección manual pendiente.",updatedAt:new Date().toISOString()};
    record(training,"fuentes","búsqueda abierta · revisión necesaria",training.search.detail);
  });
  $("#training-video-review").addEventListener("click",validateVideo);
  $("#pixeria-import").addEventListener("click",importPixeria);
  $$('[data-audience]').forEach(button => button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); syncUrl(); render(); }));
  render();
})();
