import test from "node:test";
import assert from "node:assert/strict";
import { eligibleCandidates, findCapsule, findVideo, hasTags, parseSmithEvents, youtubeId } from "./smith-capsule.mjs";
import { readFile } from "node:fs/promises";

const launchRunner=await readFile(new URL("./run-smith-capsule.sh",import.meta.url),"utf8");

test("normaliza las variantes de URL de YouTube",()=>{
  assert.equal(youtubeId("https://youtu.be/TPBW7of4mkQ"),"TPBW7of4mkQ");
  assert.equal(youtubeId("https://www.youtube.com/shorts/TPBW7of4mkQ"),"TPBW7of4mkQ");
  assert.equal(youtubeId("https://www.youtube.com/watch?v=TPBW7of4mkQ&t=3"),"TPBW7of4mkQ");
});

test("Smith sólo puede elegir vídeos de 30 segundos a 5 minutos con transcripción",()=>{
  const items=[
    {id:"a",webpage_url:"https://youtu.be/TPBW7of4mkQ",duration:29,automatic_captions:{en:[]}},
    {id:"b",webpage_url:"https://youtu.be/abcdefghijk",duration:300,title:"válido",automatic_captions:{"en-orig":[]}},
    {id:"c",webpage_url:"https://youtu.be/lmnopqrstuv",duration:301,subtitles:{es:[]}},
    {id:"d",webpage_url:"https://youtu.be/zzzzzzzzzzz",duration:180,title:"sin texto"}
  ];
  assert.deepEqual(eligibleCandidates(items).map(item=>item.videoId),["abcdefghijk"]);
  assert.equal(eligibleCandidates(items)[0].transcriptLanguage,"en-orig");
});

test("extrae únicamente el último texto JSON del CLI de Smith",()=>{
  const output=[JSON.stringify({type:"step_start"}),JSON.stringify({type:"text",part:{text:'{"query":"Steve Jobs product"}'}})].join("\n");
  assert.deepEqual(parseSmithEvents(output),{query:"Steve Jobs product"});
});

test("deduplica por id de YouTube y enlaza cápsula con vídeo",()=>{
  const video={id:"video-1",type:"video",prompt:"https://youtu.be/TPBW7of4mkQ",tags:["formacion","stevewozniak"]};
  const capsule={id:"capsule-1",type:"capsula",externalRef:"video-1",tags:["formacion","stevewozniak"]};
  assert.equal(findVideo([video],"https://www.youtube.com/watch?v=TPBW7of4mkQ"),video);
  assert.equal(findCapsule([capsule],"video-1","stevewozniak"),capsule);
  assert.equal(hasTags(capsule,["formacion","stevewozniak"]),true);
});

test("el proceso libera el lock al apagarse",()=>{
  assert.match(launchRunner,/trap 'rmdir "\$LOCK_DIR"/);
  assert.doesNotMatch(launchRunner,/exec \/usr\/bin\/env node/);
});
