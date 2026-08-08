(() => {
  "use strict";
  const P = window.AcademyPlatformCore;
  if(!P) throw new Error("AcademyPlatformCore no está disponible");

  const STORAGE_KEY = "admira-academy-platform-v1";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let state = loadState();
  let ticker = null;

  function defaultState(){ return {version:1,selectedStudent:"ceo",timeMode:"timer",timer:P.createTimer(),manual:null,closures:[]}; }
  function loadState(){
    try{
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved?.version === 1 && Array.isArray(saved.closures)) return {...defaultState(),...saved,timer:{...P.createTimer(),...(saved.timer || {})}};
    }catch(_error){}
    return defaultState();
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(_error){ toast("No se pudo guardar en este navegador."); }
  }
  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function currentTime(){ return state.timeMode === "manual" ? state.manual : state.timer; }

  function renderStudents(){
    $("#student-grid").innerHTML = P.STUDENTS.map(item => `<button class="student-option" type="button" role="radio" aria-checked="${item.id === state.selectedStudent}" data-student="${item.id}"><span>ESTUDIANTE</span><strong>${item.role}</strong><small>${escapeHtml(item.area)}</small></button>`).join("");
    $$('[data-student]').forEach(button => button.addEventListener("click", () => { state.selectedStudent = button.dataset.student; saveState(); renderStudents(); }));
  }
  function setMode(mode){
    if(mode === "manual" && state.timer.runningSince) P.pauseTimer(state.timer);
    state.timeMode = mode === "manual" ? "manual" : "timer";
    $$('[data-time-mode]').forEach(button => { const active = button.dataset.timeMode === state.timeMode; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
    $("#timer-mode").hidden = state.timeMode !== "timer";
    $("#manual-mode").hidden = state.timeMode !== "manual";
    saveState(); renderTime();
  }
  function start(){ P.startTimer(state.timer); saveState(); startTicker(); renderTime(); }
  function pause(){ P.pauseTimer(state.timer); saveState(); stopTicker(); renderTime(); }
  function finish(){
    P.finishTimer(state.timer); saveState(); stopTicker(); renderTime();
    if(state.timer.status === "medido") toast("Cronómetro finalizado. El tiempo queda medido en este dispositivo.");
  }
  function applyManual(){
    state.manual = P.manualTime($("#manual-minutes").value);
    saveState(); renderTime();
    if(state.manual.status === "declarado") toast("Duración declarada. No se presentará como verificada.");
    else toast("Introduce una duración mayor que cero.");
  }
  function startTicker(){ stopTicker(); ticker = setInterval(renderTime, 500); }
  function stopTicker(){ if(ticker){ clearInterval(ticker); ticker = null; } }
  function renderTime(){
    const time = currentTime();
    $("#timer-display").textContent = P.formatDuration(P.timerElapsed(state.timer));
    $("#timer-status").textContent = state.timer.runningSince ? "Medido · en marcha" : state.timer.endedAt ? "Medido · finalizado" : state.timer.elapsedMs ? "Medido · pausado" : "Incompleto · sin iniciar";
    $("#timer-start").textContent = state.timer.elapsedMs ? "Reanudar" : "Iniciar";
    $("#timer-start").disabled = Boolean(state.timer.runningSince || state.timer.endedAt);
    $("#timer-pause").disabled = !state.timer.runningSince;
    $("#timer-finish").disabled = Boolean(state.timer.endedAt || (!state.timer.runningSince && !state.timer.elapsedMs));
    const events = time?.events || [];
    $("#time-events").innerHTML = events.length ? events.slice().reverse().map(event => `<div class="time-event"><span>${escapeHtml(event.type)}</span><time datetime="${escapeHtml(event.at)}">${formatDate(event.at)}${event.elapsedMs ? ` · ${P.formatDuration(event.elapsedMs)}` : ""}</time></div>`).join("") : "Aún no hay eventos temporales.";
    $("#draft-state").textContent = !time || time.status === "incompleto" ? "Incompleto" : `${time.status} · ${P.formatDuration(P.timerElapsed(time))}`;
  }
  function draft(){ return {studentId:state.selectedStudent,workType:$("#work-type").value,context:$("#work-context").value,title:$("#work-title").value,workStatus:$("#work-status").value,evidence:$("#work-evidence").value,points:$("#work-points").value}; }
  function closeWork(event){
    event.preventDefault();
    const result = P.buildClosure(draft(), currentTime());
    if(!result.ok){
      $("#validation-message").hidden = false;
      $("#validation-message").innerHTML = `<strong>Cierre incompleto</strong><ul>${result.errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
      $("#validation-message").scrollIntoView({behavior:"smooth",block:"center"}); return;
    }
    state.closures.unshift(result.closure);
    state.timer = P.createTimer(); state.manual = null; saveState(); stopTicker();
    $("#closure-form").reset(); $("#work-context").value = "Formación Academy"; $("#validation-message").hidden = true;
    renderTime(); renderHistory(); toast("Cierre guardado localmente. Sincronización Yokup pendiente.");
  }
  function renderHistory(){
    $("#history-count").textContent = `${state.closures.length} ${state.closures.length === 1 ? "cierre" : "cierres"}`;
    const list = $("#history-list");
    if(!state.closures.length){ list.innerHTML = '<p class="empty">Todavía no hay cierres guardados.</p>'; return; }
    list.innerHTML = state.closures.map(closure => `<article class="closure-card">
      <div class="closure-head"><span class="closure-role">${escapeHtml(closure.student.role)}</span><div class="closure-title"><strong>${escapeHtml(closure.work.title)}</strong><span>${escapeHtml(closure.work.type)} · ${escapeHtml(closure.work.context)} · ${escapeHtml(closure.student.area)}</span></div><div class="closure-duration"><strong>${P.formatDuration(closure.time.durationMs)}</strong><span>${escapeHtml(closure.time.status)} · ${escapeHtml(closure.time.origin)}</span></div></div>
      <dl class="closure-grid"><div><dt>Estado</dt><dd>${escapeHtml(closure.work.status)}</dd></div><div><dt>Inicio / fin</dt><dd>${closure.time.startedAt ? formatDate(closure.time.startedAt) : "No declarado"}<br>${formatDate(closure.time.endedAt)}</dd></div><div><dt>Puntos</dt><dd>${closure.points.value === null ? "Sin puntos declarados" : `${closure.points.value} · ${closure.points.status}`}</dd></div><div><dt>Cierre</dt><dd>${formatDate(closure.closedAt)}<br>${escapeHtml(closure.student.alias)}</dd></div></dl>
      <p class="closure-evidence"><b>Evidencia:</b> ${escapeHtml(closure.evidence)}</p><div class="closure-sync"><span>Yokup</span><b>${escapeHtml(closure.sync.status)} · ${escapeHtml(closure.sync.detail)}</b></div>
    </article>`).join("");
  }
  function formatDate(value){ try{return new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"medium"}).format(new Date(value));}catch(_error){return value || "pendiente";} }
  function toast(message){ const node=$("#toast"); node.textContent=message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove("show"),3000); }

  $$('[data-time-mode]').forEach(button => button.addEventListener("click",()=>setMode(button.dataset.timeMode)));
  $("#timer-start").addEventListener("click",start); $("#timer-pause").addEventListener("click",pause); $("#timer-finish").addEventListener("click",finish); $("#manual-apply").addEventListener("click",applyManual); $("#closure-form").addEventListener("submit",closeWork);
  renderStudents(); setMode(state.timeMode); renderHistory(); if(state.timer.runningSince) startTicker();
})();
