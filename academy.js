(() => {
  "use strict";

  const T = window.AcademyTrainingCore;
  if(!T) throw new Error("AcademyTrainingCore no está disponible");

  const COUNCIL = [
    { id:"ceo", seat:"01", role:"CEO", alias:"Steve Jobs", side:"racional", tone:"#ffd76a", purpose:"Custodiar la visión de producto y decidir qué debe quedarse fuera para que lo publicado mantenga el criterio de AdmiraNeXT.", knowledge:["Visión y foco de producto","Priorización del alcance","Criterio de publicación"], principle:"No sumar funciones por inercia: elegir lo esencial y sostenerlo con orgullo." },
    { id:"cto", seat:"02", role:"CTO", alias:"Steve Wozniak", side:"racional", tone:"#65d7ff", purpose:"Convertir la visión en una base tecnológica sólida, real y sostenible en el tiempo.", knowledge:["Arquitectura del sistema","Calidad técnica","Sostenibilidad operativa"], principle:"La tecnología es el cimiento: debe funcionar de verdad antes de prometer." },
    { id:"coo", seat:"03", role:"COO", alias:"Tim Cook", side:"racional", tone:"#93e46d", purpose:"Hacer que la operación gire: cadena, flota de agentes, entregas y compromisos de servicio.", knowledge:["Operaciones y entregas","Coordinación de la flota","Seguimiento de compromisos"], principle:"Lo prometido debe convertirse en una entrega observable." },
    { id:"cfo", seat:"04", role:"CFO", alias:"Warren Buffett", side:"racional", tone:"#c6b6ff", purpose:"Evaluar el negocio y el coste a largo plazo: qué renta, qué cuesta y qué puede sostenerse.", knowledge:["Coste y retorno","Riesgo a largo plazo","Sostenibilidad económica"], principle:"El valor se demuestra cuando resiste el tiempo y el coste real." },
    { id:"cco", seat:"05", role:"CCO", alias:"Walt Disney", side:"creativo", tone:"#ff679b", purpose:"Proteger la creatividad y la marca para construir experiencias que se recuerdan.", knowledge:["Dirección creativa","Identidad de marca","Experiencias memorables"], principle:"La magia importa cuando tiene coherencia y deja una experiencia real." },
    { id:"cdo", seat:"06", role:"CDO", alias:"Dieter Rams", side:"creativo", tone:"#a88cff", purpose:"Reducir el diseño hasta dejar sólo lo esencial, útil y bello.", knowledge:["Diseño de producto","Jerarquía y claridad","Sistemas visuales"], principle:"Menos, pero mejor: quitar hasta que cada elemento tenga una razón." },
    { id:"cxo", seat:"07", role:"CXO", alias:"Howard Schultz", side:"creativo", tone:"#ff9d67", purpose:"Cuidar cómo se siente estar dentro del producto y del espacio vivido.", knowledge:["Experiencia de cliente","Diseño del espacio","Continuidad sensorial"], principle:"La experiencia no es una pantalla: es todo lo que la persona siente alrededor." },
    { id:"cso", seat:"08", role:"CSO", alias:"George Lucas", side:"creativo", tone:"#f2e59b", purpose:"Construir el relato que explica una idea y la vuelve contagiosa dentro y fuera de la casa.", knowledge:["Narrativa estratégica","Coherencia del relato","Comunicación de la visión"], principle:"Una idea escala cuando su historia permite entenderla, recordarla y transmitirla." }
  ];

  const LESSONS = [
    { id:"identity", title:"Identidad y normativa", summary:"Saber quién actúa, con qué fuente y bajo qué reglas.", description:"Lee la normativa pública y deja una evidencia que identifique al agente, la máquina y la regla que protege atribuciones y cierres.", sources:[{label:"Normativa AdmiraNeXT ↗",href:"https://www.admiranext.com/normativa"},{label:"Highscore Yokup ↗",href:"https://www.yokup.com/highscore"}], placeholder:"Ej.: Identidad visible verificada, máquina, reglas consultadas y cualquier discrepancia encontrada…", confirmation:"Confirmo que la identidad y las fuentes citadas son visibles y verificables." },
    { id:"ecosystem", title:"Mapa del ecosistema", summary:"Entender cómo encaja la silla en la suite AdmiraNeXT.", description:"Describe una relación concreta entre la responsabilidad de esta silla y al menos dos piezas reales del ecosistema.", sources:[{label:"Matriz AdmiraNeXT ↗",href:"https://www.admiranext.com/"},{label:"Consejo Live ↗",href:"https://www.admira.live/council-scumm.html"}], placeholder:"Ej.: Qué decisión toma esta silla, qué producto afecta y qué resultado observable espera…", confirmation:"Confirmo que no he inventado capacidades, productos ni responsabilidades." },
    { id:"mission", title:"Misión con evidencia", summary:"Convertir criterio en una entrega comprobable.", description:"Registra una misión real o un ensayo seguro: objetivo, cambio realizado, prueba ejecutada y resultado. No incluyas credenciales ni datos sensibles.", sources:[{label:"Objetivos Yokup ↗",href:"https://www.yokup.com/objetivos"},{label:"Misiones Yokup ↗",href:"https://www.yokup.com/misiones"}], placeholder:"Objetivo / acción / prueba / resultado / riesgo pendiente…", confirmation:"Confirmo que la evidencia describe trabajo observable y no sólo una intención." },
    { id:"closure", title:"Cierre y puntuación", summary:"Cerrar sin atribuciones no verificadas.", description:"Redacta un cierre que incluya resultado, estado, puntos ganados, total relevante y fuente/momento de la verificación. Si hay discrepancia, declara cero puntos pendientes.", sources:[{label:"Regla 17 ↗",href:"https://www.admiranext.com/normativa#normativa"},{label:"Highscore diario ↗",href:"https://www.yokup.com/highscore"}], placeholder:"Resultado / estado / +N puntos / total del agente / fuente y hora / discrepancias…", confirmation:"Confirmo que la puntuación procede de una fuente actual y de una identidad verificada." }
  ];

  const STORAGE_KEY = "admira-academy-v1-progress";
  const PIXERIA_IMPORT = "https://macmini.tail48b61c.ts.net/admira/tube/import-to-stock";
  const PIXERIA_STATUS = "https://macmini.tail48b61c.ts.net/admira/tube/status";
  const PIXERIA_INDEX = "https://pub-bf043a4daa3b43b7a0b769617729d074.r2.dev/stock/index.json";
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

  let state = loadState();
  let filter = "all";

  function loadState(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(parsed && parsed.records){
        return { version:2, selected:parsed.selected || "ceo", records:parsed.records, trainings:parsed.trainings || {} };
      }
    }catch(_error){}
    return { version:2, selected:"ceo", records:{}, trainings:{} };
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(_error){ showToast("El navegador no permitió guardar la trazabilidad local."); }
  }
  function recordFor(agentId){
    if(!state.records[agentId]) state.records[agentId] = { lessons:{} };
    return state.records[agentId];
  }
  function trainingFor(agentId=state.selected){ return state.trainings[agentId] || null; }
  function completedCount(agentId){ return LESSONS.filter(lesson => recordFor(agentId).lessons[lesson.id]?.complete === true).length; }
  function statusFor(agentId){
    const count = completedCount(agentId);
    if(count === 0) return { label:"Sin evaluar", detail:"0 de 4 lecciones con evidencia" };
    if(count < LESSONS.length) return { label:"En formación", detail:`${count} de 4 lecciones con evidencia` };
    return { label:"Recorrido completo", detail:"Pendiente de revisión externa" };
  }
  function currentAgent(){ return COUNCIL.find(agent => agent.id === state.selected) || COUNCIL[0]; }
  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }

  function renderCatalog(){
    const grid = $("#agent-grid");
    const visible = COUNCIL.filter(agent => filter === "all" || agent.side === filter);
    grid.innerHTML = visible.map(agent => {
      const selected = agent.id === state.selected;
      const done = completedCount(agent.id);
      const training = trainingFor(agent.id);
      return `<article class="agent-card${selected ? " selected" : ""}" style="--tone:${agent.tone}" data-card-agent="${agent.id}">
        <button class="agent-select" type="button" data-agent="${agent.id}" aria-pressed="${selected}">
          <span class="agent-card-top"><span class="agent-seat">SILLA ${agent.seat}</span><span class="agent-side" aria-hidden="true"></span></span>
          <h3>${agent.role}</h3><p>${escapeHtml(T.role(agent.id).area)}</p>
          <span class="agent-card-footer"><span>${agent.side}</span><b>${done ? `${done}/4 · en formación` : "sin evaluar"}</b></span>
        </button>
        <button class="agent-training" type="button" data-training-agent="${agent.id}">Formación${training ? " · en curso" : ""} <span aria-hidden="true">↘</span></button>
      </article>`;
    }).join("");
    $$('[data-agent]', grid).forEach(button => button.addEventListener("click", () => selectAgent(button.dataset.agent, false)));
    $$('[data-training-agent]', grid).forEach(button => button.addEventListener("click", () => selectAgent(button.dataset.trainingAgent, true)));
  }

  function renderProfile(){
    const agent = currentAgent();
    const status = statusFor(agent.id);
    $("#profile-index").textContent = agent.seat;
    $("#profile-name").textContent = agent.role;
    $("#profile-alias").textContent = `Espíritu operativo: ${agent.alias}`;
    $("#profile-purpose").textContent = agent.purpose;
    $("#profile-knowledge").innerHTML = agent.knowledge.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    $("#profile-principle").textContent = `“${agent.principle}”`;
    $("#readiness").innerHTML = `<span>Nivel de preparación</span><strong>${status.label}</strong><small>${status.detail}</small>`;
  }

  function renderJourney(){
    const agent = currentAgent();
    const record = recordFor(agent.id);
    const list = $("#lesson-list");
    list.innerHTML = LESSONS.map((lesson, index) => {
      const saved = record.lessons[lesson.id] || {};
      const complete = saved.complete === true;
      return `<details class="lesson${complete ? " completed" : ""}" data-lesson="${lesson.id}"${index === 0 && !complete ? " open" : ""}>
        <summary><span class="lesson-number">${complete ? "✓" : String(index + 1).padStart(2,"0")}</span><span class="lesson-title"><strong>${lesson.title}</strong><small>${lesson.summary}</small></span><span class="lesson-state">${complete ? "Evidencia guardada" : "Pendiente"}</span></summary>
        <div class="lesson-content"><p>${lesson.description}</p><div class="lesson-sources">${lesson.sources.map(source => `<a href="${source.href}" target="_blank" rel="noopener">${source.label}</a>`).join("")}</div>
          <div class="evidence-box"><label><span>Evidencia de ${agent.role}</span><textarea maxlength="1200" placeholder="${lesson.placeholder}" aria-label="Evidencia para ${lesson.title}">${escapeHtml(saved.evidence || "")}</textarea></label><div class="evidence-actions"><label class="evidence-check"><input type="checkbox"${saved.confirmed ? " checked" : ""}> <span>${lesson.confirmation}</span></label><button class="save-evidence" type="button">Guardar evidencia</button></div></div>
        </div>
      </details>`;
    }).join("");
    $$(".lesson", list).forEach(node => $(".save-evidence", node).addEventListener("click", () => saveEvidence(node.dataset.lesson, node)));
    renderProgress();
  }

  function saveEvidence(lessonId, node){
    const text = $("textarea", node).value.trim();
    const confirmed = $("input[type=checkbox]", node).checked;
    if(text.length < 24){ showToast("Describe una evidencia concreta de al menos 24 caracteres."); $("textarea", node).focus(); return; }
    if(!confirmed){ showToast("Confirma la validación antes de guardar el progreso."); $("input[type=checkbox]", node).focus(); return; }
    recordFor(state.selected).lessons[lessonId] = { evidence:text, confirmed:true, complete:true, updatedAt:new Date().toISOString() };
    saveState(); renderCatalog(); renderProfile(); renderJourney();
    showToast(`Evidencia guardada para ${currentAgent().role}. Pendiente de revisión externa.`);
  }

  function renderProgress(){
    const count = completedCount(state.selected);
    const percent = Math.round((count / LESSONS.length) * 100);
    $("#progress-ring").style.setProperty("--progress", String(percent));
    $("#progress-ring").setAttribute("aria-label", `Progreso: ${percent} por ciento`);
    $("#progress-percent").textContent = `${percent}%`;
    $("#progress-bar").style.width = `${percent}%`;
    $("#progress-count").textContent = `${count} / ${LESSONS.length}`;
  }

  function setNotice(id, message, kind="pending"){
    const node = $(id); node.textContent = message; node.className = `inline-notice ${kind}`;
  }
  function setLink(link, href){
    link.href = href || "#";
    link.classList.toggle("disabled", !href);
    link.setAttribute("aria-disabled", String(!href));
  }
  function recordTransition(training, stage, status, detail){
    T.transition(training, stage, status, detail); saveState(); renderTrainingTrace(training);
  }
  function beginTraining(topic, validation){
    let training = trainingFor();
    if(!training || training.topic !== topic){
      training = T.createTraining(state.selected, topic);
      state.trainings[state.selected] = training;
      recordTransition(training, "tema", validation.relevant ? "validado" : "bajo revisión", validation.relevant ? "Tema relacionado con el área del puesto." : "Tema continuado mediante confirmación explícita de revisión.");
    }
    saveState(); renderCatalog(); renderTraining();
    return training;
  }

  function validateTopic(){
    const topic = $("#training-topic").value.trim();
    const result = T.validateTopic(state.selected, topic);
    const overrideWrap = $("#topic-override-wrap");
    overrideWrap.hidden = result.relevant;
    if(!result.relevant && !$("#topic-override").checked){
      setNotice("#topic-notice", result.reason, "warning");
      overrideWrap.hidden = false; $("#topic-override").focus(); return null;
    }
    setNotice("#topic-notice", result.relevant ? `Tema adecuado para ${T.role(state.selected).area}.` : "Tema aceptado bajo revisión explícita; no se considera validado por el puesto.", result.relevant ? "success" : "warning");
    return beginTraining(topic, result);
  }

  function proposeTopic(){
    $("#training-topic").value = T.proposeTopic(state.selected);
    $("#topic-override").checked = false;
    validateTopic();
  }

  async function reviewVideo(){
    const requestedUrl = $("#video-url").value;
    const training = validateTopic();
    if(!training) return;
    const canonical = T.canonicalYouTubeUrl(requestedUrl);
    if(!canonical){ setNotice("#video-notice", "Introduce una URL válida de YouTube (watch, youtu.be, shorts o live).", "warning"); return; }
    setNotice("#video-notice", "Consultando metadatos públicos de YouTube…", "pending");
    try{
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
      const response = await fetch(endpoint, { headers:{ Accept:"application/json" } });
      if(!response.ok) throw new Error(`YouTube respondió ${response.status}`);
      const data = await response.json();
      training.video = { url:canonical, id:T.extractYouTubeId(canonical), title:data.title, author:data.author_name, thumbnail:data.thumbnail_url, verifiedAt:new Date().toISOString(), metadataSource:endpoint };
      training.pixeria = { status:"pending", detail:"Pendiente de importar en Pixeria" };
      training.script = { status:"pending", content:"" };
      training.delivery = { status:"pending", detail:"Pendiente de entregar al agente" };
      recordTransition(training, "vídeo", "verificado", `Metadatos públicos: ${data.title} — ${data.author_name}.`);
      saveState(); renderTraining();
    }catch(error){
      setNotice("#video-notice", `Fuente no disponible o no verificable: ${error.message}. El flujo no continuará con un resultado inventado.`, "warning");
    }
  }

  async function importPixeria(){
    const training = trainingFor();
    if(!training?.video){ setNotice("#pixeria-notice", "Primero verifica un vídeo real.", "warning"); return; }
    if(!$("#pixeria-consent").checked){ setNotice("#pixeria-notice", "Falta autorización explícita. Sigue pendiente de importar en Pixeria.", "warning"); return; }
    setNotice("#pixeria-notice", "Importación solicitada; esperando confirmación pública…", "pending");
    try{
      const response = await fetch(PIXERIA_IMPORT, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ url:training.video.url, format:"video", comment:T.buildPixeriaComment(state.selected, training.topic) }) });
      if(!response.ok) throw new Error(`Pixeria respondió ${response.status}`);
      const job = await response.json();
      training.pixeria = { status:"processing", detail:"Pixeria está procesando la importación", jobId:job.jobId || job.id || null, requestedAt:new Date().toISOString() };
      recordTransition(training, "Pixeria", "procesando", `Solicitud aceptada${training.pixeria.jobId ? ` (trabajo ${training.pixeria.jobId})` : ""}.`);
      renderTraining();
      await verifyPixeria(training);
    }catch(error){
      training.pixeria = { status:"pending", detail:`Pendiente de importar en Pixeria: ${error.message}` };
      recordTransition(training, "Pixeria", "pendiente", training.pixeria.detail);
      renderTraining();
    }
  }

  async function verifyPixeria(training){
    for(let attempt=0; attempt<6; attempt += 1){
      if(attempt) await new Promise(resolve => setTimeout(resolve, 1800));
      try{
        if(training.pixeria.jobId) await fetch(`${PIXERIA_STATUS}?id=${encodeURIComponent(training.pixeria.jobId)}`, { headers:{ Accept:"application/json" } });
        const response = await fetch(`${PIXERIA_INDEX}?t=${Date.now()}`, { cache:"no-store" });
        if(!response.ok) continue;
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || data.stock || []);
        const item = items.find(candidate => String(candidate.prompt || candidate.sourceUrl || "") === training.video.url);
        if(item){
          const tagged = T.hasRequiredPixeriaTags(state.selected, item);
          training.pixeria = { status:tagged ? "verified" : "imported_needs_tags", detail:tagged ? "Importado y etiquetado en Pixeria" : "Importado en Pixeria; pendiente de etiquetar/asignar al consejero", itemId:item.id || null, itemUrl:item.url || null, verifiedAt:new Date().toISOString() };
          recordTransition(training, "Pixeria", training.pixeria.status, training.pixeria.detail);
          renderTraining(); return;
        }
      }catch(_error){}
    }
    training.pixeria = { ...training.pixeria, status:"pending", detail:"Solicitud aceptada, pero aún no verificable en el índice público. Reintenta más tarde." };
    recordTransition(training, "Pixeria", "pendiente", training.pixeria.detail); renderTraining();
  }

  function createScript(){
    const training = trainingFor();
    if(!training?.video){ setNotice("#script-notice", "Primero revisa una fuente real.", "warning"); return; }
    training.script = { status:"ready", content:T.buildScript(state.selected, training.topic, training.video), createdAt:new Date().toISOString(), basis:"tema + metadatos públicos de YouTube; sin transcripción" };
    recordTransition(training, "guion", "listo", "Guion original creado desde el tema y metadatos públicos; pendiente de revisión humana.");
    renderTraining();
  }

  function persistScript(){
    const training = trainingFor();
    if(!training?.script) return;
    const content = $("#training-script").value;
    if(content === training.script.content) return;
    training.script.content = content; training.script.status = content.trim() ? "edited" : "pending"; training.script.updatedAt = new Date().toISOString(); saveState();
  }

  function queueDelivery(){
    persistScript();
    const training = trainingFor();
    if(!training?.video || !training.script?.content?.trim()){ setNotice("#delivery-notice", "Verifica el vídeo y prepara el guion antes de crear el paquete.", "warning"); return; }
    const handoffUrl = T.buildCouncilHandoffUrl(state.selected, training.video.url);
    training.delivery = { status:"pending", detail:"Paquete completo en cola local; Council Live sólo puede recibir la fuente", queuedAt:new Date().toISOString(), handoffUrl };
    recordTransition(training, "entrega", "en cola", training.delivery.detail);
    renderTraining();
  }

  function markPartialHandoff(event){
    const training = trainingFor();
    if(!training?.delivery?.handoffUrl){ event.preventDefault(); return; }
    training.delivery.status = "handoff_opened";
    training.delivery.detail = "Se abrió Council Live para entregar sólo la fuente; el paquete completo sigue pendiente";
    training.delivery.handoffOpenedAt = new Date().toISOString();
    recordTransition(training, "entrega", "traspaso parcial abierto", training.delivery.detail);
    renderTraining();
  }

  function exportPackage(){
    persistScript();
    const training = trainingFor();
    if(!training){ showToast("Inicia una formación antes de exportar."); return; }
    const packageData = { schema:"admira-academy-training-v1", council:T.role(state.selected), training, claims:{ learned:false, accredited:false, pointsAwarded:false } };
    const blob = new Blob([JSON.stringify(packageData, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${training.id}.json`; link.click(); URL.revokeObjectURL(url);
    showToast("Paquete verificable exportado. No implica aprendizaje ni puntos.");
  }

  function renderTraining(){
    const agent = currentAgent(); const role = T.role(agent.id); const training = trainingFor();
    $("#training-role").textContent = agent.role;
    $("#training-area").textContent = `Área: ${role.area}.`;
    $("#training-state").textContent = training ? (training.delivery?.status === "handoff_opened" ? "Entrega parcial · paquete pendiente" : "Formación en curso") : "Sin iniciar";
    $("#training-topic").value = training?.topic || "";
    $("#topic-override").checked = false; $("#topic-override-wrap").hidden = true;
    setLink($("#youtube-search"), training ? T.youtubeSearchUrl(agent.id, training.topic) : "");
    $("#video-url").value = training?.video?.url || "";
    const card = $("#video-card");
    if(training?.video){
      card.hidden = false;
      card.innerHTML = `${training.video.thumbnail ? `<img src="${escapeHtml(training.video.thumbnail)}" alt="">` : ""}<div><span>FUENTE VERIFICADA · YOUTUBE</span><strong>${escapeHtml(training.video.title)}</strong><p>${escapeHtml(training.video.author)}</p><a href="${escapeHtml(training.video.url)}" target="_blank" rel="noopener">Revisar vídeo en origen ↗</a></div>`;
      setNotice("#video-notice", `Fuente verificada el ${formatDate(training.video.verifiedAt)}. Revísala antes de continuar.`, "success");
    }else{ card.hidden = true; setNotice("#video-notice", "Pendiente de elegir y verificar una fuente.", "pending"); }
    setNotice("#pixeria-notice", training?.pixeria?.detail || "Pendiente de importar en Pixeria.", training?.pixeria?.status === "verified" ? "success" : training?.pixeria?.status === "imported_needs_tags" ? "warning" : "pending");
    $("#training-script").value = training?.script?.content || "";
    setNotice("#script-notice", training?.script?.status === "ready" || training?.script?.status === "edited" ? `Guion ${training.script.status === "edited" ? "editado" : "listo"}; fuente y alcance declarados.` : "Guion pendiente.", training?.script?.status === "ready" || training?.script?.status === "edited" ? "success" : "pending");
    setNotice("#delivery-notice", training?.delivery?.detail || "Pendiente de entregar al agente.", training?.delivery?.status === "handoff_opened" ? "warning" : "pending");
    setLink($("#council-handoff"), training?.delivery?.handoffUrl || "");
    $$('[data-stage]').forEach((panel, index) => panel.classList.toggle("locked", index > 0 && !training));
    $$('[data-stage-indicator]').forEach((item, index) => item.classList.toggle("active", index === 0 || Boolean(training)));
    renderTrainingTrace(training);
  }

  function renderTrainingTrace(training){
    const node = $("#training-trace");
    if(!training){ node.innerHTML = "<p>Aún no hay transiciones registradas.</p>"; return; }
    node.innerHTML = `<dl><div><dt>Estudiante</dt><dd>${escapeHtml(T.role(training.agentId).role)} · ${escapeHtml(T.role(training.agentId).area)}</dd></div><div><dt>Tema</dt><dd>${escapeHtml(training.topic)}</dd></div><div><dt>Creada</dt><dd>${formatDate(training.createdAt)}</dd></div></dl><ol>${training.transitions.slice().reverse().map(item => `<li><time datetime="${escapeHtml(item.at)}">${formatDate(item.at)}</time><span><b>${escapeHtml(item.stage)} · ${escapeHtml(item.status)}</b>${escapeHtml(item.detail)}</span></li>`).join("")}</ol>`;
  }
  function formatDate(value){
    try{ return new Intl.DateTimeFormat("es-ES", {dateStyle:"short",timeStyle:"short"}).format(new Date(value)); }
    catch(_error){ return value || "sin fecha"; }
  }

  function selectAgent(agentId, openTraining){
    if(!COUNCIL.some(agent => agent.id === agentId)) return;
    state.selected = agentId; saveState(); renderCatalog(); renderProfile(); renderTraining(); renderJourney();
    $(openTraining ? "#formacion" : "#agent-profile").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showToast(message){
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  $$("[data-filter]").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.filter; $$("[data-filter]").forEach(item => item.classList.toggle("active", item === button)); renderCatalog();
  }));
  $$("[data-audience]").forEach(button => button.addEventListener("click", () => {
    const isSilicon = button.dataset.audience === "silicio";
    $$("[data-audience]").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
    if(!isSilicon){ $("#carbono").scrollIntoView({behavior:"smooth"}); showToast("Agentes de carbono: fase futura, sin progreso simulado."); }
  }));
  $("#validate-topic").addEventListener("click", validateTopic);
  $("#propose-topic").addEventListener("click", proposeTopic);
  $("#review-video").addEventListener("click", reviewVideo);
  $("#import-pixeria").addEventListener("click", importPixeria);
  $("#create-script").addEventListener("click", createScript);
  $("#training-script").addEventListener("change", persistScript);
  $("#queue-delivery").addEventListener("click", queueDelivery);
  $("#council-handoff").addEventListener("click", markPartialHandoff);
  $("#export-package").addEventListener("click", exportPackage);

  renderCatalog(); renderProfile(); renderTraining(); renderJourney();
})();
