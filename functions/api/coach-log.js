const YOKUP_ORIGIN="https://yokup-rtc.csilvasantin.workers.dev";
const YOKUP_MISSION="DCL-mslm5270wak6";
const HOUR=60*60*1000;
const ANCHOR=Date.UTC(2026,7,8,23,0,0,0);
const COUNSELORS=new Set(["ceo","cto","coo","cfo","cco","cdo","cxo","cso"]);
const AUDIENCES=new Set(["silicio","carbono"]);
const LESSONS={
  tecnologia:["contratos-claros","observabilidad","automatizacion","simplicidad"],
  creatividad:["restriccion","divergir-converger","narrativa","prototipo"],
  negocio:["problema-real","valor-captura","prioridad","validacion"]
};
const DIMENSIONS=Object.keys(LESSONS);
const ALLOWED_ORIGINS=new Set(["https://admira.academy","https://www.admira.academy","https://bitsandatoms.ai","https://www.bitsandatoms.ai","https://admira-academy.pages.dev","https://bits-and-atoms.pages.dev"]);

function json(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}); }
function allowed(origin){ return ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9]+\.(?:admira-academy|bits-and-atoms)\.pages\.dev$/.test(origin); }
function lessonFor(slotId){
  const offset=Math.floor((slotId*HOUR-ANCHOR)/HOUR), dimensionIndex=((offset%3)+3)%3;
  const dimension=DIMENSIONS[dimensionIndex], cycle=Math.floor(offset/3), catalog=LESSONS[dimension];
  const lessonId=catalog[((cycle%catalog.length)+catalog.length)%catalog.length];
  return {dimension,lessonId};
}
async function ticket(){
  const response=await fetch(`${YOKUP_ORIGIN}/ticket?id=${encodeURIComponent(YOKUP_MISSION)}`,{headers:{Accept:"application/json"}});
  if(!response.ok) throw new Error(`Yokup no encontró el registro Coach (${response.status})`);
  return response.json();
}
function existingEvent(payload,eventId){ return (Array.isArray(payload?.events) ? payload.events : []).find(event=>String(event.text || "").includes(`[${eventId}]`)); }

export async function onRequestPost({request}){
  const origin=request.headers.get("Origin") || "";
  if(!allowed(origin)) return json({ok:false,error:"Origen no autorizado"},403);
  if(Number(request.headers.get("Content-Length") || 0)>5000) return json({ok:false,error:"Solicitud demasiado grande"},413);
  let body;
  try{ body=await request.json(); }catch(_error){ return json({ok:false,error:"JSON no válido"},400); }
  const audience=String(body.audience || "").toLowerCase(), counselor=String(body.counselor || "").toLowerCase();
  const slotId=Number(body.slotId), application=String(body.application || "").replace(/\s+/g," ").trim();
  if(!AUDIENCES.has(audience) || !COUNSELORS.has(counselor)) return json({ok:false,error:"Agente o audiencia no válidos"},400);
  if(!Number.isInteger(slotId)) return json({ok:false,error:"Franja no válida"},400);
  const currentSlot=Math.floor(Date.now()/HOUR);
  if(slotId>currentSlot || slotId<currentSlot-24) return json({ok:false,error:"La franja está fuera de la ventana de registro de 24 horas"},409);
  if(application.length<20 || application.length>900) return json({ok:false,error:"La aplicación debe tener entre 20 y 900 caracteres"},400);
  const {dimension,lessonId}=lessonFor(slotId), eventId=`coach-${audience}-${counselor}-${slotId}-${lessonId}`;
  try{
    let detail=await ticket(), match=existingEvent(detail,eventId);
    if(match) return json({ok:true,reused:true,missionId:YOKUP_MISSION,eventId,completedAt:new Date(Number(match.ts) || Date.now()).toISOString(),dimension,lessonId});
    const text=`[${eventId}] Coach Admira Academy · ${audience} · ${counselor.toUpperCase()} · ${dimension} · ${lessonId} · Aplicación: ${application}`;
    const upstream=await fetch(`${YOKUP_ORIGIN}/ticket/note`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({id:YOKUP_MISSION,author:"Admira Academy Coach",text})});
    const result=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !result.ok) return json({ok:false,error:result.error || `Yokup respondió ${upstream.status}`},502);
    detail=await ticket(); match=existingEvent(detail,eventId);
    if(!match) return json({ok:false,error:"Yokup aceptó el registro pero no devolvió evidencia verificable"},502);
    return json({ok:true,reused:false,missionId:YOKUP_MISSION,eventId,completedAt:new Date(Number(match.ts) || Date.now()).toISOString(),dimension,lessonId});
  }catch(error){ return json({ok:false,error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`},502); }
}
