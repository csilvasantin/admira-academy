import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("./plataforma/index.html",import.meta.url),"utf8");
const css = await readFile(new URL("./platform.css",import.meta.url),"utf8");
const js = await readFile(new URL("./platform.js",import.meta.url),"utf8");
const coreSource = await readFile(new URL("./platform-core.js",import.meta.url),"utf8");
const deploy = await readFile(new URL("./deploy.sh",import.meta.url),"utf8");
const sandbox={module:{exports:{}},URL,Date,Math};
vm.runInNewContext(coreSource,sandbox);
const core=sandbox.module.exports;

test("the platform keeps the eight canonical students",()=>{
  assert.deepEqual(core.STUDENTS.map(x=>x.role).join(","),"CEO,CTO,COO,CFO,CCO,CDO,CXO,CSO");
  assert.match(html,/Estudiante o consejero/);
});

test("timer records start, pause, resume and finish as measured time",()=>{
  const timer=core.createTimer();
  core.startTimer(timer,1000); core.pauseTimer(timer,61000); core.startTimer(timer,121000); core.finishTimer(timer,151000);
  assert.equal(timer.elapsedMs,90000); assert.equal(timer.status,"medido");
  assert.equal(timer.startedAt,"1970-01-01T00:00:01.000Z"); assert.equal(timer.endedAt,"1970-01-01T00:02:31.000Z");
  assert.equal(timer.events.map(x=>x.type).join(","),"iniciado,pausado,reanudado,pausado,finalizado");
});

test("a running timer blocks closure until it is stopped",()=>{
  const timer=core.createTimer(); core.startTimer(timer,1000);
  const result=core.validateDraft({studentId:"cto",workType:"tarea",title:"Revisar arquitectura",workStatus:"completado",evidence:"Prueba observable de arquitectura terminada",points:""},timer);
  assert.equal(result.ok,false); assert.match(result.errors.join(" "),/Pausa o finaliza/);
});

test("manual duration is declared, never represented as verified",()=>{
  const time=core.manualTime(45,100000);
  assert.equal(time.origin,"declarado manualmente"); assert.equal(time.status,"declarado"); assert.equal(time.elapsedMs,2700000); assert.equal(time.startedAt,null);
  assert.match(html,/No se inventan horas de inicio/);
});

test("an incomplete closure reports missing time and evidence",()=>{
  const result=core.buildClosure({studentId:"cfo",workType:"misión",title:"Analizar retorno",context:"Formación Academy",workStatus:"parcial",evidence:"corto",points:""},core.createTimer(),1000);
  assert.equal(result.ok,false); assert.match(result.errors.join(" "),/evidencia concreta/); assert.match(result.errors.join(" "),/tiempo medido o declarado/);
});

test("a valid closure traces person, work, time, evidence and unverified points",()=>{
  const time=core.manualTime(30,100000);
  const result=core.buildClosure({studentId:"cfo",workType:"objetivo",title:"Evaluar retorno del proyecto",context:"Formación financiera",workStatus:"completado",evidence:"Modelo revisado con supuestos y resultado observable",points:"12"},time,200000,()=>"closure-test");
  assert.equal(result.ok,true); const closure=result.closure;
  assert.equal(closure.student.role,"CFO"); assert.equal(closure.work.type,"objetivo"); assert.equal(closure.time.status,"declarado");
  assert.equal(closure.points.value,12); assert.equal(closure.points.status,"pendiente de validación"); assert.equal(closure.sync.status,"pendiente");
});

test("points and Yokup synchronization are explicitly non-authoritative",()=>{
  assert.match(html,/Academy no escribe ni modifica Highscore/);
  assert.match(html,/Pendiente · sin escritura/);
  assert.match(js,/Sincronización Yokup pendiente/);
  assert.doesNotMatch(js,/fetch\([^)]*highscore/i);
});

test("the time platform uses the same AdmiraNeXT tool shell",()=>{
  assert.match(html,/<summary>Opciones<\/summary>/);
  assert.match(html,/<summary>Avanzada<\/summary>/);
  assert.match(html,/<summary>Modo avanzado/);
  assert.match(html,/id="student-grid"[\s\S]*id="closure-form"/);
  assert.match(css,/grid-template-columns:180px minmax\(0,1fr\) 218px/);
  assert.match(css,/\.advanced-dock\{grid-column:1\/-1/);
});

test("the platform persists real local state and renders history",()=>{
  assert.match(js,/localStorage\.getItem\(STORAGE_KEY\)/); assert.match(js,/localStorage\.setItem\(STORAGE_KEY/);
  assert.match(js,/renderHistory/); assert.match(html,/Historial de cierres/);
});

test("navigation integrates the platform with Academy and training",async()=>{
  assert.match(html,/href="\/">Academia/); assert.match(html,/href="\/#formacion">Formación/);
  const academy=await readFile(new URL("./index.html",import.meta.url),"utf8"); assert.match(academy,/href="\/plataforma\/">Plataforma/);
});

test("mobile layout and signed dual-project deployment cover the platform",()=>{
  assert.match(css,/@media\(max-width:700px\)/); assert.match(css,/\.student-grid\{grid-template-columns:1fr 1fr\}/);
  assert.match(deploy,/plataforma\/index\.html/); assert.match(deploy,/no se encontraron los anclajes de la plataforma/); assert.match(deploy,/--project-name bits-and-atoms/);
});
