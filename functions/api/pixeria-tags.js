const STOCK_ORIGIN = "https://api.admira.store";
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
  const id=String(body.id || "");
  if(!/^[A-Za-z0-9-]{4,120}$/.test(id)) return json({ok:false,error:"Activo de Pixeria no válido"},400);
  const tags=Array.isArray(body.tags) ? [...new Set(body.tags.map(tag=>String(tag).toLowerCase().trim()))] : [];
  const counselorTag=tags.find(tag=>COUNSELOR_TAGS.has(tag));
  if(!tags.includes("formacion") || !counselorTag) return json({ok:false,error:"Faltan las etiquetas canónicas de formación"},400);
  try{
    const upstream=await fetch(`${STOCK_ORIGIN}/stock/${encodeURIComponent(id)}/tags`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({tags:["formacion",counselorTag]})});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type") || "application/json","Cache-Control":"no-store"}});
  }catch(error){ return json({ok:false,error:`No se pudieron fijar las etiquetas: ${error.message}`},502); }
}
