import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Regla 24: cada proyecto abre dos puertas. La Academia tenía /help desde el principio
// y su /mcp era un 200 falso del catch-all de Pages: respondía, pero servía la home.
const mcp = JSON.parse(await readFile(new URL("./mcp/manifest.json", import.meta.url), "utf8"));
const page = await readFile(new URL("./mcp/index.html", import.meta.url), "utf8");
const llms = await readFile(new URL("./mcp/llms.txt", import.meta.url), "utf8");

test("las dos puertas se enlazan y ninguna pide sesión", () => {
  assert.match(page, /href="\/help\/"/, "el /mcp manda a las personas a /help");
  assert.equal(mcp.help_humans, "https://admira.academy/help/");
  assert.doesNotMatch(page, /acceso\.js|auth-gate/, "una puerta que pide sesión no es una puerta");
});

test("dice la verdad de dónde vive el dato: en Yokup, no aquí", () => {
  // La Academia es estática. Un agente que crea que hay API local pierde media hora.
  assert.equal(mcp.http_api.base_url, "https://api.yokup.com");
  for (const t of [page, llms]) assert.match(t, /el dato vivo no está en este sitio|dato vivo no está/i);
  for (const t of [page, llms]) assert.match(t, /workers\.dev/, "y cuál es el host que NO hay que usar");
});

test("el modelo del Consejo está completo y cuadra con el worker", () => {
  assert.deepEqual(Object.keys(mcp.modelo.tematicas), ["tecnologia", "creatividad", "negocio"]);
  const sillas = Object.values(mcp.modelo.tematicas).flat();
  assert.equal(sillas.length, 8, "las ocho sillas");
  assert.equal(new Set(sillas).size, 8, "ninguna en dos temáticas");
  assert.deepEqual([...sillas].sort(), [...mcp.modelo.sillas].sort());
  assert.match(mcp.modelo.rotacion, /coachLessonForSlot/, "quien lleva la rueda es el worker: no duplicarla");
});

test("las trampas que cuestan media hora están escritas en las dos piezas", () => {
  assert.ok(mcp.trampas.length >= 4);
  for (const t of [page, llms]) {
    assert.match(t, /#formacion/, "sin la etiqueta, el material no existe para el Consejo");
    assert.match(t, /día en curso|dia en curso/i, "la traza de puntos no cubre ayer");
    assert.match(t, /localStorage/, "el progreso del visitante es de su navegador, no de la casa");
  }
});

test("la puerta de silicio publica el contrato de mejora sin relleno", () => {
  assert.equal(mcp.criterio_mejora.contract, "academy-improvement-v1");
  assert.equal(mcp.criterio_mejora.minimum_score, 4);
  assert.equal(mcp.criterio_mejora.evidence_max_age_hours, 24);
  assert.equal(mcp.criterio_mejora.insufficient_action, "investigate");
  assert.equal(mcp.criterio_mejora.criteria.length, 5);
  for (const text of [page, llms]) {
    assert.match(text, /Sin evidencia viva no hay mejora/);
    assert.match(text, /investigate/);
    assert.match(text, /menos de 24 h|menos de 24 horas/);
  }
});
