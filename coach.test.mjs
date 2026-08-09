import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const html=await readFile(new URL("./coach/index.html",import.meta.url),"utf8");
const css=await readFile(new URL("./coach.css",import.meta.url),"utf8");
const js=await readFile(new URL("./coach.js",import.meta.url),"utf8");
const coreSource=await readFile(new URL("./coach-core.js",import.meta.url),"utf8");
const advisorSource=await readFile(new URL("./advisor-core.js",import.meta.url),"utf8");
const proxySource=await readFile(new URL("./functions/api/coach-log.js",import.meta.url),"utf8");
const launchProxySource=await readFile(new URL("./functions/api/coach-launch.js",import.meta.url),"utf8");
const deploy=await readFile(new URL("./deploy.sh",import.meta.url),"utf8");
const pages=await Promise.all(["index.html","consejeros/index.html","platform/index.html","highscore/index.html","help/index.html"].map(path=>readFile(new URL(`./${path}`,import.meta.url),"utf8")));
const coachSandbox={module:{exports:{}}}; vm.runInNewContext(coreSource,coachSandbox); const C=coachSandbox.module.exports;
const advisorSandbox={module:{exports:{}}}; vm.runInNewContext(advisorSource,advisorSandbox); const A=advisorSandbox.module.exports;
const moduleFromSource=source=>import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("the normative hourly cycle returns to the same dimension after three hours",()=>{
  const start=C.ANCHOR;
  assert.equal(C.dimensionAt(start).id,"tecnologia");
  assert.equal(C.dimensionAt(start+C.HOUR).id,"creatividad");
  assert.equal(C.dimensionAt(start+2*C.HOUR).id,"negocio");
  assert.equal(C.dimensionAt(start+3*C.HOUR).id,"tecnologia");
  assert.equal(C.schedule(start,3).map(item=>item.dimension).join(","),"tecnologia,creatividad,negocio");
  assert.equal(C.slotAt(start+C.HOUR)-C.slotAt(start),1);
  const next=C.nextCapsule(start);
  assert.equal(next.slot,C.slotAt(start)+1); assert.equal(next.dimension,"creatividad");
});

test("the lesson catalog is concrete, deterministic and balanced across three dimensions",()=>{
  assert.equal(C.DIMENSIONS.length,3);
  assert.ok(C.DIMENSIONS.every(item=>item.lessons.length===4 && item.lessons.every(lesson=>lesson.title && lesson.principle && lesson.practice)));
  assert.equal(C.lessonAt(C.ANCHOR).id,C.lessonAt(C.ANCHOR).id);
  const result=C.balance([
    {dimension:"tecnologia",yokup:{status:"verified"}},
    {dimension:"creatividad",yokup:{status:"verified"}},
    {dimension:"negocio",yokup:{status:"verified"}},
    {dimension:"negocio",yokup:{status:"pending"}}
  ]);
  assert.equal(result.total,3); assert.equal(result.balanced,true); assert.equal(result.counts.negocio,1);
});

test("only a Yokup-authoritative completion enters counselor detail and Highscore",()=>{
  const completedAt="2026-08-09T09:00:00.000Z";
  const states={coach:{records:{silicio:{ceo:{completions:[
    {id:"local-pending",dimension:"tecnologia",title:"Pendiente",at:"2020-01-01T00:00:00Z",yokup:{status:"pending"}},
    {id:"local-ok",dimension:"tecnologia",dimensionLabel:"Tecnología",title:"Contratos",application:"Aplicación verificable",at:"2020-01-01T00:00:00Z",yokup:{status:"verified",eventId:"coach-silicio-ceo-1-contratos",completedAt,missionId:"DCL-test"}}
  ]}}}}};
  const silicon=A.collect("ceo","silicio",states), carbon=A.collect("ceo","carbono",states);
  assert.equal(silicon.length,1); assert.equal(carbon.length,0);
  assert.equal(silicon[0].id,"coach-silicio-ceo-1-contratos"); assert.equal(silicon[0].at,completedAt);
  assert.equal(A.leaderboard("silicio",states,"total",Date.parse("2026-08-09T10:00:00Z"))[0].score,1);
});

test("the Coach exposes learner, application, balance, schedule and honest verification copy",()=>{
  assert.match(html,/Tres capacidades/); assert.match(html,/Tecnología → Creatividad → Negocio/);
  assert.match(html,/id="student-select"/); assert.match(html,/id="application"/); assert.match(html,/id="balance-grid"/); assert.match(html,/id="schedule"/);
  assert.match(html,/id="launch-next-capsule"/); assert.match(html,/Lanzar próxima cápsula/); assert.match(html,/Adelantar y registrar en Yokup/);
  assert.match(html,/Solo las verificadas por Yokup suman en Highscore/); assert.match(html,/no es una acreditación académica/);
  assert.match(css,/@media\(max-width:720px\)/); assert.match(js,/admira-academy-coach-v1/); assert.match(js,/\/api\/coach-log/); assert.match(js,/\/api\/coach-launch/);
  assert.match(js,/saveLaunch/); assert.match(js,/C\.nextCapsule/); assert.match(js,/launchNextCapsule/);
});

test("the browser sends only identifiers and the same-origin broker keeps the Yokup secret server-side",()=>{
  assert.match(js,/slotId:base\.slotId/); assert.doesNotMatch(js,/body:JSON\.stringify\(\{[^}]*dimension/);
  assert.match(proxySource,/env\?\.ACADEMY_COACH_TOKEN/);
  assert.match(proxySource,/api\.yokup\.com\/academy\/coach\/completion/);
  assert.match(proxySource,/Authorization:`Bearer \$\{token\}`/);
  assert.match(proxySource,/currentSlot-24/);
  assert.doesNotMatch(proxySource,/ticket\/note/);
  assert.match(launchProxySource,/api\.yokup\.com\/academy\/coach\/launch/);
  assert.match(launchProxySource,/body:JSON\.stringify\(\{audience\}\)/);
  assert.doesNotMatch(launchProxySource,/targetSlotId|dimension|lessonId/);
});

test("the Coach proxy rejects cross-origin, malformed and future completions before touching Yokup",async()=>{
  const proxy=await moduleFromSource(proxySource);
  const cross=await proxy.onRequestPost({request:new Request("https://admira.academy/api/coach-log",{method:"POST",headers:{Origin:"https://example.com","Content-Type":"application/json"},body:"{}"})});
  assert.equal(cross.status,403);
  const invalid=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-log",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"hacker",slotId:1,application:"Aplicación suficientemente larga"})})});
  assert.equal(invalid.status,400);
  const future=Math.floor(Date.now()/C.HOUR)+2;
  const futureResponse=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-log",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"ceo",slotId:future,application:"Aplicación suficientemente larga"})})});
  assert.equal(futureResponse.status,409);
});

test("the manual launch proxy rejects untrusted audiences and lets Yokup choose the counselor",async()=>{
  const proxy=await moduleFromSource(launchProxySource), realFetch=globalThis.fetch;
  const invalid=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-launch",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"otro"})})});
  assert.equal(invalid.status,400);
  globalThis.fetch=async (url,options={})=>{
    assert.equal(String(url),"https://api.yokup.com/academy/coach/launch");
    assert.equal(options.headers.Authorization,"Bearer test-token");
    assert.deepEqual(JSON.parse(options.body),{audience:"silicio"});
    return new Response(JSON.stringify({ok:true,registry:"academy-coach",launchId:"coach-launch",targetSlotId:1,dimension:"creatividad",lessonId:"restriccion",counselor:"cto",capsula:{seat:"cto"},reused:false}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const response=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-launch",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"cto",dimension:"negocio"})})});
    assert.equal(response.status,200); assert.equal((await response.json()).launchId,"coach-launch");
  }finally{ globalThis.fetch=realFetch; }
});

test("the Coach proxy forwards once and returns Yokup's authoritative identity and timestamp",async()=>{
  const proxy=await moduleFromSource(proxySource), realFetch=globalThis.fetch, slotId=Math.floor(Date.now()/C.HOUR);
  const lesson=C.lessonAt(slotId*C.HOUR), eventId=`coach-silicio-ceo-${slotId}-${lesson.id}`;
  let writes=0;
  globalThis.fetch=async (url,options={})=>{
    assert.equal(String(url),"https://api.yokup.com/academy/coach/completion");
    assert.equal(options.headers.Authorization,"Bearer test-token");
    assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),["application","audience","counselor","slotId"]);
    writes+=1; return new Response(JSON.stringify({ok:true,registry:"academy-coach",eventId,completedAt:"2026-08-09T10:15:00.000Z",dimension:lesson.dimension,lessonId:lesson.id,reused:false}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const response=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-log",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"ceo",slotId,application:"Aplicaré el contrato a una integración real y guardaré su prueba."})})});
    const result=await response.json();
    assert.equal(response.status,200); assert.equal(result.eventId,eventId); assert.equal(result.completedAt,"2026-08-09T10:15:00.000Z");
    assert.equal(writes,1); assert.equal(result.registry,"academy-coach");
  }finally{ globalThis.fetch=realFetch; }
});

test("the Coach health check proves the secret-bound server-to-server circuit without creating a lesson",async()=>{
  const proxy=await moduleFromSource(proxySource), realFetch=globalThis.fetch;
  globalThis.fetch=async (url,options={})=>{
    assert.equal(String(url),"https://api.yokup.com/academy/coach/health");
    assert.equal(options.headers.Authorization,"Bearer test-token");
    return new Response(JSON.stringify({ok:true,registry:"academy-coach",checkedAt:"2026-08-09T10:30:00.000Z"}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const response=await proxy.onRequestGet({env:{ACADEMY_COACH_TOKEN:"test-token"}}), result=await response.json();
    assert.equal(response.status,200); assert.equal(result.ok,true); assert.equal(result.registry,"academy-coach");
  }finally{ globalThis.fetch=realFetch; }
});

test("every primary Academy route links to Coach and the signed deployment covers it",()=>{
  for(const page of pages) assert.match(page,/href="\/coach\/"[^>]*>Coach/);
  assert.match(deploy,/coach\/index\.html.+coach\.css.+advisor-core\.js.+coach-core\.js.+coach\.js/);
  assert.match(deploy,/Admira Academy Coach/); assert.match(deploy,/el sello no llegó a coach\/index\.html/);
});
