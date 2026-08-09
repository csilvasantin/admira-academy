import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./academy.css", import.meta.url), "utf8");
const js = await readFile(new URL("./academy.js", import.meta.url), "utf8");
const coreSource = await readFile(new URL("./academy-training-core.js", import.meta.url), "utf8");
const deploy = await readFile(new URL("./deploy.sh", import.meta.url), "utf8");
const sandbox = { module:{exports:{}}, URL, Date };
vm.runInNewContext(coreSource, sandbox);
const core = sandbox.module.exports;

test("the primary navigation enters the academy", () => {
  assert.match(html, /class="nav-cta" href="#academia">Entrar en la academia/);
  assert.doesNotMatch(html, /class="nav-cta"[^>]*>Pregunta al avatar/);
});

test("the catalog contains exactly the eight Council students and a training action", () => {
  assert.deepEqual(Object.keys(core.ROLES), ["ceo","cto","coo","cfo","cco","cdo","cxo","cso"]);
  for (const role of ["CEO","CTO","COO","CFO","CCO","CDO","CXO","CSO"]) assert.match(js, new RegExp(`role:\"${role}\"`));
  assert.match(js, /data-training-agent/);
  assert.match(js, /\/consejeros\/\?id=\$\{agent\.id\}/);
  assert.match(js, />Formación\$\{/);
});

test("manual topics are checked against the role and irrelevant topics need an explicit review", () => {
  assert.equal(core.validateTopic("cfo", "Flujo de caja y riesgo de inversión").relevant, true);
  assert.equal(core.validateTopic("cfo", "Tipografía experimental para una portada").relevant, false);
  assert.match(html, /topic-override/);
  assert.match(html, /Continuar bajo revisión/);
});

test("proposed topics are always role-specific", () => {
  assert.match(core.proposeTopic("cto", () => 0), /Arquitectura/);
  assert.match(core.proposeTopic("cfo", () => 0), /caja/i);
  assert.match(core.proposeTopic("cdo", () => 0), /Diseño/);
  for (const id of Object.keys(core.ROLES)) assert.equal(core.validateTopic(id, core.proposeTopic(id, () => 0)).relevant, true);
});

test("every Council role has an explicit useful default topic", () => {
  assert.match(core.defaultTopic("cto"), /tecnología y arquitectura/i);
  assert.match(core.defaultTopic("cfo"), /finanzas/i);
  assert.match(core.defaultTopic("coo"), /operaciones/i);
  assert.match(core.defaultTopic("ceo"), /dirección, producto/i);
  for (const id of Object.keys(core.ROLES)) {
    assert.ok(core.defaultTopic(id).length > 20);
    assert.equal(core.validateTopic(id, core.defaultTopic(id)).relevant, true);
  }
  assert.match(js, /topicDrafts/);
  assert.match(js, /addEventListener\("input", \(\) => saveTopicDraft\("manual"\)\)/);
});

test("YouTube discovery is public and selection must be a real reviewable URL", () => {
  const search = core.youtubeSearchUrl("cto", "Arquitectura segura");
  assert.match(search, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  assert.equal(core.canonicalYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(core.canonicalYouTubeUrl("https://example.com/falso"), "");
  assert.match(js, /youtube\.com\/oembed/);
  assert.match(js, /const requestedUrl = \$\("#video-url"\)\.value;[\s\S]*canonicalYouTubeUrl\(requestedUrl\)/);
  assert.match(js, /no continuar.+resultado inventado/i);
  assert.match(html, />Buscar información ↗</);
  assert.match(js, /"búsqueda abierta · revisión necesaria"/);
});

test("training starts visibly with a five-minute selection limit and continuous feedback", () => {
  assert.match(html, /id="start-training"[^>]*>Empezar formación</);
  assert.match(html, /id="max-source-duration"[^>]*min="1"[^>]*max="30"[^>]*value="5"/);
  assert.match(html, /id="training-feedback"[^>]*aria-live="polite"/);
  assert.match(js, /"preparing"[\s\S]*"searching"[\s\S]*"ready_for_review"/);
  const training = core.createTraining("cto", core.defaultTopic("cto"), 5, () => "2026-08-08T12:00:00.000Z");
  assert.equal(training.maxDurationMinutes, 5);
  assert.match(training.search.query, /tecnología y arquitectura.+YouTube Shorts/i);
});

test("source duration must be explicitly confirmed and within the maximum", () => {
  assert.equal(core.validateMaxDuration(5).valid, true);
  assert.equal(core.validateMaxDuration(5).minutes, 5);
  assert.equal(core.validateMaxDuration(0).valid, false);
  assert.equal(core.validateMaxDuration(31).valid, false);
  assert.equal(core.validateVideoDuration(null, 5, false).status, "pending");
  assert.equal(core.validateVideoDuration(300, 5, true).status, "compatible");
  assert.equal(core.validateVideoDuration(301, 5, true).status, "exceeds_limit");
  assert.match(html, /id="duration-confirmed"/);
  assert.match(js, /if\(!sourceReady\(training\)\)/);
  assert.match(js, /oEmbed no publica la duración/);
});

test("search, no-result, duration and delivery feedback remain in persisted training state", () => {
  assert.match(js, /training\.search = \{ status, query/);
  assert.match(js, /"no_results"/);
  assert.match(js, /durationStatus/);
  assert.match(js, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(js, /Bloqueada hasta confirmar una duración real y compatible/);
});

test("the AdmiraNeXT shell prioritizes the tool and exposes collapsible controls", () => {
  assert.match(html, /class="admira-workspace"/);
  assert.match(html, /<summary>Opciones<\/summary>/);
  assert.match(html, /<summary>Avanzada<\/summary>/);
  assert.match(html, /<summary>Modo avanzado/);
  assert.match(css, /grid-template-columns:176px minmax\(0,1fr\) 210px/);
  assert.match(css, /\.tool-rail:not\(\[open\]\)/);
});

test("Pixeria requires consent and stays pending unless its public index verifies the item", () => {
  assert.match(html, /Autorizo importar este vídeo seleccionado a Pixeria/);
  assert.match(js, /if\(!\$\("#pixeria-consent"\)\.checked\)/);
  assert.match(js, /Solicitud aceptada, pero aún no verificable en el índice público/);
  assert.equal(core.hasRequiredPixeriaTags("cto", {tags:["formacion","stevewozniak"]}), true);
  assert.equal(core.hasRequiredPixeriaTags("cto", {tags:["video"]}), false);
});

test("the learning script is concise, original, attributed and does not claim a transcript", () => {
  const script = core.buildScript("cfo", "Flujo de caja", {url:"https://www.youtube.com/watch?v=abc",title:"Finanzas",author:"Autora"});
  assert.match(script, /Fuente para revisar: Finanzas — Autora/);
  assert.match(script, /estructura original/);
  assert.match(script, /no es una transcripción/);
  assert.ok(script.length < 1800);
});

test("delivery is a verifiable pending queue and the Live handoff sends only the source", () => {
  const url = core.buildCouncilHandoffUrl("ceo", "https://www.youtube.com/watch?v=abc");
  assert.match(url, /^https:\/\/www\.admira\.live\/council-scumm\.html\?/);
  assert.match(url, /train=https%3A%2F%2Fwww\.youtube\.com/);
  assert.match(url, /target=Steve\+Jobs/);
  assert.match(html, /paquete completo sigue pendiente|paquete completo con guion/i);
  assert.match(js, /learned:false/);
  assert.match(js, /pointsAwarded:false/);
});

test("each training keeps source, integration states, delivery and timestamped transitions", () => {
  const now = () => "2026-08-08T12:00:00.000Z";
  const training = core.createTraining("cfo", "Flujo de caja", now);
  core.transition(training, "vídeo", "verificado", "fuente real", now);
  assert.equal(training.source, "YouTube");
  assert.equal(training.pixeria.status, "pending");
  assert.equal(training.script.status, "pending");
  assert.equal(training.delivery.status, "pending");
  assert.equal(JSON.stringify(training.transitions[0]), JSON.stringify({stage:"vídeo",status:"verificado",detail:"fuente real",at:"2026-08-08T12:00:00.000Z"}));
});

test("v1 progress, carbon separation and the secondary avatar remain intact", () => {
  assert.match(js, /text\.length < 24/);
  assert.match(js, /if\(!confirmed\)/);
  assert.match(html, /Agentes de carbono — detalle separado/);
  assert.match(html, /audiencia=carbono/);
  assert.match(js, /\/consejeros\/\?id=\$\{state\.selected\}&audiencia=carbono/);
  assert.match(html, /href="https:\/\/digitalavatar\.ai\/"/);
});

test("responsive safeguards include the training workspace", () => {
  assert.match(css, /@media \(max-width:700px\)/);
  assert.match(css, /\.training-steps\{grid-template-columns:1fr 1fr\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("the signed release inlines core, application and CSS assets", () => {
  assert.match(deploy, /academy-training-core\.js/);
  assert.match(deploy, /html\.replace\(core_tag/);
  assert.match(deploy, /academy-capsula\.js/);
  assert.match(deploy, /html\.replace\(capsule_tag/);
  assert.match(deploy, /html\.replace\(css_tag/);
  assert.match(deploy, /DOMContentLoaded/);
  assert.match(deploy, /--project-name bits-and-atoms/);
  assert.match(deploy, /no se encontraron los anclajes CSS\/JS/);
});
