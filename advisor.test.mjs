import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("./consejeros/index.html",import.meta.url),"utf8");
const js = await readFile(new URL("./advisor.js",import.meta.url),"utf8");
const css = await readFile(new URL("./advisor.css",import.meta.url),"utf8");
const deploy = await readFile(new URL("./deploy.sh",import.meta.url),"utf8");
const coreSource = await readFile(new URL("./advisor-core.js",import.meta.url),"utf8");
const sandbox={module:{exports:{}}}; vm.runInNewContext(coreSource,sandbox); const A=sandbox.module.exports;

test("each of the eight Council seats has a stable public detail identity",()=>{
  assert.equal(JSON.stringify(A.COUNCIL.map(item=>item.id)),JSON.stringify(["ceo","cto","coo","cfo","cco","cdo","cxo","cso"]));
  assert.match(js,/searchParams\.set\("id",agent\.id\)/);
  assert.match(html,/id="council-nav"/);
});

test("carbon and silicon use separate records and never borrow progress",()=>{
  const now=Date.parse("2026-08-08T12:00:00Z");
  const states={
    academy:{records:{ceo:{lessons:{identity:{complete:true,evidence:"firma verificada",updatedAt:"2026-08-08T11:00:00Z"}}}}},
    carbon:{records:{ceo:{activities:[{kind:"visto",title:"Vídeo humano",at:"2026-08-07T12:00:00Z"}]}}}
  };
  assert.equal(A.collect("ceo","silicio",states).length,1);
  assert.equal(A.collect("ceo","carbono",states).length,1);
  assert.equal(A.collect("ceo","carbono",states)[0].title,"Vídeo humano");
  assert.equal(A.summarize(A.collect("ceo","silicio",states),"day",now).read,1);
});

test("day, week, month and total windows are inclusive and independently counted",()=>{
  const now=Date.parse("2026-08-08T12:00:00Z");
  const items=[
    {kind:"leido",title:"día",at:"2026-08-08T11:00:00Z",improvement:true},
    {kind:"visto",title:"semana",at:"2026-08-04T12:00:00Z",improvement:true},
    {kind:"mejora",title:"mes",at:"2026-07-15T12:00:00Z",improvement:true},
    {kind:"mejora",title:"histórico",at:"2026-05-01T12:00:00Z",improvement:true}
  ];
  assert.equal(A.summarize(items,"day",now).total,1);
  assert.equal(A.summarize(items,"week",now).total,2);
  assert.equal(A.summarize(items,"month",now).total,3);
  assert.equal(A.summarize(items,"total",now).total,4);
  assert.equal(JSON.stringify(A.PERIODS.map(item=>item.id)),JSON.stringify(["day","week","month","total"]));
});

test("the page exposes the four summaries, accessible controls and honest empty state",()=>{
  assert.match(html,/aria-label="Tipo de agente"/);
  assert.match(html,/id="period-grid"/);
  assert.match(js,/Sin actividad trazada en este periodo/);
  assert.match(js,/no se copiará ni simulará/);
  assert.match(css,/grid-template-columns:repeat\(4,1fr\)/);
});

test("the signed deployment inlines and stamps the counselor page",()=>{
  assert.match(deploy,/consejeros\/index\.html.+advisor\.css.+academy-training-core\.js.+advisor-core\.js.+advisor\.js/);
  assert.match(deploy,/Admira Academy Consejeros/);
  assert.match(deploy,/el sello no llegó a consejeros\/index\.html/);
  assert.match(deploy,/MacBookPro14\|MacBookProNegro14\) SUF="MBP14"/);
});

test("every counselor detail exposes the complete Formar contract",()=>{
  assert.match(html,/id="form-advisor"[^>]*>Formar a CEO/);
  assert.match(html,/id="advisor-video-url"/);
  assert.match(html,/id="validate-advisor-video"/);
  assert.match(html,/id="import-advisor-video"/);
  assert.match(html,/id="verified-preview"[^>]*hidden/);
  assert.match(html,/href="\/#formacion"/);
  assert.match(css,/\[hidden\]\{display:none!important\}/);
});

test("YouTube validation requires an explicit counselor and duration review",()=>{
  assert.match(js,/canonicalYouTubeUrl\(\$\("#advisor-video-url"\)\.value\)/);
  assert.match(js,/validateVideoDuration\(minutes \* 60,T\.DEFAULT_MAX_DURATION_MINUTES,reviewed\)/);
  assert.match(js,/youtube\.com\/oembed/);
  assert.match(js,/durationConfirmedAt:now/);
  assert.match(html,/He revisado en YouTube que trata de/);
});

test("Pixeria receives canonical formation tags and is checked through its public index",()=>{
  assert.match(js,/method:"POST"/);
  assert.match(js,/buildPixeriaComment\(agent\.id,training\.topic\)/);
  assert.match(js,/PIXERIA_INDEX/);
  assert.match(js,/cache:"no-store"/);
  assert.match(js,/hasRequiredPixeriaTags\(agent\.id,item\)/);
  assert.match(js,/publicVideo && tagged/);
});

test("the preview is unlocked only from the successful public verification branch",()=>{
  const verifiedBranch=js.indexOf("if(publicVideo && tagged)");
  const showCall=js.indexOf("showVerifiedPreview(training.pixeria.item)");
  assert.ok(verifiedBranch >= 0 && showCall > verifiedBranch);
  assert.match(js,/function hidePreview\(\)/);
  assert.doesNotMatch(html,/id="video-metadata"[^>]*>[\s\S]*?<img/);
  assert.match(html,/El previo sólo aparece si el vídeo existe como activo público de Pixeria/);
});
