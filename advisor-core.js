(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  root.AcademyAdvisorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const COUNCIL = [
    {id:"ceo",seat:"01",role:"CEO",alias:"Steve Jobs",area:"Visión, producto y dirección",tone:"#ffd76a",purpose:"Custodiar la visión de producto y elegir lo esencial."},
    {id:"cto",seat:"02",role:"CTO",alias:"Steve Wozniak",area:"Tecnología y arquitectura",tone:"#65d7ff",purpose:"Convertir la visión en una base tecnológica sólida y sostenible."},
    {id:"coo",seat:"03",role:"COO",alias:"Tim Cook",area:"Operaciones y entrega",tone:"#93e46d",purpose:"Convertir compromisos en entregas observables."},
    {id:"cfo",seat:"04",role:"CFO",alias:"Warren Buffett",area:"Finanzas y sostenibilidad",tone:"#c6b6ff",purpose:"Evaluar coste, retorno, riesgo y sostenibilidad a largo plazo."},
    {id:"cco",seat:"05",role:"CCO",alias:"Walt Disney",area:"Creatividad y marca",tone:"#ff679b",purpose:"Proteger la creatividad y la marca para crear experiencias memorables."},
    {id:"cdo",seat:"06",role:"CDO",alias:"Dieter Rams",area:"Diseño y claridad",tone:"#a88cff",purpose:"Reducir el diseño hasta dejar sólo lo esencial, útil y bello."},
    {id:"cxo",seat:"07",role:"CXO",alias:"Howard Schultz",area:"Experiencia de cliente",tone:"#ff9d67",purpose:"Cuidar cómo se siente la experiencia completa, no sólo la pantalla."},
    {id:"cso",seat:"08",role:"CSO",alias:"George Lucas",area:"Estrategia narrativa",tone:"#f2e59b",purpose:"Construir el relato que vuelve una idea comprensible y transmisible."}
  ];
  const LESSONS = {identity:"Identidad y normativa",ecosystem:"Mapa del ecosistema",mission:"Misión con evidencia",closure:"Cierre y puntuación"};
  const PERIODS = [
    {id:"day",label:"Último día",short:"24 h",ms:24*60*60*1000},
    {id:"week",label:"Última semana",short:"7 días",ms:7*24*60*60*1000},
    {id:"month",label:"Último mes",short:"30 días",ms:30*24*60*60*1000},
    {id:"total",label:"Total",short:"Todo",ms:null}
  ];

  function council(id){ return COUNCIL.find(item => item.id === String(id || "").toLowerCase()) || COUNCIL[0]; }
  function audience(value){ return String(value || "").toLowerCase() === "carbono" ? "carbono" : "silicio"; }
  function safeObject(value){ return value && typeof value === "object" ? value : {}; }
  function parseState(raw){
    if(!raw) return {};
    if(typeof raw === "object") return safeObject(raw);
    try{ return safeObject(JSON.parse(raw)); }catch(_error){ return {}; }
  }
  function iso(value){
    if(!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  function clip(value, length=190){
    const text = String(value || "").replace(/\s+/g," ").trim();
    return text.length > length ? `${text.slice(0,length-1)}…` : text;
  }
  function activity(input){
    const at = iso(input.at);
    if(!at || !input.title) return null;
    return {
      id:String(input.id || `${input.kind || "mejora"}-${at}-${input.title}`),
      kind:["leido","visto","mejora"].includes(input.kind) ? input.kind : "mejora",
      title:clip(input.title,180), detail:clip(input.detail,320), at,
      url:/^https:\/\//i.test(String(input.url || "")) ? String(input.url) : "",
      improvement:input.improvement !== false
    };
  }
  function collectSilicon(agentId, academyRaw, platformRaw){
    const academy = parseState(academyRaw), platform = parseState(platformRaw), items = [];
    const lessons = safeObject(safeObject(safeObject(academy.records)[agentId]).lessons);
    for(const [lessonId, entryRaw] of Object.entries(lessons)){
      const entry = safeObject(entryRaw);
      if(entry.complete === true && entry.updatedAt){
        items.push(activity({id:`lesson-${lessonId}`,kind:"leido",title:LESSONS[lessonId] || lessonId,detail:`Lectura aplicada con evidencia: ${clip(entry.evidence || "evidencia guardada")}`,at:entry.updatedAt,improvement:true}));
      }
    }
    const training = safeObject(safeObject(academy.trainings)[agentId]);
    const video = safeObject(training.video);
    if(video.url && (video.durationConfirmedAt || video.verifiedAt)){
      const duration = Number(video.durationSeconds) > 0 ? ` · ${Math.round(Number(video.durationSeconds)/6)/10} min` : "";
      items.push(activity({id:`video-${video.id || video.url}`,kind:"visto",title:video.title || "Fuente de vídeo revisada",detail:`${video.author || "Autor no publicado"}${duration}`,url:video.url,at:video.durationConfirmedAt || video.verifiedAt,improvement:true}));
    }
    for(const [index,transitionRaw] of (Array.isArray(training.transitions) ? training.transitions : []).entries()){
      const transition = safeObject(transitionRaw);
      items.push(activity({id:`transition-${index}-${transition.at}`,kind:"mejora",title:`${transition.stage || "Formación"} · ${transition.status || "avance"}`,detail:transition.detail || training.topic || "Avance registrado",at:transition.at,improvement:true}));
    }
    for(const closureRaw of (Array.isArray(platform.closures) ? platform.closures : [])){
      const closure = safeObject(closureRaw), student = safeObject(closure.student), work = safeObject(closure.work);
      if(student.id !== agentId || closure.audience === "carbono") continue;
      items.push(activity({id:closure.id,kind:"mejora",title:work.title || "Cierre de mejora",detail:`${work.type || "trabajo"} · ${work.status || "estado no declarado"} · ${clip(closure.evidence || "sin detalle")}`,at:closure.closedAt || safeObject(closure.time).endedAt,improvement:true}));
    }
    return items.filter(Boolean).sort((a,b) => b.at.localeCompare(a.at));
  }
  function collectCarbon(agentId, carbonRaw, platformRaw){
    const carbon = parseState(carbonRaw), platform = parseState(platformRaw), items = [];
    const record = safeObject(safeObject(carbon.records)[agentId]);
    for(const [index,itemRaw] of (Array.isArray(record.activities) ? record.activities : []).entries()){
      const item = safeObject(itemRaw);
      items.push(activity({...item,id:item.id || `carbon-${index}`}));
    }
    for(const closureRaw of (Array.isArray(platform.closures) ? platform.closures : [])){
      const closure = safeObject(closureRaw), student = safeObject(closure.student), work = safeObject(closure.work);
      if(student.id !== agentId || closure.audience !== "carbono") continue;
      items.push(activity({id:closure.id,kind:"mejora",title:work.title || "Cierre de mejora",detail:`${work.type || "trabajo"} · ${work.status || "estado no declarado"} · ${clip(closure.evidence || "sin detalle")}`,at:closure.closedAt || safeObject(closure.time).endedAt,improvement:true}));
    }
    return items.filter(Boolean).sort((a,b) => b.at.localeCompare(a.at));
  }
  function collect(agentId, audienceValue, states={}){
    const id = council(agentId).id;
    return audience(audienceValue) === "carbono"
      ? collectCarbon(id, states.carbon, states.platform)
      : collectSilicon(id, states.academy, states.platform);
  }
  function period(id){ return PERIODS.find(item => item.id === id) || PERIODS[0]; }
  function within(items, periodId, now=Date.now()){
    const selected = period(periodId);
    const maximum = Number(now);
    if(selected.ms === null) return items.filter(item => new Date(item.at).getTime() <= maximum);
    const minimum = Number(now) - selected.ms;
    return items.filter(item => { const timestamp=new Date(item.at).getTime(); return timestamp >= minimum && timestamp <= maximum; });
  }
  function summarize(items, periodId, now=Date.now()){
    const filtered = within(items,periodId,now);
    return {items:filtered,total:filtered.length,improvements:filtered.filter(item => item.improvement).length,read:filtered.filter(item => item.kind === "leido").length,viewed:filtered.filter(item => item.kind === "visto").length};
  }
  function progress(agentId, audienceValue, states={}){
    const id = council(agentId).id;
    if(audience(audienceValue) === "carbono"){
      const activities = collect(id,"carbono",states);
      return {value:null,label:activities.length ? `${activities.length} hitos trazados` : "Sin actividad registrada",detail:"Registro de carbono separado; no se hereda progreso de silicio."};
    }
    const academy = parseState(states.academy), lessons = safeObject(safeObject(safeObject(academy.records)[id]).lessons);
    const completed = Object.values(lessons).filter(item => safeObject(item).complete === true).length;
    return {value:Math.round(Math.min(4,completed)/4*100),label:completed ? `${completed} de 4 lecciones` : "Sin evaluar",detail:completed === 4 ? "Recorrido local completo; revisión externa pendiente." : "Progreso local con evidencia; no equivale a acreditación."};
  }
  function leaderboard(audienceValue, states={}, periodId="day", now=Date.now()){
    const selectedAudience=audience(audienceValue), selectedPeriod=period(periodId).id;
    const rows=COUNCIL.map(agent => {
      const activities=collect(agent.id,selectedAudience,states).filter(item=>!String(item.id || "").startsWith("transition-"));
      const summary=summarize(activities,selectedPeriod,now);
      const lifetime=summarize(activities,"total",now);
      return {...agent,score:summary.total,studies:summary.total,improvements:summary.improvements,read:summary.read,viewed:summary.viewed,lifetime:lifetime.total};
    }).sort((a,b)=>b.score-a.score || a.seat.localeCompare(b.seat));
    let previousScore=null, previousRank=0;
    return rows.map((row,index)=>{
      const rank=row.score === 0 ? null : row.score === previousScore ? previousRank : index+1;
      previousScore=row.score; if(rank !== null) previousRank=rank;
      return {...row,rank};
    });
  }

  function youtubeId(value){
    const text = String(value || "");
    const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{6,})/i);
    return match ? match[1] : null;
  }
  function pixeriaItems(payload){
    if(Array.isArray(payload)) return payload;
    if(Array.isArray(payload?.items)) return payload.items;
    if(Array.isArray(payload?.stock)) return payload.stock;
    return [];
  }
  function findPixeriaVideo(payload, sourceUrl){
    const id = youtubeId(sourceUrl);
    const candidates = pixeriaItems(payload).filter(item => {
      if(item?.type !== "video") return false;
      const source = String(item.prompt || item.sourceUrl || "");
      return source === sourceUrl || Boolean(id && youtubeId(source) === id);
    });
    return candidates.sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
  }

  return {COUNCIL,LESSONS,PERIODS,council,audience,parseState,collect,period,within,summarize,progress,leaderboard,youtubeId,pixeriaItems,findPixeriaVideo};
});
