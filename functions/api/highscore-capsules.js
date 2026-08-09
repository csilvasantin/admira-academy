const YOKUP_HIGHSCORE="https://api.yokup.com/academy/highscore/capsulas";

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}

export async function onRequestGet(){
  try{
    const response=await fetch(YOKUP_HIGHSCORE,{headers:{Accept:"application/json"},cf:{cacheTtl:0,cacheEverything:false}});
    const body=await response.json().catch(()=>({ok:false,error:"Yokup no devolvió JSON"}));
    return json(body,response.status);
  }catch(error){
    return json({ok:false,error:`No se pudo consultar el Highscore de Yokup: ${String(error?.message || error).slice(0,160)}`},502);
  }
}
