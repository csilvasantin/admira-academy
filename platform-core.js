(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  root.AcademyPlatformCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const STUDENTS = [
    {id:"ceo",role:"CEO",area:"Visión, producto y dirección",alias:"Steve Jobs"},
    {id:"cto",role:"CTO",area:"Tecnología y arquitectura",alias:"Steve Wozniak"},
    {id:"coo",role:"COO",area:"Operaciones y entrega",alias:"Tim Cook"},
    {id:"cfo",role:"CFO",area:"Finanzas y sostenibilidad",alias:"Warren Buffett"},
    {id:"cco",role:"CCO",area:"Creatividad y marca",alias:"Walt Disney"},
    {id:"cdo",role:"CDO",area:"Diseño y claridad",alias:"Dieter Rams"},
    {id:"cxo",role:"CXO",area:"Experiencia de cliente",alias:"Howard Schultz"},
    {id:"cso",role:"CSO",area:"Estrategia narrativa",alias:"George Lucas"}
  ];
  const WORK_TYPES = ["tarea","misión","objetivo"];
  const STATUS = ["completado","parcial","bloqueado"];

  const asMs = value => Math.max(0, Number(value) || 0);
  const iso = value => new Date(value).toISOString();

  function student(id){ return STUDENTS.find(item => item.id === id) || null; }
  function createTimer(){ return {origin:"cronómetro",status:"incompleto",startedAt:null,endedAt:null,runningSince:null,elapsedMs:0,events:[]}; }
  function timerElapsed(timer, now=Date.now()){
    return asMs(timer?.elapsedMs) + (timer?.runningSince ? Math.max(0, Number(now) - Number(timer.runningSince)) : 0);
  }
  function startTimer(timer, now=Date.now()){
    if(timer.endedAt) return timer;
    if(!timer.startedAt) timer.startedAt = iso(now);
    if(!timer.runningSince){ timer.runningSince = Number(now); timer.status = "medido"; timer.events.push({type:timer.elapsedMs ? "reanudado" : "iniciado",at:iso(now)}); }
    return timer;
  }
  function pauseTimer(timer, now=Date.now()){
    if(timer.runningSince){ timer.elapsedMs = timerElapsed(timer, now); timer.runningSince = null; timer.status = timer.elapsedMs > 0 ? "medido" : "incompleto"; timer.events.push({type:"pausado",at:iso(now),elapsedMs:timer.elapsedMs}); }
    return timer;
  }
  function finishTimer(timer, now=Date.now()){
    pauseTimer(timer, now);
    if(timer.elapsedMs > 0){ timer.endedAt = iso(now); timer.status = "medido"; timer.events.push({type:"finalizado",at:timer.endedAt,elapsedMs:timer.elapsedMs}); }
    return timer;
  }
  function manualTime(minutes, now=Date.now()){
    const parsed = Number(minutes);
    return {origin:"declarado manualmente",status:Number.isFinite(parsed) && parsed > 0 ? "declarado" : "incompleto",startedAt:null,endedAt:Number.isFinite(parsed) && parsed > 0 ? iso(now) : null,runningSince:null,elapsedMs:Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 60000) : 0,events:Number.isFinite(parsed) && parsed > 0 ? [{type:"duración declarada",at:iso(now),elapsedMs:Math.round(parsed * 60000)}] : []};
  }
  function formatDuration(ms){
    const totalSeconds = Math.floor(asMs(ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if(hours) return `${hours} h ${minutes} min`;
    if(minutes) return `${minutes} min ${seconds} s`;
    return `${seconds} s`;
  }
  function validateDraft(draft, timer){
    const errors = [];
    if(!student(draft.studentId)) errors.push("Selecciona un estudiante válido.");
    if(!WORK_TYPES.includes(draft.workType)) errors.push("Selecciona tarea, misión u objetivo.");
    if(String(draft.title || "").trim().length < 8) errors.push("Describe el trabajo con al menos 8 caracteres.");
    if(!STATUS.includes(draft.workStatus)) errors.push("Selecciona el estado del cierre.");
    if(String(draft.evidence || "").trim().length < 20) errors.push("Añade evidencia concreta de al menos 20 caracteres.");
    if(timer?.runningSince) errors.push("Pausa o finaliza el cronómetro antes de cerrar.");
    if(!timer || timerElapsed(timer) <= 0 || !["medido","declarado"].includes(timer.status)) errors.push("Registra un tiempo medido o declarado antes de cerrar.");
    const points = String(draft.points ?? "").trim();
    if(points && (!Number.isFinite(Number(points)) || Number(points) < 0)) errors.push("Los puntos deben ser un número igual o mayor que cero.");
    return {ok:errors.length === 0,errors};
  }
  function buildClosure(draft, timer, now=Date.now(), idFactory=()=>`closure-${now}-${Math.random().toString(36).slice(2,8)}`){
    const validity = validateDraft(draft, timer);
    if(!validity.ok) return {ok:false,errors:validity.errors};
    const person = student(draft.studentId);
    const pointsText = String(draft.points ?? "").trim();
    const closure = {
      id:idFactory(), student:{id:person.id,role:person.role,area:person.area,alias:person.alias},
      work:{type:draft.workType,title:String(draft.title).trim(),context:String(draft.context || "Formación Academy").trim() || "Formación Academy",status:draft.workStatus},
      time:{origin:timer.origin,status:timer.status,startedAt:timer.startedAt,endedAt:timer.endedAt || iso(now),durationMs:timerElapsed(timer),events:timer.events.slice()},
      evidence:String(draft.evidence).trim(),
      points:pointsText ? {value:Number(pointsText),status:"pendiente de validación",source:"declarado en Academy; no verificado en Yokup"} : {value:null,status:"sin puntos declarados",source:"sin dato"},
      sync:{status:"pendiente",detail:"Academy no tiene una integración de escritura verificada con Yokup."},
      closedAt:iso(now)
    };
    return {ok:true,closure};
  }
  function summary(closure){
    return `${closure.student.role} · ${closure.work.type} · ${closure.work.status} · ${formatDuration(closure.time.durationMs)} (${closure.time.origin})`;
  }

  return {STUDENTS,WORK_TYPES,STATUS,student,createTimer,timerElapsed,startTimer,pauseTimer,finishTimer,manualTime,formatDuration,validateDraft,buildClosure,summary};
});
