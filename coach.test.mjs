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
const progressProxySource=await readFile(new URL("./functions/api/coach-progress.js",import.meta.url),"utf8");
const sourceProxySource=await readFile(new URL("./functions/api/coach-source.js",import.meta.url),"utf8");
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

test("the cooldown crossing launches once and keeps manual recovery available",()=>{
  const launch={launchId:"coach-launch-1",targetSlotId:42}, boundary=10_000;
  const early=C.autoLaunchTransition(launch,boundary,boundary-1,"");
  assert.equal(early.due,false); assert.equal(early.key,"");
  const first=C.autoLaunchTransition(launch,boundary,boundary,"");
  assert.equal(first.due,true); assert.equal(first.key,"coach-launch-1:10000");
  const repeated=C.autoLaunchTransition(launch,boundary,boundary+60_000,first.key);
  assert.equal(repeated.due,false); assert.equal(repeated.key,first.key);
  assert.match(js,/launchNextCapsule\(\{automatic:true\}\)/);
  assert.match(js,/El disparo automático falló/);
  assert.match(js,/addEventListener\("click",\(\)=>launchNextCapsule\(\{automatic:false\}\)\)/);
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
  assert.match(html,/id="launch-next-capsule"/); assert.match(html,/Encargar a Smith/); assert.match(html,/Adelantar y registrar en Yokup/);
  assert.match(html,/id="latest-capsule-title"/); assert.match(html,/id="latest-capsule-type"/); assert.match(html,/id="latest-capsule-time"/);
  assert.match(html,/id="agent-progress"/); assert.match(html,/id="agent-progress-steps"/); assert.match(html,/Smith · Grok/);
  assert.match(html,/Smith rastrea YouTube, importa la fuente y condensa el conocimiento en Pixeria/);
  assert.match(html,/Solo las verificadas por Yokup suman en Highscore/); assert.match(html,/no es una acreditación académica/);
  assert.match(css,/@media\(max-width:720px\)/); assert.match(js,/admira-academy-coach-v1/); assert.match(js,/\/api\/coach-log/); assert.match(js,/\/api\/coach-launch/);
  assert.match(js,/saveLaunch/); assert.match(js,/C\.nextCapsule/); assert.match(js,/launchNextCapsule/);
  assert.match(js,/\/api\/coach-progress/); assert.match(js,/pollAgentProgress/); assert.match(js,/setInterval\(pollAgentProgress,2000\)/);
  assert.match(js,/renderLatestCapsule/); assert.match(js,/result\.latest/); assert.match(js,/finalizada/); assert.match(js,/stock\.html\?highlight=/);
  assert.match(js,/requestedAt:new Date\(requestedAt\)\.toISOString\(\)/); assert.match(js,/nextLaunchAt:new Date\(requestedAt\+C\.HOUR\)/); assert.match(js,/button\.disabled=launching \|\| left>0/);
  assert.match(css,/\.agent-progress/); assert.match(css,/\.agent-progress li\.current/);
});

test("the progress proxy only accepts canonical hourly slots and never caches telemetry",async()=>{
  const proxy=await moduleFromSource(progressProxySource), realFetch=globalThis.fetch;
  const invalid=await proxy.onRequestGet({request:new Request("https://admira.academy/api/coach-progress?hourStart=123")});
  assert.equal(invalid.status,400);
  globalThis.fetch=async url=>{
    assert.equal(String(url),"https://api.yokup.com/academy/capsula/smith/progress?hourStart=1786276800000");
    return new Response(JSON.stringify({ok:true,capsula:{hour_start:1786276800000,smith:{status:"running",stage:"transcribing",progress:55}},latest:{title:"Última cápsula",tema:"negocio",smith:{status:"verified",updated_at:1786277900000,capsule_id:"capsule-1"}}}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const response=await proxy.onRequestGet({request:new Request("https://admira.academy/api/coach-progress?hourStart=1786276800000")});
    const body=await response.json(); assert.equal(response.status,200); assert.equal(body.capsula.smith.stage,"transcribing"); assert.equal(body.latest.tema,"negocio"); assert.equal(response.headers.get("Cache-Control"),"no-store");
  }finally{ globalThis.fetch=realFetch; }
});

test("the Coach imports public sites as compact human and machine capsules",()=>{
  assert.match(html,/id="source-import-form"/); assert.match(html,/id="site-source-url"/); assert.match(html,/Crear cápsula/);
  assert.match(html,/Para carbono/); assert.match(html,/Para silicio/); assert.match(html,/Verificada por Yokup/);
  assert.match(js,/\/api\/coach-source/); assert.match(js,/importSiteSource/); assert.match(js,/splitCapsule/); assert.match(js,/loadSources/);
  assert.match(css,/\.source-import/); assert.match(css,/\.source-result\[hidden\]/);
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

test("the site broker derives the training tag and chains Pixeria before Yokup",async()=>{
  const proxy=await moduleFromSource(sourceProxySource), realFetch=globalThis.fetch, calls=[];
  globalThis.fetch=async (url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes("api.admira.store")){
      assert.deepEqual(JSON.parse(options.body),{url:"https://developer.nvidia.com/blog/rl/",audience:"silicio",counselorTag:"stevewozniak"});
      return new Response(JSON.stringify({ok:true,reused:false,sourceUrl:"https://developer.nvidia.com/blog/rl/",summary:{carbono:"c",silicio:"s",aplicacion:"a"},capsule:{id:"capsule-1"},preview:{id:"preview-1"}}),{status:200,headers:{"Content-Type":"application/json"}});
    }
    assert.equal(String(url),"https://api.yokup.com/academy/coach/source");
    assert.equal(options.headers.Authorization,"Bearer test-token");
    assert.deepEqual(JSON.parse(options.body),{audience:"silicio",counselor:"cto",sourceUrl:"https://developer.nvidia.com/blog/rl/",capsuleAssetId:"capsule-1",previewAssetId:"preview-1"});
    return new Response(JSON.stringify({ok:true,reused:false,registry:"academy-coach-source",source:{sourceId:"coach-source-1",capsuleAssetId:"capsule-1",previewAssetId:"preview-1"}}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const response=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"test-token"},request:new Request("https://admira.academy/api/coach-source",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"cto",url:"https://developer.nvidia.com/blog/rl/"})})});
    const result=await response.json(); assert.equal(response.status,200); assert.equal(result.ok,true); assert.equal(calls.length,2);
  }finally{ globalThis.fetch=realFetch; }
});

test("the site broker rejects private or cross-origin requests before import",async()=>{
  const proxy=await moduleFromSource(sourceProxySource);
  const cross=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"x"},request:new Request("https://admira.academy/api/coach-source",{method:"POST",headers:{Origin:"https://evil.invalid","Content-Type":"application/json"},body:"{}"})});
  assert.equal(cross.status,403);
  const privateUrl=await proxy.onRequestPost({env:{ACADEMY_COACH_TOKEN:"x"},request:new Request("https://admira.academy/api/coach-source",{method:"POST",headers:{Origin:"https://admira.academy","Content-Type":"application/json"},body:JSON.stringify({audience:"silicio",counselor:"cto",url:"https://127.0.0.1/admin"})})});
  assert.equal(privateUrl.status,400);
});

test("every primary Academy route links to Coach and the signed deployment covers it",()=>{
  for(const page of pages) assert.match(page,/href="\/coach\/"[^>]*>Coach/);
  assert.match(deploy,/coach\/index\.html.+coach\.css.+advisor-core\.js.+coach-core\.js.+coach\.js/);
  assert.match(deploy,/Admira Academy Coach/); assert.match(deploy,/el sello no llegó a coach\/index\.html/);
});
