const YOKUP_ENDPOINT="https://api.yokup.com/academy/coach/launch";
const AUDIENCES=new Set(["silicio","carbono"]);
const ALLOWED_ORIGINS=new Set(["https://admira.academy","https://www.admira.academy","https://bitsandatoms.ai","https://www.bitsandatoms.ai","https://admira-academy.pages.dev","https://bits-and-atoms.pages.dev"]);

function json(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}); }
function allowed(origin){ return ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9]+\.(?:admira-academy|bits-and-atoms)\.pages\.dev$/.test(origin); }

export async function onRequestPost({request,env}){
  const origin=request.headers.get("Origin") || "";
  if(!allowed(origin)) return json({ok:false,error:"Origen no autorizado"},403);
  if(Number(request.headers.get("Content-Length") || 0)>1000) return json({ok:false,error:"Solicitud demasiado grande"},413);
  const token=String(env?.ACADEMY_COACH_TOKEN || "");
  if(!token) return json({ok:false,error:"El registro Coach no está configurado"},503);
  let body;
  try{ body=await request.json(); }catch(_error){ return json({ok:false,error:"JSON no válido"},400); }
  const audience=String(body.audience || "").toLowerCase();
  if(!AUDIENCES.has(audience)) return json({ok:false,error:"Audiencia no válida"},400);
  try{
    const upstream=await fetch(YOKUP_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({audience})});
    const result=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !result.ok) return json({ok:false,error:result.error || `Yokup respondió ${upstream.status}`},upstream.status>=400 && upstream.status<500 ? upstream.status : 502);
    return json(result);
  }catch(error){ return json({ok:false,error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`},502); }
}
