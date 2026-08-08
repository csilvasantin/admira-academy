const STATUS_URL = "https://macmini.tail48b61c.ts.net/admira/tube/status";

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}

export async function onRequestGet({request}){
  const id=new URL(request.url).searchParams.get("id") || "";
  if(!/^[A-Za-z0-9_-]{4,120}$/.test(id)) return json({ok:false,error:"Identificador de trabajo no válido"},400);
  try{
    const upstream=await fetch(`${STATUS_URL}?id=${encodeURIComponent(id)}`,{headers:{Accept:"application/json"}});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type") || "application/json","Cache-Control":"no-store"}});
  }catch(error){ return json({ok:false,error:`Estado no disponible: ${error.message}`},502); }
}
