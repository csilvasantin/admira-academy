const YOKUP_PROGRESS="https://api.yokup.com/academy/capsula/smith/progress";

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}

export async function onRequestGet({request}){
  const requestUrl=new URL(request.url), raw=requestUrl.searchParams.get("hourStart");
  if(raw!==null && (!/^\d{13}$/.test(raw) || Number(raw)%3600000!==0)) return json({ok:false,error:"Franja no válida"},400);
  const upstream=new URL(YOKUP_PROGRESS);
  if(raw!==null) upstream.searchParams.set("hourStart",raw);
  try{
    const response=await fetch(upstream,{headers:{Accept:"application/json"},cf:{cacheTtl:0,cacheEverything:false}});
    const body=await response.json().catch(()=>({ok:false,error:"Yokup no devolvió JSON"}));
    return json(body,response.status);
  }catch(error){
    return json({ok:false,error:`No se pudo consultar a Yokup: ${String(error?.message || error).slice(0,160)}`},502);
  }
}
