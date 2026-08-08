(() => {
  "use strict";

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
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

  let state = loadState();
  let filter = "all";

  function loadState(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(parsed && parsed.version === 1 && parsed.records) return parsed;
    }catch(_error){}
    return { version:1, selected:"ceo", records:{} };
  }

  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(_error){ showToast("El navegador no permitió guardar el progreso."); }
  }

  function recordFor(agentId){
    if(!state.records[agentId]) state.records[agentId] = { lessons:{} };
    return state.records[agentId];
  }

  function completedCount(agentId){
    const record = recordFor(agentId);
    return LESSONS.filter(lesson => record.lessons[lesson.id]?.complete === true).length;
  }

  function statusFor(agentId){
    const count = completedCount(agentId);
    if(count === 0) return { label:"Sin evaluar", detail:"0 de 4 lecciones con evidencia" };
    if(count < LESSONS.length) return { label:"En formación", detail:`${count} de 4 lecciones con evidencia` };
    return { label:"Recorrido completo", detail:"Pendiente de revisión externa" };
  }

  function currentAgent(){ return COUNCIL.find(agent => agent.id === state.selected) || COUNCIL[0]; }

  function renderCatalog(){
    const grid = $("#agent-grid");
    const visible = COUNCIL.filter(agent => filter === "all" || agent.side === filter);
    grid.innerHTML = visible.map(agent => {
      const selected = agent.id === state.selected;
      const done = completedCount(agent.id);
      return `<button class="agent-card${selected ? " selected" : ""}" style="--tone:${agent.tone}" type="button" data-agent="${agent.id}" aria-pressed="${selected}">
        <span class="agent-card-top"><span class="agent-seat">SILLA ${agent.seat}</span><span class="agent-side" aria-hidden="true"></span></span>
        <h3>${agent.role}</h3><p>Espíritu operativo: ${agent.alias}</p>
        <span class="agent-card-footer"><span>${agent.side}</span><b>${done ? `${done}/4 · en formación` : "sin evaluar"}</b></span>
      </button>`;
    }).join("");
    $$("[data-agent]", grid).forEach(button => button.addEventListener("click", () => selectAgent(button.dataset.agent)));
  }

  function renderProfile(){
    const agent = currentAgent();
    const status = statusFor(agent.id);
    $("#profile-index").textContent = agent.seat;
    $("#profile-name").textContent = agent.role;
    $("#profile-alias").textContent = `Espíritu operativo: ${agent.alias}`;
    $("#profile-purpose").textContent = agent.purpose;
    $("#profile-knowledge").innerHTML = agent.knowledge.map(item => `<li>${item}</li>`).join("");
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
        <summary>
          <span class="lesson-number">${complete ? "✓" : String(index + 1).padStart(2,"0")}</span>
          <span class="lesson-title"><strong>${lesson.title}</strong><small>${lesson.summary}</small></span>
          <span class="lesson-state">${complete ? "Evidencia guardada" : "Pendiente"}</span>
        </summary>
        <div class="lesson-content">
          <p>${lesson.description}</p>
          <div class="lesson-sources">${lesson.sources.map(source => `<a href="${source.href}" target="_blank" rel="noopener">${source.label}</a>`).join("")}</div>
          <div class="evidence-box">
            <label><span>Evidencia de ${agent.role}</span><textarea maxlength="1200" placeholder="${lesson.placeholder}" aria-label="Evidencia para ${lesson.title}">${escapeHtml(saved.evidence || "")}</textarea></label>
            <div class="evidence-actions">
              <label class="evidence-check"><input type="checkbox"${saved.confirmed ? " checked" : ""}> <span>${lesson.confirmation}</span></label>
              <button class="save-evidence" type="button">Guardar evidencia</button>
            </div>
          </div>
        </div>
      </details>`;
    }).join("");

    $$(".lesson", list).forEach(node => {
      $(".save-evidence", node).addEventListener("click", () => saveEvidence(node.dataset.lesson, node));
    });
    renderProgress();
  }

  function saveEvidence(lessonId, node){
    const text = $("textarea", node).value.trim();
    const confirmed = $("input[type=checkbox]", node).checked;
    if(text.length < 24){ showToast("Describe una evidencia concreta de al menos 24 caracteres."); $("textarea", node).focus(); return; }
    if(!confirmed){ showToast("Confirma la validación antes de guardar el progreso."); $("input[type=checkbox]", node).focus(); return; }
    const record = recordFor(state.selected);
    record.lessons[lessonId] = { evidence:text, confirmed:true, complete:true, updatedAt:new Date().toISOString() };
    saveState();
    renderCatalog(); renderProfile(); renderJourney();
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

  function selectAgent(agentId){
    if(!COUNCIL.some(agent => agent.id === agentId)) return;
    state.selected = agentId; saveState(); renderCatalog(); renderProfile(); renderJourney();
    $("#agent-profile").scrollIntoView({behavior:"smooth",block:"start"});
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]);
  }

  function showToast(message){
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  $$("[data-filter]").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.filter;
    $$("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
    renderCatalog();
  }));

  $$("[data-audience]").forEach(button => button.addEventListener("click", () => {
    const isSilicon = button.dataset.audience === "silicio";
    $$("[data-audience]").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
    if(!isSilicon){ document.querySelector("#carbono").scrollIntoView({behavior:"smooth"}); showToast("Agentes de carbono: fase futura, sin progreso simulado."); }
  }));

  renderCatalog(); renderProfile(); renderJourney();
})();
