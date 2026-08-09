const PIXER_ENDPOINT="https://api.admira.store/stock/site-capsule";
const YOKUP_WRITE="https://api.yokup.com/academy/coach/source";
const YOKUP_READ="https://api.yokup.com/academy/coach/sources";
const AUDIENCES=new Set(["silicio","carbono"]);
const COUNSELOR_TAGS={ceo:"stevejobs",cto:"stevewozniak",coo:"timcook",cfo:"warrenbuffett",cco:"waltdisney",cdo:"dieterrams",cxo:"howardschultz",cso:"georgelucas"};
const ALLOWED_ORIGINS=new Set(["https://admira.academy","https://www.admira.academy","https://bitsandatoms.ai","https://www.bitsandatoms.ai","https://admira-academy.pages.dev","https://bits-and-atoms.pages.dev"]);

function json(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}); }
function allowed(origin){ return ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9]+\.(?:admira-academy|bits-and-atoms)\.pages\.dev$/.test(origin); }
function safeUrl(value){
  try{
    const url=new URL(String(value || "").trim());
    if(url.protocol!=="https:" || url.username || url.password) return "";
    const host=url.hostname.toLowerCase().replace(/\.$/,"");
    if(!host.includes(".") || host==="localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return "";
    return url.href;
  }catch(_error){ return ""; }
}

export async function onRequestGet({request}){
  const url=new URL(request.url), audience=String(url.searchParams.get("audience") || "").toLowerCase(), counselor=String(url.searchParams.get("counselor") || "").toLowerCase();
  if(audience && !AUDIENCES.has(audience)) return json({ok:false,error:"Audiencia no válida"},400);
  if(counselor && !COUNSELOR_TAGS[counselor]) return json({ok:false,error:"Consejero no válido"},400);
  const upstreamUrl=new URL(YOKUP_READ);
  if(audience) upstreamUrl.searchParams.set("audience",audience);
  if(counselor) upstreamUrl.searchParams.set("counselor",counselor);
  try{
    const upstream=await fetch(upstreamUrl,{headers:{Accept:"application/json"}}), result=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !result.ok) return json({ok:false,error:result.error || `Yokup respondió ${upstream.status}`},502);
    return json(result);
  }catch(error){ return json({ok:false,error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`},502); }
}

export async function onRequestPost({request,env}){
  const origin=request.headers.get("Origin") || "";
  if(!allowed(origin)) return json({ok:false,error:"Origen no autorizado"},403);
  if(Number(request.headers.get("Content-Length") || 0)>2200) return json({ok:false,error:"Solicitud demasiado grande"},413);
  const token=String(env?.ACADEMY_COACH_TOKEN || "");
  if(!token) return json({ok:false,error:"El registro Coach no está configurado"},503);
  let body;
  try{ body=await request.json(); }catch(_error){ return json({ok:false,error:"JSON no válido"},400); }
  const audience=String(body.audience || "").toLowerCase(), counselor=String(body.counselor || "").toLowerCase(), sourceUrl=safeUrl(body.url);
  if(!AUDIENCES.has(audience) || !COUNSELOR_TAGS[counselor]) return json({ok:false,error:"Agente o audiencia no válidos"},400);
  if(!sourceUrl) return json({ok:false,error:"Pega una URL https pública y válida"},400);
  let pixeria;
  try{
    const upstream=await fetch(PIXER_ENDPOINT,{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({url:sourceUrl,audience,counselorTag:COUNSELOR_TAGS[counselor]})});
    pixeria=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !pixeria.ok) return json({ok:false,phase:"pixeria",error:pixeria.error || `Pixeria respondió ${upstream.status}`,detail:pixeria.detail || ""},upstream.status>=400 && upstream.status<500 ? upstream.status : 502);
  }catch(error){ return json({ok:false,phase:"pixeria",error:`Pixeria no disponible: ${String(error.message || error).slice(0,180)}`},502); }
  try{
    const upstream=await fetch(YOKUP_WRITE,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({audience,counselor,sourceUrl:pixeria.sourceUrl,capsuleAssetId:pixeria.capsule?.id,previewAssetId:pixeria.preview?.id})});
    const registry=await upstream.json().catch(()=>({}));
    if(!upstream.ok || !registry.ok) return json({ok:false,phase:"yokup",error:registry.error || `Yokup respondió ${upstream.status}`,pixeria:{reused:Boolean(pixeria.reused),capsule:pixeria.capsule,preview:pixeria.preview}},upstream.status>=400 && upstream.status<500 ? upstream.status : 502);
    return json({ok:true,reused:Boolean(pixeria.reused && registry.reused),pixeria,registry});
  }catch(error){ return json({ok:false,phase:"yokup",error:`Registro Yokup no disponible: ${String(error.message || error).slice(0,180)}`,pixeria:{reused:Boolean(pixeria.reused),capsule:pixeria.capsule,preview:pixeria.preview}},502); }
}
