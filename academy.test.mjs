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

test("YouTube discovery is public and selection must be a real reviewable URL", () => {
  const search = core.youtubeSearchUrl("cto", "Arquitectura segura");
  assert.match(search, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  assert.equal(core.canonicalYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(core.canonicalYouTubeUrl("https://example.com/falso"), "");
  assert.match(js, /youtube\.com\/oembed/);
  assert.match(js, /const requestedUrl = \$\("#video-url"\)\.value;[\s\S]*canonicalYouTubeUrl\(requestedUrl\)/);
  assert.match(js, /no continuar.+resultado inventado/i);
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
  assert.match(html, /Agentes de carbono — próximamente/);
  assert.match(js, /fase futura, sin progreso simulado/);
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
  assert.match(deploy, /html\.replace\(css_tag/);
  assert.match(deploy, /DOMContentLoaded/);
  assert.match(deploy, /--project-name bits-and-atoms/);
  assert.match(deploy, /no se encontraron los anclajes CSS\/JS/);
});
