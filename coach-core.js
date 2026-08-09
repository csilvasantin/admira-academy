(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports) module.exports=api;
  root.AcademyCoachCore=api;
})(typeof globalThis!=="undefined" ? globalThis : this,function(){
  "use strict";

  const HOUR=60*60*1000;
  // 09-08-2026 01:00 en Madrid: Tecnología. Desde aquí la secuencia avanza
  // por horas físicas, sin duplicar ni perder slots durante cambios de horario.
  const ANCHOR=Date.UTC(2026,7,8,23,0,0,0);
  const DIMENSIONS=[
    {
      id:"tecnologia",label:"Tecnología",number:"01",tone:"#65d7ff",
      promise:"Hacer posible lo que imaginamos y mantenerlo funcionando.",
      lessons:[
        {id:"contratos-claros",title:"Contratos antes que código",principle:"Una integración fiable empieza definiendo entradas, salidas, estados y errores antes de implementar.",practice:"Escribe el contrato mínimo de una pieza real: qué recibe, qué devuelve y cómo demuestra que terminó."},
        {id:"observabilidad",title:"Si no se observa, no existe",principle:"Un sistema que no deja evidencia obliga a adivinar. Métricas, estados y pruebas convierten comportamiento en conocimiento.",practice:"Elige un proceso opaco y añade una señal verificable de inicio, progreso, éxito y fallo."},
        {id:"automatizacion",title:"Automatiza la repetición",principle:"La tecnología multiplica cuando retira pasos mecánicos sin ocultar el control ni la responsabilidad.",practice:"Detecta una acción repetida y define el disparador, la protección y la prueba de su automatización."},
        {id:"simplicidad",title:"Menos piezas, más sistema",principle:"Cada dependencia añade una forma de fallar. La arquitectura madura reduce conexiones sin perder capacidad.",practice:"Dibuja un flujo actual y elimina una pieza, un salto o un formato sin perder la evidencia final."}
      ]
    },
    {
      id:"creatividad",label:"Creatividad",number:"02",tone:"#ff679b",
      promise:"Convertir una posibilidad en una experiencia que merezca recordarse.",
      lessons:[
        {id:"restriccion",title:"La restricción abre el juego",principle:"Un límite concreto concentra la imaginación y evita que una idea se disuelva en posibilidades infinitas.",practice:"Reformula un reto con una restricción fértil: un minuto, una pantalla, una emoción o una sola acción."},
        {id:"divergir-converger",title:"Primero diverge, después decide",principle:"Crear y juzgar a la vez empobrece ambas tareas. Genera alternativas sin filtro y elige después con criterio.",practice:"Produce tres enfoques claramente distintos y selecciona uno explicando qué criterio lo hace más fuerte."},
        {id:"narrativa",title:"Toda solución cuenta una historia",principle:"La gente entiende cambios cuando reconoce quién actúa, qué desea, qué obstáculo enfrenta y qué mejora.",practice:"Resume una solución como protagonista, deseo, fricción y transformación en cuatro frases."},
        {id:"prototipo",title:"Haz visible la idea pronto",principle:"Un prototipo pequeño provoca mejor conversación que una intención perfecta pero invisible.",practice:"Define la versión más pequeña que permita a otra persona experimentar y criticar la idea hoy."}
      ]
    },
    {
      id:"negocio",label:"Negocio",number:"03",tone:"#ffd76a",
      promise:"Transformar valor útil en una actividad sostenible y repetible.",
      lessons:[
        {id:"problema-real",title:"Empieza por el problema real",principle:"Una solución brillante fracasa si resuelve una molestia irrelevante o de alguien que no decide.",practice:"Nombra usuario, problema, coste actual y evidencia de que merece ser resuelto ahora."},
        {id:"valor-captura",title:"Crear valor no basta: hay que capturarlo",principle:"El negocio equilibra el beneficio que recibe el cliente con el retorno que sostiene la solución.",practice:"Escribe qué gana el cliente, qué entrega a cambio y qué coste debemos sostener para repetirlo."},
        {id:"prioridad",title:"Priorizar es renunciar con criterio",principle:"Decir sí a todo reparte recursos hasta que nada alcanza calidad ni mercado.",practice:"Ordena tres oportunidades por impacto, evidencia, esfuerzo y reversibilidad; descarta una explícitamente."},
        {id:"validacion",title:"La evidencia precede a la escala",principle:"Escalar una hipótesis solo multiplica su incertidumbre. Primero se prueba la parte que podría invalidarlo todo.",practice:"Formula la hipótesis más arriesgada y el experimento más barato que podría demostrar que es falsa."}
      ]
    }
  ];

  function pad(value){ return String(value).padStart(2,"0"); }
  function validDate(value){ const date=value instanceof Date ? new Date(value) : new Date(value); return Number.isFinite(date.getTime()) ? date : new Date(); }
  function epochSlot(value){ return Math.floor(validDate(value).getTime()/HOUR); }
  function cycleOffset(value){ return Math.floor((validDate(value).getTime()-ANCHOR)/HOUR); }
  function dimensionAt(value){ const offset=cycleOffset(value), index=((offset%3)+3)%3; return DIMENSIONS[index]; }
  function lessonAt(value){
    const date=validDate(value), dimension=dimensionAt(date), cycle=Math.floor(cycleOffset(date)/3);
    const lesson=dimension.lessons[((cycle%dimension.lessons.length)+dimension.lessons.length)%dimension.lessons.length];
    return {...lesson,dimension:dimension.id,dimensionLabel:dimension.label,number:dimension.number,tone:dimension.tone,promise:dimension.promise};
  }
  function slotAt(value){ return epochSlot(value); }
  function slotLabel(value){ const date=validDate(value); return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}`; }
  function nextBoundary(value){ return new Date((epochSlot(value)+1)*HOUR); }
  function countdown(value){
    const date=validDate(value), left=Math.max(0,nextBoundary(date).getTime()-date.getTime());
    const minutes=Math.floor(left/60000), seconds=Math.floor((left%60000)/1000);
    return {ms:left,label:`${pad(minutes)}:${pad(seconds)}`};
  }
  function nextCapsule(value){
    const scheduledAt=nextBoundary(value), lesson=lessonAt(scheduledAt);
    return {...lesson,slot:slotAt(scheduledAt),slotLabel:slotLabel(scheduledAt),scheduledAt};
  }
  function schedule(value,count=3){
    const start=validDate(value); start.setMinutes(0,0,0);
    return Array.from({length:Math.max(1,Math.min(6,Number(count)||3))},(_item,index)=>{
      const date=new Date(start.getTime()+index*HOUR), lesson=lessonAt(date);
      return {...lesson,slot:slotAt(date),slotLabel:slotLabel(date),hour:`${pad(date.getHours())}:00`,current:index===0};
    });
  }
  function completionId(audience,agentId,value,lessonId){ return `coach-${audience}-${agentId}-${slotAt(value)}-${lessonId}`; }
  function balance(completions){
    const counts=Object.fromEntries(DIMENSIONS.map(item=>[item.id,0]));
    for(const item of Array.isArray(completions) ? completions : []){
      if(item?.yokup?.status==="verified" && Object.prototype.hasOwnProperty.call(counts,item.dimension)) counts[item.dimension]+=1;
    }
    const values=Object.values(counts), total=values.reduce((sum,value)=>sum+value,0), spread=Math.max(...values)-Math.min(...values);
    return {counts,total,spread,balanced:total>=3 && spread<=1,label:total===0 ? "Aún sin medir" : spread<=1 ? "Equilibrio activo" : "Dimensión por reforzar"};
  }

  return {HOUR,ANCHOR,DIMENSIONS,epochSlot,dimensionAt,lessonAt,slotAt,slotLabel,nextBoundary,countdown,nextCapsule,schedule,completionId,balance};
});
