(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  root.AcademyTrainingCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const ROLES = {
    ceo:{ role:"CEO", area:"Visión, producto y dirección", alias:"Steve Jobs", tag:"stevejobs", defaultTopic:"Noticias y tendencias de dirección, producto y estrategia", topics:["Foco de producto y renuncias estratégicas","Visión de producto con evidencia de cliente","Criterios para priorizar una nueva línea de negocio"], keywords:["visión","producto","estrateg","prioriz","lider","mercado","cliente","negocio","decisión","foco","direccion","tendencia","noticia"] },
    cto:{ role:"CTO", area:"Tecnología y arquitectura", alias:"Steve Wozniak", tag:"stevewozniak", defaultTopic:"Noticias y tendencias de tecnología y arquitectura", topics:["Arquitectura evolutiva para agentes de IA","Observabilidad y fiabilidad de sistemas distribuidos","Seguridad por diseño en plataformas de agentes"], keywords:["tecnolog","arquitect","software","sistema","seguridad","datos","ia","código","infraestructura","observabilidad","tendencia","noticia"] },
    coo:{ role:"COO", area:"Operaciones y entrega", alias:"Tim Cook", tag:"timcook", defaultTopic:"Noticias y tendencias de operaciones, procesos y entrega", topics:["Diseño de operaciones repetibles y medibles","Gestión de dependencias en una flota de agentes","Indicadores de calidad y entrega operativa"], keywords:["operacion","entrega","proceso","calidad","cadena","logística","eficiencia","equipo","servicio","capacidad","tendencia","noticia"] },
    cfo:{ role:"CFO", area:"Finanzas y sostenibilidad", alias:"Warren Buffett", tag:"warrenbuffett", defaultTopic:"Noticias y tendencias de finanzas, inversión y sostenibilidad", topics:["Flujo de caja y decisiones de inversión","Economía unitaria de un producto digital","Evaluación de riesgo y retorno a largo plazo"], keywords:["finanz","coste","costo","caja","invers","retorno","riesgo","margen","presupuesto","capital","rentabilidad","tendencia","noticia"] },
    cco:{ role:"CCO", area:"Creatividad y marca", alias:"Walt Disney", tag:"waltdisney", defaultTopic:"Noticias y tendencias de creatividad, contenido y marca", topics:["Sistemas creativos para una marca coherente","Dirección creativa de experiencias memorables","Cómo evaluar una idea sin apagar su originalidad"], keywords:["creativ","marca","idea","campaña","contenido","dirección","original","experiencia","identidad","concepto","tendencia","noticia"] },
    cdo:{ role:"CDO", area:"Diseño y claridad", alias:"Dieter Rams", tag:"dieterrams", defaultTopic:"Noticias y tendencias de diseño, usabilidad y sistemas visuales", topics:["Diseño de producto: menos, pero mejor","Jerarquía visual para decisiones complejas","Sistemas de diseño útiles y sostenibles"], keywords:["diseño","visual","interfaz","usabilidad","jerarquía","sistema","producto","tipografía","accesibilidad","claridad","tendencia","noticia"] },
    cxo:{ role:"CXO", area:"Experiencia de cliente", alias:"Howard Schultz", tag:"howardschultz", defaultTopic:"Noticias y tendencias de experiencia de cliente y servicio", topics:["Diseño de una experiencia de cliente coherente","Mapas de viaje y momentos de verdad","Medición cualitativa de la experiencia de servicio"], keywords:["experiencia","cliente","servicio","viaje","satisfacción","comunidad","espacio","relación","fidelidad","atención","tendencia","noticia"] },
    cso:{ role:"CSO", area:"Estrategia narrativa", alias:"George Lucas", tag:"georgelucas", defaultTopic:"Noticias y tendencias de narrativa estratégica y comunicación", topics:["Narrativa estratégica para explicar una visión","Construcción de mundos aplicada a una marca","Historias que alinean equipos y decisiones"], keywords:["narrativ","historia","relato","estrateg","comunicación","guion","mundo","mensaje","audiencia","visión","tendencia","noticia"] }
  };

  const normalize = value => String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const DEFAULT_MAX_DURATION_MINUTES = 5;

  function role(agentId){ return ROLES[agentId] || null; }
  function defaultTopic(agentId){ return role(agentId)?.defaultTopic || ""; }
  function proposeTopic(agentId, random=Math.random){
    const item = role(agentId);
    if(!item) return "";
    const index = Math.min(item.topics.length - 1, Math.floor(Math.max(0, Number(random()) || 0) * item.topics.length));
    return item.topics[index];
  }
  function validateTopic(agentId, topic){
    const item = role(agentId);
    const normalized = normalize(topic);
    if(!item || normalized.length < 8) return { relevant:false, reason:"Escribe un tema más concreto." };
    const matched = item.keywords.filter(keyword => normalized.includes(normalize(keyword)));
    return matched.length ? { relevant:true, matched } : { relevant:false, reason:`No vemos una relación clara con ${item.area}. Puedes reformularlo o continuar bajo revisión explícita.` };
  }
  function validateMaxDuration(value){
    const minutes = Number(value);
    if(!Number.isFinite(minutes) || minutes < 1 || minutes > 30) return { valid:false, reason:"El límite debe estar entre 1 y 30 minutos." };
    return { valid:true, minutes:Math.round(minutes * 10) / 10 };
  }
  function validateVideoDuration(durationSeconds, maxDurationMinutes, confirmed=false){
    const max = validateMaxDuration(maxDurationMinutes);
    if(!max.valid) return { status:"invalid_limit", compatible:false, reason:max.reason };
    const seconds = Number(durationSeconds);
    if(!confirmed || !Number.isFinite(seconds) || seconds <= 0) return { status:"pending", compatible:false, reason:"Duración pendiente de verificar mediante revisión explícita." };
    const compatible = seconds <= max.minutes * 60;
    return { status:compatible ? "compatible" : "exceeds_limit", compatible, seconds, maxMinutes:max.minutes, reason:compatible ? `Duración compatible con el máximo de ${max.minutes} min.` : `La fuente supera el máximo de ${max.minutes} min.` };
  }
  function youtubeSearchQuery(agentId, topic){
    const item = role(agentId);
    return `${topic} ${item ? item.area : "formación profesional"} YouTube Shorts`.trim();
  }
  function youtubeSearchUrl(agentId, topic){
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery(agentId, topic))}`;
  }
  function extractYouTubeId(input){
    try{
      const url = new URL(String(input || "").trim());
      if(url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
      if(/(^|\.)youtube\.com$/.test(url.hostname)){
        if(url.pathname === "/watch") return url.searchParams.get("v");
        const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
        return match ? match[1] : null;
      }
    }catch(_error){}
    return null;
  }
  function canonicalYouTubeUrl(input){
    const id = extractYouTubeId(input);
    return id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : "";
  }
  function buildScript(agentId, topic, video){
    const item = role(agentId);
    if(!item || !video || !video.url) return "";
    const title = video.title || "Vídeo seleccionado";
    const author = video.author || "autor indicado en YouTube";
    return [
      `GUION ORIGINAL DE APRENDIZAJE · ${item.role}`,
      `Tema: ${topic}`,
      `Fuente para revisar: ${title} — ${author} (${video.url})`,
      "",
      `Objetivo: extraer una decisión aplicable a ${item.area.toLowerCase()} sin sustituir la revisión de la fuente.`,
      "1. Antes de ver: formula qué decisión del puesto debe mejorar y qué evidencia permitiría comprobarla.",
      "2. Durante la revisión: anota tres ideas con su minuto aproximado; distingue hechos de opiniones del autor.",
      `3. Después: contrasta una idea con el principio de ${item.alias} y conviértela en una acción pequeña, reversible y medible.`,
      "4. Evidencia: registra decisión, prueba, resultado y una duda pendiente. Una revisión no equivale a aprendizaje ni acreditación.",
      "",
      "Nota de autoría: este guion es una estructura original generada por Academy a partir del tema y los metadatos públicos; no es una transcripción del vídeo."
    ].join("\n");
  }
  function createTraining(agentId, topic, maxDurationMinutes=DEFAULT_MAX_DURATION_MINUTES, now=()=>new Date().toISOString()){
    if(typeof maxDurationMinutes === "function"){ now = maxDurationMinutes; maxDurationMinutes = DEFAULT_MAX_DURATION_MINUTES; }
    const checked = validateMaxDuration(maxDurationMinutes);
    const maximum = checked.valid ? checked.minutes : DEFAULT_MAX_DURATION_MINUTES;
    return { id:`training-${agentId}-${Date.now()}`, agentId, topic, maxDurationMinutes:maximum, source:"YouTube", search:{status:"not_started",query:youtubeSearchQuery(agentId,topic),url:youtubeSearchUrl(agentId,topic),detail:"Pendiente de iniciar la búsqueda pública.",updatedAt:now()}, video:null, pixeria:{status:"pending",detail:"Pendiente de importar en Pixeria"}, script:{status:"pending",content:""}, delivery:{status:"pending",detail:"Pendiente de entregar al agente"}, createdAt:now(), updatedAt:now(), transitions:[] };
  }
  function transition(training, stage, status, detail, now=()=>new Date().toISOString()){
    const at = now();
    training.updatedAt = at;
    training.transitions.push({ stage, status, detail, at });
    return training;
  }
  function buildCouncilHandoffUrl(agentId, videoUrl){
    const item = role(agentId);
    if(!item || !videoUrl) return "";
    const url = new URL("https://www.admira.live/council-scumm.html");
    url.searchParams.set("train", videoUrl);
    url.searchParams.set("target", item.alias);
    return url.toString();
  }
  function buildPixeriaComment(agentId, topic){
    const item = role(agentId);
    return item ? `Formación Admira Academy · ${item.role} · ${topic} #formacion #${item.tag}` : "Formación Admira Academy";
  }
  function hasRequiredPixeriaTags(agentId, item){
    const info = role(agentId);
    const tags = Array.isArray(item?.tags) ? item.tags.map(normalize) : [];
    return Boolean(info && tags.includes("formacion") && tags.includes(normalize(info.tag)));
  }

  return { ROLES, DEFAULT_MAX_DURATION_MINUTES, role, defaultTopic, proposeTopic, validateTopic, validateMaxDuration, validateVideoDuration, youtubeSearchQuery, youtubeSearchUrl, extractYouTubeId, canonicalYouTubeUrl, buildScript, createTraining, transition, buildCouncilHandoffUrl, buildPixeriaComment, hasRequiredPixeriaTags };
});
