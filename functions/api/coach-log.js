const YOKUP_ENDPOINT="https://api.yokup.com/academy/coach/completion";
const YOKUP_HEALTH="https://api.yokup.com/academy/coach/health";
const HOUR=60*60*1000;
const COUNSELORS=new Set(["ceo","cto","coo","cfo","cco","cdo","cxo","cso"]);
const AUDIENCES=new Set(["silicio","carbono"]);
const ALLOWED_ORIGINS=new Set(["https://admira.academy","https://www.admira.academy","https://bitsandatoms.ai","https://www.bitsandatoms.ai","https://admira-academy.pages.dev","https://bits-and-atoms.pages.dev"]);

function json(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}); }
function allowed(origin){ return ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9]+\.(?:admira-academy|bits-and-atoms)\.pages\.dev$/.test(origin); }

export async function onRequestGet({env}){
  const token=String(env?.ACADEMY_COACH_TOKEN || "");
  if(!token) return json({ok:false,error:"El registro Coach no está configurado"},503);
  try{
    const upstream=await fetch(YOKUP_HEALTH,{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"}});
    const result=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !result.ok) return json({ok:false,error:result.error || `Yokup respondió ${upstream.status}`},502);
    return json(result);
  }catch(error){ return json({ok:false,error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`},502); }
}

export async function onRequestPost({request,env}){
  const origin=request.headers.get("Origin") || "";
  if(!allowed(origin)) return json({ok:false,error:"Origen no autorizado"},403);
  if(Number(request.headers.get("Content-Length") || 0)>5000) return json({ok:false,error:"Solicitud demasiado grande"},413);
  const token=String(env?.ACADEMY_COACH_TOKEN || "");
  if(!token) return json({ok:false,error:"El registro Coach no está configurado"},503);
  let body;
  try{ body=await request.json(); }catch(_error){ return json({ok:false,error:"JSON no válido"},400); }
  const audience=String(body.audience || "").toLowerCase(), counselor=String(body.counselor || "").toLowerCase();
  const slotId=Number(body.slotId), application=String(body.application || "").replace(/\s+/g," ").trim();
  if(!AUDIENCES.has(audience) || !COUNSELORS.has(counselor)) return json({ok:false,error:"Agente o audiencia no válidos"},400);
  if(!Number.isInteger(slotId)) return json({ok:false,error:"Franja no válida"},400);
  const currentSlot=Math.floor(Date.now()/HOUR);
  // Se admite como máximo la franja siguiente; Yokup sólo la acepta si existe
  // un lanzamiento manual autoritativo para ese agente y esa cápsula.
  if(slotId>currentSlot+1 || slotId<currentSlot-24) return json({ok:false,error:"La franja está fuera de la ventana de registro de 24 horas"},409);
  if(application.length<20 || application.length>900) return json({ok:false,error:"La aplicación debe tener entre 20 y 900 caracteres"},400);
  try{
    const upstream=await fetch(YOKUP_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({audience,counselor,slotId,application})});
    const result=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !result.ok) return json({ok:false,error:result.error || `Yokup respondió ${upstream.status}`},upstream.status>=400 && upstream.status<500 ? upstream.status : 502);
    return json(result);
  }catch(error){ return json({ok:false,error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`},502); }
}
