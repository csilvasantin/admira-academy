import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const html=await readFile(new URL("./highscore/index.html",import.meta.url),"utf8");
const css=await readFile(new URL("./highscore.css",import.meta.url),"utf8");
const js=await readFile(new URL("./highscore.js",import.meta.url),"utf8");
const coreSource=await readFile(new URL("./advisor-core.js",import.meta.url),"utf8");
const deploy=await readFile(new URL("./deploy.sh",import.meta.url),"utf8");
const redirects=await readFile(new URL("./_redirects",import.meta.url),"utf8");
const sandbox={module:{exports:{}}}; vm.runInNewContext(coreSource,sandbox); const A=sandbox.module.exports;

test("the highscore route exposes eight counselors and the four canonical periods",()=>{
  assert.match(html,/Ranking del Consejo/);
  assert.match(html,/id="ranking-body"/);
  assert.match(html,/data-audience="silicio"/);
  assert.match(html,/data-audience="carbono"/);
  assert.match(js,/A\.PERIODS\.map/);
  assert.match(js,/A\.leaderboard/);
  assert.equal(A.COUNCIL.length,8);
  assert.equal(JSON.stringify(A.PERIODS.map(item=>item.id)),JSON.stringify(["day","week","month","total"]));
});

test("leaderboard ranks real activity without mixing carbon and silicon",()=>{
  const now=Date.parse("2026-08-08T20:00:00Z");
  const states={
    academy:{records:{ceo:{lessons:{identity:{complete:true,updatedAt:"2026-08-08T19:00:00Z"}}}},trainings:{cto:{transitions:[{stage:"pixeria",status:"verified",detail:"ok",at:"2026-08-08T19:30:00Z"}],video:{url:"https://youtu.be/ABCDEF1",title:"Woz",verifiedAt:"2026-08-08T19:20:00Z"}}}},
    carbon:{records:{cco:{activities:[{kind:"visto",title:"Disney",at:"2026-08-08T19:45:00Z"}]}}}
  };
  const silicon=A.leaderboard("silicio",states,"day",now);
  assert.equal(silicon.length,8);
  assert.equal(silicon[0].id,"ceo"); assert.equal(silicon[0].score,1); assert.equal(silicon[0].rank,1);
  assert.equal(silicon.find(row=>row.id==="cto").score,1,"los pasos técnicos no suman como estudio");
  assert.equal(silicon.find(row=>row.id==="cco").score,0);
  const carbon=A.leaderboard("carbono",states,"day",now);
  assert.equal(carbon[0].id,"cco"); assert.equal(carbon[0].score,1);
  assert.equal(carbon.find(row=>row.id==="cto").score,0);
});

test("zero activity remains visible and unranked instead of being simulated",()=>{
  const rows=A.leaderboard("silicio",{},"day",Date.now());
  assert.equal(rows.length,8);
  assert.ok(rows.every(row=>row.score===0 && row.rank===null));
  assert.match(html,/Cero significa que este navegador no conserva actividad/);
  assert.match(html,/no inventa una clasificación global/);
  assert.match(js,/localStorage\.getItem\("admira-academy-v1-progress"\)/);
});

test("future activity is excluded from every period",()=>{
  const now=Date.parse("2026-08-08T20:00:00Z");
  const items=[{at:"2026-08-08T19:59:00Z"},{at:"2026-08-08T20:01:00Z"}];
  assert.equal(A.within(items,"day",now).length,1);
  assert.equal(A.within(items,"total",now).length,1);
});

test("ranking remains usable and links every row back to its counselor detail",()=>{
  assert.match(js,/\/consejeros\/\?id=\$\{row\.id\}&audiencia=\$\{audience\}&periodo=\$\{selectedPeriod\}/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(html,/aria-label="Periodo del ranking"/);
  assert.match(html,/<table>/);
});

test("the signed deployment inlines and stamps the highscore route",()=>{
  assert.match(deploy,/\$TMP\/highscore\/index\.html/);
  assert.match(deploy,/highscore\.css/);
  assert.match(deploy,/highscore\.js/);
  assert.match(deploy,/Admira Academy Highscore/);
  assert.match(deploy,/el sello no llegó a highscore\/index\.html/);
  assert.match(redirects,/\/highlights \/highscore\/ 301/);
});
