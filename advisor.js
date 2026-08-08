(() => {
  "use strict";
  const A = window.AcademyAdvisorCore;
  const T = window.AcademyTrainingCore;
  if(!A) throw new Error("AcademyAdvisorCore no está disponible");
  if(!T) throw new Error("AcademyTrainingCore no está disponible");
  const PIXERIA_IMPORT = "/api/pixeria-import";
  const PIXERIA_STATUS = "/api/pixeria-status";
  const PIXERIA_TAGS = "/api/pixeria-tags";
  const PIXERIA_INDEX = "https://pub-bf043a4daa3b43b7a0b769617729d074.r2.dev/stock/index.json";
  const STORAGE_KEY = "admira-academy-v1-progress";
  const $ = (selector,root=document) => root.querySelector(selector);
  const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  let agent = A.council(params.get("id"));
  let audience = A.audience(params.get("audiencia"));
  let selectedPeriod = A.period(params.get("periodo")).id;
  let academy = loadAcademy();
  const states = {
    academy:JSON.stringify(academy),
    platform:localStorage.getItem("admira-academy-platform-v1"),
    carbon:localStorage.getItem("admira-academy-carbon-v1")
  };

  function loadAcademy(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if(parsed && typeof parsed === "object") return { version:4, selected:parsed.selected || "ceo", records:parsed.records || {}, trainings:parsed.trainings || {}, topicDrafts:parsed.topicDrafts || {} };
    }catch(_error){}
    return { version:4, selected:"ceo", records:{}, trainings:{}, topicDrafts:{} };
  }
  function saveAcademy(){
    academy.selected = agent.id;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(academy));
    states.academy = JSON.stringify(academy);
  }
  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function formatDate(value){ try{return new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch(_error){return value;} }
  function setNotice(selector,message,kind=""){
    const node=$(selector); node.textContent=message; node.className=`formation-notice${kind ? ` ${kind}` : ""}`;
  }
  function syncUrl(){
    const next = new URL(location.href); next.searchParams.set("id",agent.id); next.searchParams.set("audiencia",audience); next.searchParams.set("periodo",selectedPeriod);
    history.replaceState(null,"",next); $("#canonical-link").href = `https://www.admira.academy/consejeros/?id=${agent.id}&audiencia=${audience}`;
  }
  function trainingFor(){ return academy.trainings[agent.id] || null; }
  function ensureTraining(){
    let training=trainingFor();
    if(!training){
      training=T.createTraining(agent.id,T.defaultTopic(agent.id),T.DEFAULT_MAX_DURATION_MINUTES);
      const query=`${agent.alias} ${agent.area} entrevista YouTube Shorts`;
      training.search={status:"ready",query,url:`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,detail:"Búsqueda preparada para revisar una fuente del consejero.",updatedAt:new Date().toISOString()};
      T.transition(training,"fuentes","ready","Búsqueda específica del consejero preparada.");
      academy.trainings[agent.id]=training; saveAcademy();
    }
    training.transitions=Array.isArray(training.transitions) ? training.transitions : [];
    return training;
  }
  function sourceReady(training){ return Boolean(training?.video?.url && training.video.durationConfirmedAt && training.video.durationStatus === "compatible"); }
  function renderCouncilNav(){
    $("#council-nav").innerHTML = A.COUNCIL.map(item => `<a href="?id=${item.id}&audiencia=${audience}&periodo=${selectedPeriod}" class="${item.id === agent.id ? "active" : ""}" aria-current="${item.id === agent.id ? "page" : "false"}"><span>${item.seat}</span>${item.role}</a>`).join("");
  }
  function renderHeader(){
    document.title = `${agent.role} · Detalle del consejero — Admira Academy`;
    document.documentElement.style.setProperty("--tone",agent.tone);
    $("#seat").textContent = `SILLA ${agent.seat}`; $("#role").textContent = agent.role;
    $("#alias").textContent = `Espíritu operativo: ${agent.alias}`; $("#area").textContent = agent.area; $("#purpose").textContent = agent.purpose;
    $("#form-advisor").firstChild.textContent=`Formar a ${agent.role} `;
    $("#form-advisor").setAttribute("aria-label",`Formar a ${agent.role}, inspirado en ${agent.alias}`);
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
  function hidePreview(){
    $("#verified-preview").hidden=true;
    const video=$("#verified-video"); video.pause(); video.removeAttribute("src"); video.removeAttribute("poster"); video.load();
  }
  function showVerifiedPreview(item){
    const video=$("#verified-video"); video.src=item.url; if(item.thumbnail) video.poster=item.thumbnail;
    $("#verified-title").textContent=item.title || trainingFor()?.video?.title || "Vídeo verificado";
    $("#verified-detail").textContent=`${agent.alias} · activo público Pixeria · #formacion #${T.role(agent.id).tag}`;
    $("#verified-source").href=item.id ? `https://www.pixeria.com/stock?highlight=${encodeURIComponent(item.id)}` : item.url;
    $("#verified-preview").hidden=false;
  }
  function renderFormation(){
    const training=ensureTraining();
    $("#advisor-training-title").textContent=`Formar a ${agent.role}`;
    $("#formation-query").textContent=training.search.query;
    $("#advisor-youtube-search").href=training.search.url;
    $("#reviewed-alias").textContent=agent.alias;
    $("#advisor-video-url").value=training.video?.url || "";
    $("#advisor-video-duration").value=training.video?.declaredDurationSeconds ? Math.round(training.video.declaredDurationSeconds / 6) / 10 : "";
    $("#advisor-video-reviewed").checked=Boolean(training.video?.durationConfirmedAt);
    $("#advisor-pixeria-consent").checked=false;
    $("#import-advisor-video").disabled=!(sourceReady(training) && $("#advisor-pixeria-consent").checked);
    $("#verify-advisor-video").disabled=!sourceReady(training);
    if(sourceReady(training)){
      $("#video-metadata").hidden=false;
      $("#video-metadata").textContent=`${training.video.title} · ${training.video.author} · ${Math.round(training.video.durationSeconds)} s. Metadatos validados; sin previo hasta verificar Pixeria.`;
      setNotice("#video-validation-notice",`Fuente válida y duración compatible con el máximo de ${training.maxDurationMinutes} min.`,"ok");
      setNotice("#pixeria-verification-notice",training.pixeria?.detail || "Listo para importar o comprobar el índice.",training.pixeria?.status === "verified" ? "ok" : "");
    }else{
      $("#video-metadata").hidden=true; hidePreview();
      setNotice("#video-validation-notice","Pendiente de una URL real y revisión explícita.");
      setNotice("#pixeria-verification-notice","Primero valida la fuente.");
    }
  }
  async function openFormation(){
    if(audience !== "silicio"){ audience="silicio"; syncUrl(); render(); }
    $("#advisor-training").hidden=false; renderFormation();
    $("#advisor-training").scrollIntoView({behavior:"smooth",block:"start"});
    if(sourceReady(trainingFor())) await verifyPixeriaIndex(false);
  }
  async function validateAdvisorVideo(){
    const canonical=T.canonicalYouTubeUrl($("#advisor-video-url").value);
    const minutes=Number($("#advisor-video-duration").value);
    const reviewed=$("#advisor-video-reviewed").checked;
    const duration=T.validateVideoDuration(minutes * 60,T.DEFAULT_MAX_DURATION_MINUTES,reviewed);
    hidePreview(); $("#video-metadata").hidden=true;
    if(!canonical){ setNotice("#video-validation-notice","La URL no identifica un vídeo de YouTube válido.","error"); return; }
    if(!duration.compatible){ setNotice("#video-validation-notice",duration.reason,"error"); return; }
    $("#validate-advisor-video").disabled=true;
    setNotice("#video-validation-notice","Consultando los metadatos públicos de YouTube…");
    try{
      const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
      const response=await fetch(endpoint,{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error(`YouTube respondió ${response.status}`);
      const data=await response.json(); const training=ensureTraining(); const now=new Date().toISOString();
      training.video={url:canonical,id:T.extractYouTubeId(canonical),title:data.title || "Vídeo de YouTube",author:data.author_name || "Autor publicado en YouTube",thumbnail:data.thumbnail_url || "",verifiedAt:now,metadataSource:endpoint,durationSeconds:duration.seconds,declaredDurationSeconds:duration.seconds,durationStatus:duration.status,durationDetail:duration.reason,durationSource:"Revisión explícita en YouTube",durationConfirmedAt:now};
      training.pixeria={status:"pending",detail:"Fuente validada; pendiente de importar y verificar en el índice público."};
      training.script={status:"pending",content:""}; training.delivery={status:"pending",detail:"Pendiente de completar guion/formación"};
      T.transition(training,"fuentes","validated",`YouTube oEmbed confirmó “${training.video.title}”; duración revisada: ${Math.round(duration.seconds)} s.`);
      saveAcademy(); renderFormation(); renderHeader(); renderPeriods(); renderTimeline();
      await verifyPixeriaIndex(false);
    }catch(error){ setNotice("#video-validation-notice",`No se pudo validar la fuente: ${error.message}.`,"error"); }
    finally{$("#validate-advisor-video").disabled=false;}
  }
  async function importAdvisorVideo(){
    const training=trainingFor();
    if(!sourceReady(training)){ setNotice("#pixeria-verification-notice","La fuente aún no está validada.","error"); return; }
    if(!$("#advisor-pixeria-consent").checked){ setNotice("#pixeria-verification-notice","Confirma la autorización de importación.","error"); return; }
    $("#import-advisor-video").disabled=true;
    setNotice("#pixeria-verification-notice","Comprobando que la fuente no exista ya en Pixeria…");
    try{
      const existing=await fetchPixeriaItem(training);
      if(existing){
        training.pixeria={...(training.pixeria || {}),status:"processing",detail:"La fuente ya existe; verificando el activo sin crear un duplicado."}; saveAcademy();
        setNotice("#pixeria-verification-notice",training.pixeria.detail);
        await verifyPixeriaIndex(true,true); return;
      }
      setNotice("#pixeria-verification-notice","Fuente nueva: solicitando la importación etiquetada a Pixeria…");
      const response=await fetch(PIXERIA_IMPORT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({url:training.video.url,format:"video",comment:T.buildPixeriaComment(agent.id,training.topic),tags:["formacion",T.role(agent.id).tag]})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || data.message || `Pixeria respondió ${response.status}`);
      training.pixeria={status:"processing",jobId:data.jobId || data.id || data.job_id || "",detail:"Importación aceptada; esperando el índice público.",requestedAt:new Date().toISOString()};
      T.transition(training,"pixeria","processing",training.pixeria.detail); saveAcademy();
      setNotice("#pixeria-verification-notice",training.pixeria.detail);
      await verifyPixeriaIndex(true,true);
    }catch(error){
      const networkDetail=error instanceof TypeError && /fetch/i.test(String(error.message))
        ? "No se pudo alcanzar el intermediario de importación. No se ha asumido ninguna importación; puedes volver a comprobar sin duplicar la fuente."
        : `Importación no confirmada: ${error.message}`;
      training.pixeria={...(training.pixeria || {}),status:"error",detail:networkDetail};
      T.transition(training,"pixeria","error",training.pixeria.detail); saveAcademy();
      setNotice("#pixeria-verification-notice",training.pixeria.detail,"error"); hidePreview();
    }finally{$("#import-advisor-video").disabled=!sourceReady(trainingFor());}
  }
  async function fetchPixeriaItem(training){
    const response=await fetch(`${PIXERIA_INDEX}?t=${Date.now()}`,{cache:"no-store",headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error(`índice ${response.status}`);
    return A.findPixeriaVideo(await response.json(),training.video.url);
  }
  async function repairPixeriaTags(item){
    const response=await fetch(PIXERIA_TAGS,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({id:item.id || item.key || "",tags:["formacion",T.role(agent.id).tag]})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error || `etiquetas ${response.status}`);
    return data;
  }
  async function verifyPixeriaIndex(poll=true,repairTags=false){
    const training=trainingFor(); if(!sourceReady(training)) return false;
    $("#verify-advisor-video").disabled=true; hidePreview();
    const attempts=poll ? 240 : 1;
    let tagsRequested=false;
    for(let attempt=0;attempt<attempts;attempt+=1){
      try{
        if(training.pixeria?.jobId){
          const statusResponse=await fetch(`${PIXERIA_STATUS}?id=${encodeURIComponent(training.pixeria.jobId)}`,{headers:{Accept:"application/json"}}).catch(()=>null);
          if(statusResponse?.ok){
            const status=await statusResponse.json().catch(()=>({}));
            if(status.state === "error" || status.status === "error"){
              training.pixeria={...(training.pixeria || {}),status:"error",detail:`El importador no pudo procesar el vídeo: ${status.error || "error sin detalle"}.`};
              T.transition(training,"pixeria","error",training.pixeria.detail); saveAcademy();
              setNotice("#pixeria-verification-notice",training.pixeria.detail,"error");
              $("#verify-advisor-video").disabled=false; return false;
            }
          }
        }
        const item=await fetchPixeriaItem(training);
        if(item){
          const publicVideo=item.type === "video" && (!item.mime || String(item.mime).startsWith("video/")) && /^https:\/\//.test(String(item.url || ""));
          const tagged=T.hasRequiredPixeriaTags(agent.id,item);
          if(publicVideo && tagged){
            const alreadyVerified=training.pixeria?.status === "verified" && training.pixeria?.item?.url === item.url;
            training.pixeria={status:"verified",detail:"Activo de vídeo confirmado en el índice público con las etiquetas requeridas.",verifiedAt:new Date().toISOString(),item:{id:item.id || item.key || "",url:item.url,title:item.title || item.name || training.video.title,thumbnail:item.thumbnail || "",tags:item.tags || []}};
            if(!alreadyVerified) T.transition(training,"pixeria","verified",training.pixeria.detail);
            saveAcademy();
            setNotice("#pixeria-verification-notice",training.pixeria.detail,"ok"); showVerifiedPreview(training.pixeria.item);
            renderHeader(); renderPeriods(); renderTimeline(); $("#verify-advisor-video").disabled=false; return true;
          }
          if(publicVideo && repairTags && !tagged){
            if(!tagsRequested){
              tagsRequested=true;
              try{ await repairPixeriaTags(item); }
              catch(error){
                training.pixeria={...(training.pixeria || {}),status:"error",detail:`El activo existe, pero no se pudieron fijar sus etiquetas: ${error.message}.`};
                T.transition(training,"pixeria","error",training.pixeria.detail); saveAcademy();
                setNotice("#pixeria-verification-notice",training.pixeria.detail,"error");
                $("#verify-advisor-video").disabled=false; return false;
              }
              setNotice("#pixeria-verification-notice","Activo público localizado; fijando las etiquetas canónicas…");
            }else setNotice("#pixeria-verification-notice","Esperando que el índice público confirme las etiquetas canónicas…");
            if(attempt < attempts - 1) await new Promise(resolve=>setTimeout(resolve,2000));
            continue;
          }
          training.pixeria={...(training.pixeria || {}),status:"imported_needs_tags",detail:publicVideo ? "El activo existe, pero aún no conserva #formacion y la etiqueta canónica del consejero." : "La entrada existe, pero no expone un vídeo público reproducible."};
          saveAcademy(); setNotice("#pixeria-verification-notice",training.pixeria.detail,"error");
        }else setNotice("#pixeria-verification-notice",attempts > 1 ? `Procesando en Pixeria · ${Math.min(8,Math.floor(attempt * 2 / 60))} min de 8…` : "La fuente todavía no figura en el índice público de Pixeria.");
      }catch(error){ setNotice("#pixeria-verification-notice",`No se pudo comprobar el índice público: ${error.message}.`,"error"); }
      if(attempt < attempts - 1) await new Promise(resolve=>setTimeout(resolve,2000));
    }
    training.pixeria={...(training.pixeria || {}),status:training.pixeria?.status === "imported_needs_tags" ? "imported_needs_tags" : "pending_index",detail:training.pixeria?.status === "imported_needs_tags" ? training.pixeria.detail : "Importación solicitada; el activo aún no aparece en el índice público."};
    saveAcademy(); hidePreview(); $("#verify-advisor-video").disabled=false; return false;
  }
  function render(){ syncUrl(); renderCouncilNav(); renderHeader(); renderPeriods(); renderTimeline(); }
  $$('[data-audience]').forEach(button => button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); $("#advisor-training").hidden=true; hidePreview(); syncUrl(); render(); }));
  $("#form-advisor").addEventListener("click",openFormation);
  $("#close-training").addEventListener("click",()=>{ $("#advisor-training").hidden=true; hidePreview(); });
  $("#validate-advisor-video").addEventListener("click",validateAdvisorVideo);
  $("#import-advisor-video").addEventListener("click",importAdvisorVideo);
  $("#verify-advisor-video").addEventListener("click",()=>verifyPixeriaIndex(false));
  $("#advisor-pixeria-consent").addEventListener("change",()=>{ $("#import-advisor-video").disabled=!(sourceReady(trainingFor()) && $("#advisor-pixeria-consent").checked); });
  render();
})();
