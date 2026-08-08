import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./academy.css", import.meta.url), "utf8");
const js = await readFile(new URL("./academy.js", import.meta.url), "utf8");
const deploy = await readFile(new URL("./deploy.sh", import.meta.url), "utf8");

test("the primary navigation enters the academy", () => {
  assert.match(html, /class="nav-cta" href="#academia">Entrar en la academia/);
  assert.doesNotMatch(html, /class="nav-cta"[^>]*>Pregunta al avatar/);
});

test("v1 contains the eight canonical Council seats", () => {
  for (const role of ["CEO","CTO","COO","CFO","CCO","CDO","CXO","CSO"]) {
    assert.match(js, new RegExp(`role:\\"${role}\\"`));
  }
  assert.match(js, /alias:"Steve Jobs"/);
  assert.match(js, /alias:"George Lucas"/);
});

test("progress requires evidence and explicit confirmation", () => {
  assert.match(js, /text\.length < 24/);
  assert.match(js, /if\(!confirmed\)/);
  assert.match(js, /complete:true/);
  assert.match(html, /Completar no acredita/);
});

test("carbon agents are clearly separated and not simulated", () => {
  assert.match(html, /Agentes de carbono — próximamente/);
  assert.match(html, /fuera del alcance de v1/);
  assert.match(js, /fase futura, sin progreso simulado/);
});

test("the avatar remains a secondary external resource", () => {
  assert.match(html, /id="ayuda"/);
  assert.match(html, /href="https:\/\/digitalavatar\.ai\/"/);
  assert.match(html, /no valida lecciones y no concede progreso/);
});

test("responsive and reduced-motion safeguards exist", () => {
  assert.match(css, /@media \(max-width:700px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("the signed release inlines assets to survive the canonical-domain fallback", () => {
  assert.match(deploy, /html\.replace\(css_tag/);
  assert.match(deploy, /html\.replace\(js_tag/);
  assert.match(deploy, /no se encontraron los anclajes CSS\/JS/);
});
