(() => {
  "use strict";
  const A = window.AcademyAdvisorCore;
  if(!A) throw new Error("AcademyAdvisorCore no está disponible");
  const $ = (selector,root=document) => root.querySelector(selector);
  const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  let agent = A.council(params.get("id"));
  let audience = A.audience(params.get("audiencia"));
  let selectedPeriod = A.period(params.get("periodo")).id;
  const states = {
    academy:localStorage.getItem("admira-academy-v1-progress"),
    platform:localStorage.getItem("admira-academy-platform-v1"),
    carbon:localStorage.getItem("admira-academy-carbon-v1")
  };

  function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g,character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]); }
  function formatDate(value){ try{return new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch(_error){return value;} }
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
  function render(){ syncUrl(); renderCouncilNav(); renderHeader(); renderPeriods(); renderTimeline(); }
  $$('[data-audience]').forEach(button => button.addEventListener("click",()=>{ audience=A.audience(button.dataset.audience); syncUrl(); render(); }));
  render();
})();
