#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ENDPOINTS = Object.freeze({
  pending:"https://api.yokup.com/academy/capsula/smith/pending",
  result:"https://api.yokup.com/academy/capsula/smith/result",
  index:"https://pub-bf043a4daa3b43b7a0b769617729d074.r2.dev/stock/index.json",
  import:"https://admira.academy/api/pixeria-import",
  status:"https://admira.academy/api/pixeria-status",
  tags:"https://admira.academy/api/pixeria-tags",
  publish:"https://api.admira.store/stock/publish"
});

const SMITH=process.env.SMITH_OPENCODE || "/Users/csilvasantin/Claude/admira-vault/smith-opencode/smith-opencode.sh";
const YTDLP=process.env.YT_DLP || "/opt/homebrew/bin/yt-dlp";
const ORIGIN="https://admira.academy";
const MAX_VIDEO_SECONDS=300;
const MIN_VIDEO_SECONDS=30;

function clean(value,limit=1000){ return String(value ?? "").replace(/\s+/g," ").trim().slice(0,limit); }
export function youtubeId(value){
  const match=String(value || "").match(/(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return match ? match[1] : "";
}
export function parseSmithEvents(output){
  const texts=[];
  for(const line of String(output || "").split(/\r?\n/)){
    try{ const event=JSON.parse(line); if(event?.type==="text" && event?.part?.text) texts.push(event.part.text); }catch(_error){}
  }
  if(!texts.length) throw new Error("Smith no devolvió una respuesta estructurada");
  const raw=texts.at(-1).replace(/^```(?:json)?\s*|\s*```$/g,"").trim();
  try{ return JSON.parse(raw); }catch(_error){ throw new Error(`Smith devolvió JSON no válido: ${raw.slice(0,180)}`); }
}
export function eligibleCandidates(items){
  return (items || []).filter(item=>youtubeId(item.webpage_url || item.url) && Number(item.duration)>=MIN_VIDEO_SECONDS && Number(item.duration)<=MAX_VIDEO_SECONDS)
    .map(item=>({videoId:youtubeId(item.webpage_url || item.url),url:`https://www.youtube.com/watch?v=${youtubeId(item.webpage_url || item.url)}`,title:clean(item.title,180),channel:clean(item.channel || item.uploader,100),duration:Number(item.duration),views:Number(item.view_count || 0),description:clean(item.description,3000)}));
}
export function findVideo(items,sourceUrl){
  const id=youtubeId(sourceUrl);
  return (items || []).find(item=>String(item?.type || "").toLowerCase()==="video" && youtubeId(item.prompt || item.sourceUrl || "")===id) || null;
}
export function findCapsule(items,videoAssetId,tag){
  return (items || []).find(item=>["capsula","guion"].includes(String(item?.type || "").toLowerCase()) && String(item.externalRef || "")===String(videoAssetId) && hasTags(item,["formacion",tag])) || null;
}
export function hasTags(item,required){
  const tags=new Set((Array.isArray(item?.tags) ? item.tags : []).map(value=>clean(value,30).toLowerCase()));
  return required.every(tag=>tags.has(tag));
}

async function jsonFetch(url,options={}){
  const response=await fetch(url,{...options,headers:{Accept:"application/json",...(options.headers || {})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`${url} respondió ${response.status}: ${body.error || body.detail || "sin detalle"}`);
  return body;
}
async function stockIndex(){
  const body=await jsonFetch(`${ENDPOINTS.index}?smith=${Date.now()}`,{cache:"no-store"});
  return Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : []);
}
function run(command,args,{timeout=180000,maxBuffer=16*1024*1024}={}){
  const result=spawnSync(command,args,{encoding:"utf8",timeout,maxBuffer,env:process.env});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(`${command} falló (${result.status}): ${clean(result.stderr || result.stdout,500)}`);
  return result.stdout;
}
function askSmith(prompt){
  const output=run("bash",[SMITH,"run","--format","json",prompt],{timeout:240000,maxBuffer:32*1024*1024});
  return parseSmithEvents(output);
}
function searchYoutube(query){
  const output=run(YTDLP,["--dump-json","--skip-download","--no-warnings","--playlist-end","10",`ytsearch10:${query}`],{timeout:180000,maxBuffer:48*1024*1024});
  return output.split(/\r?\n/).filter(Boolean).map(line=>{ try{return JSON.parse(line);}catch(_error){return null;} }).filter(Boolean);
}
function transcriptFor(candidate){
  const dir=mkdtempSync(join(tmpdir(),"admira-smith-capsule-"));
  try{
    run(YTDLP,["--skip-download","--write-subs","--write-auto-subs","--sub-langs","es.*,en.*","--sub-format","vtt","--no-warnings","-o",join(dir,"source.%(ext)s"),candidate.url],{timeout:180000,maxBuffer:8*1024*1024});
    const file=readdirSync(dir).find(name=>name.endsWith(".vtt"));
    if(!file) return candidate.description || "";
    const seen=new Set();
    return readFileSync(join(dir,file),"utf8").split(/\r?\n/).filter(line=>line && !/^WEBVTT|^Kind:|^Language:|^\d\d:\d\d|^\d+$|-->/.test(line))
      .map(line=>line.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").trim()).filter(line=>line && !seen.has(line) && seen.add(line)).join(" ").slice(0,18000);
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
function canonicalJob(job){
  if(!job || !Number.isInteger(Number(job.hour_start))) throw new Error("Yokup no devolvió una franja válida");
  if(!/^(ceo|cto|coo|cfo|cco|cdo|cxo|cso)$/.test(String(job.seat || ""))) throw new Error("Yokup no devolvió una silla canónica");
  if(!/^[a-z0-9]{4,30}$/.test(String(job.training_tag || ""))) throw new Error("Yokup no devolvió la etiqueta formativa");
  return job;
}
async function ensureVideoTags(video,tag){
  if(hasTags(video,["formacion",tag])) return video;
  await jsonFetch(ENDPOINTS.tags,{method:"POST",headers:{Origin:ORIGIN,"Content-Type":"application/json"},body:JSON.stringify({id:video.id,tags:["formacion",tag]})});
  for(let attempt=0;attempt<30;attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const updated=(await stockIndex()).find(item=>item.id===video.id);
    if(updated && hasTags(updated,["formacion",tag])) return updated;
  }
  throw new Error("Pixeria no confirmó las etiquetas canónicas del vídeo");
}
async function importVideo(candidate,job,selection){
  let items=await stockIndex(), video=findVideo(items,candidate.url);
  if(video) return ensureVideoTags(video,job.training_tag);
  const imported=await jsonFetch(ENDPOINTS.import,{method:"POST",headers:{Origin:ORIGIN,"Content-Type":"application/json"},body:JSON.stringify({url:candidate.url,tags:["formacion",job.training_tag],comment:`#formacion #${job.training_tag} · Smith · ${job.tema_nombre} · ${clean(selection.reason,180)}`})});
  const jobId=String(imported.jobId || "");
  if(!jobId) throw new Error("El importador de Pixeria no devolvió jobId");
  const deadline=Date.now()+9*60*1000;
  while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,4000));
    items=await stockIndex(); video=findVideo(items,candidate.url);
    if(video) return ensureVideoTags(video,job.training_tag);
    const status=await fetch(`${ENDPOINTS.status}?id=${encodeURIComponent(jobId)}`,{headers:{Origin:ORIGIN,Accept:"application/json"}});
    if(status.ok){ const state=await status.json().catch(()=>({})); if(state.state==="error") throw new Error(`La descarga falló: ${state.error || "sin detalle"}`); }
  }
  throw new Error("Pixeria no publicó el vídeo dentro de nueve minutos");
}
async function publishCapsule(video,candidate,job,knowledge){
  let items=await stockIndex(), capsule=findCapsule(items,video.id,job.training_tag);
  if(capsule) return capsule;
  const result=await jsonFetch(ENDPOINTS.publish,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"capsula",motor:"Smith · Grok",prompt:candidate.url,title:clean(knowledge.title,180),comment:clean(knowledge.capsule,900),tags:["formacion",job.training_tag],externalRef:video.id,thumbnail:video.thumbnail || null})});
  const id=String(result.id || "");
  if(!id) throw new Error("Pixeria no devolvió el id de la cápsula");
  for(let attempt=0;attempt<60;attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    capsule=(await stockIndex()).find(item=>item.id===id);
    if(capsule && findCapsule([capsule],video.id,job.training_tag)) return capsule;
  }
  throw new Error("La cápsula no apareció en el índice público de Pixeria");
}

export async function processOne(){
  const pending=await jsonFetch(ENDPOINTS.pending,{cache:"no-store"});
  if(!pending.job) return {ok:true,idle:true,message:"Sin cápsulas pendientes"};
  const job=canonicalJob(pending.job);
  const queryAnswer=askSmith(`Eres Smith, agente de formación. Formula UNA búsqueda de YouTube para encontrar un vídeo real y breve de ${job.alias} que enseñe ${job.tema_nombre} y conecte con la lección «${job.title}». Prioriza canales oficiales, entrevistas o charlas del propio protagonista. Máximo 5 minutos. Responde sólo JSON: {"query":"..."}`);
  const query=clean(queryAnswer.query,180);
  if(!query) throw new Error("Smith no formuló una búsqueda");
  let candidates=eligibleCandidates(searchYoutube(query));
  if(!candidates.length) candidates=eligibleCandidates(searchYoutube(`${job.alias} ${job.tema_nombre} interview short`));
  if(!candidates.length) throw new Error("YouTube no devolvió vídeos válidos de 30 segundos a 5 minutos");
  const compact=candidates.slice(0,8).map(({description,...item})=>item);
  const selection=askSmith(`Elige el vídeo que mejor forma a la silla ${job.role} · ${job.alias} en ${job.tema_nombre}. Sólo puedes elegir uno de esta lista y debes evitar homenajes, resúmenes de terceros o contenido que no sea realmente del protagonista. Candidatos: ${JSON.stringify(compact)}. Responde sólo JSON: {"videoId":"id exacto de la lista","reason":"criterio factual en una frase"}`);
  const candidate=candidates.find(item=>item.videoId===selection.videoId);
  if(!candidate) throw new Error("Smith eligió un vídeo que no estaba entre los candidatos validados");
  const transcript=transcriptFor(candidate) || candidate.description;
  if(clean(transcript,20000).length<80) throw new Error("El vídeo no aporta transcripción ni descripción suficiente");
  const knowledge=askSmith(`Convierte esta fuente en UNA cápsula de conocimiento para ${job.role} · ${job.alias}, dimensión ${job.tema_nombre}, lección «${job.title}». Usa sólo lo que aparece en la transcripción/descripción. La cápsula debe tener entre 400 y 900 caracteres, explicar una idea aplicable y no atribuir frases literales si no constan. FUENTE: ${candidate.title}. TEXTO: ${clean(transcript,18000)}. Responde sólo JSON: {"title":"título de 4 a 10 palabras","capsule":"texto en español"}`);
  const capsuleText=clean(knowledge.capsule,900);
  if(capsuleText.length<400) throw new Error("Smith devolvió una cápsula demasiado corta");
  if(process.env.SMITH_CAPSULE_DRY_RUN==="1") return {ok:true,dryRun:true,job,candidate,knowledge:{...knowledge,capsule:capsuleText}};
  const video=await importVideo(candidate,job,selection);
  const capsule=await publishCapsule(video,candidate,job,{...knowledge,capsule:capsuleText});
  const accepted=await jsonFetch(ENDPOINTS.result,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hourStart:Number(job.hour_start),sourceUrl:candidate.url,videoAssetId:video.id,capsuleAssetId:capsule.id})});
  return {ok:true,idle:false,reused:Boolean(accepted.reused),hourStart:job.hour_start,seat:job.seat,dimension:job.tema,sourceUrl:candidate.url,videoAssetId:video.id,capsuleAssetId:capsule.id};
}

async function main(){
  try{ const result=await processOne(); process.stdout.write(JSON.stringify(result)+"\n"); }
  catch(error){ process.stderr.write(`Smith cápsula ERROR · ${clean(error?.stack || error,1800)}\n`); process.exitCode=1; }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
