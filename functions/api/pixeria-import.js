const IMPORT_URL = "https://macmini.tail48b61c.ts.net/admira/tube/import-to-stock";
const COUNSELOR_TAGS = new Set(["stevejobs","stevewozniak","timcook","warrenbuffett","waltdisney","dieterrams","howardschultz","georgelucas"]);
const ALLOWED_ORIGINS = new Set(["https://admira.academy","https://www.admira.academy","https://admira-academy.pages.dev"]);

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}

export async function onRequestPost({request}){
  const origin=request.headers.get("Origin");
  if(!origin || (!ALLOWED_ORIGINS.has(origin) && !/^https:\/\/[a-z0-9]+\.admira-academy\.pages\.dev$/.test(origin))) return json({ok:false,error:"Origen no autorizado"},403);
  let body;
  try{ body=await request.json(); }catch(_error){ return json({ok:false,error:"JSON no válido"},400); }
  let source;
  try{ source=new URL(String(body.url || "")); }catch(_error){ return json({ok:false,error:"URL no válida"},400); }
  if(!/(^|\.)youtube\.com$/.test(source.hostname) && source.hostname !== "youtu.be") return json({ok:false,error:"Sólo se admiten fuentes de YouTube"},400);
  const tags=Array.isArray(body.tags) ? [...new Set(body.tags.map(tag=>String(tag).toLowerCase().trim()))] : [];
  const counselorTag=tags.find(tag=>COUNSELOR_TAGS.has(tag));
  if(!tags.includes("formacion") || !counselorTag) return json({ok:false,error:"Faltan las etiquetas canónicas de formación"},400);
  const payload={url:source.toString(),format:"video",comment:String(body.comment || "").slice(0,500),tags:["formacion",counselorTag]};
  try{
    const upstream=await fetch(IMPORT_URL,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type") || "application/json","Cache-Control":"no-store"}});
  }catch(error){ return json({ok:false,error:`Importador no disponible: ${error.message}`},502); }
}

export function onRequest(){ return json({ok:false,error:"Método no permitido"},405); }
