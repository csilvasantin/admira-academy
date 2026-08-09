import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const help = await readFile(new URL("./help/index.html", import.meta.url), "utf8");
const academy = await readFile(new URL("./index.html", import.meta.url), "utf8");
const academyCss = await readFile(new URL("./academy.css", import.meta.url), "utf8");
const platform = await readFile(new URL("./plataforma/index.html", import.meta.url), "utf8");
const deploy = await readFile(new URL("./deploy.sh", import.meta.url), "utf8");

test("Academy and Platform expose compact navigation to Help", () => {
  assert.match(academy, /href="\/help\/" class="nav-help">Ayuda<\/a>/);
  assert.match(academyCss, /nav>a\.nav-help\{display:block!important\}/);
  assert.match(academy, /href="\/help\/">Entender Academy<\/a>/);
  assert.match(platform, /href="\/help\/">Ayuda<\/a>/);
  assert.match(help, /href="\/"[^>]*>Academia<\/a>/);
  assert.match(help, /href="\/plataforma\/">Plataforma<\/a>/);
});

test("the public explanation states purpose without promising unlimited autonomy", () => {
  assert.match(help, /coordina la mejora continua de agentes de carbono y silicio/i);
  assert.match(help, /Bits y Átomos es la universidad que equilibra tecnología, creatividad y negocio/i);
  assert.match(help, /conceptos relacionados, no nombres intercambiables/i);
  assert.match(help, /no es.+promesa de que los agentes se mejoran solos, actúan sin supervisión/i);
  assert.match(help, /no garantiza menos coste, mejores resultados ni mejora autónoma/i);
});

test("the four continuous improvement modules are present and explicitly evolving", () => {
  for (const title of ["Entorno de simulación y pruebas", "Evaluador automatizado", "Bucle de feedback y memoria", "Despliegue progresivo"]) {
    assert.match(help, new RegExp(title));
  }
  assert.equal((help.match(/<span class="status">En evolución<\/span>/g) || []).length, 4);
  assert.match(help, /no se presentan como servicios completos disponibles hoy/i);
});

test("implemented capabilities and future architecture are not conflated", () => {
  for (const current of ["Formación de los 8 consejeros", "evidencia y trazabilidad local", "Tiempo medido o declarado", "Pixeria sólo con consentimiento"]) assert.match(help, new RegExp(current, "i"));
  for (const future of ["Sandbox aislado", "evaluador automatizado", "Feedback canónico", "canary real con rollback"]) assert.match(help, new RegExp(future, "i"));
  assert.match(help, /no garantiza menos coste, mejores resultados ni mejora autónoma/i);
});

test("safeguards, Council roles and future carbon agents remain explicit", () => {
  for (const safeguard of ["Evidencia", "Trazabilidad", "Validación", "Versiones", "Revisión humana", "Rollback"]) assert.match(help, new RegExp(`>${safeguard}<`));
  assert.match(help, /CEO, CTO, COO, CFO, CCO, CDO, CXO y CSO/);
  assert.match(help, /agentes de carbono requerirá identidad, consentimiento, privacidad y acreditación propios/i);
});

test("the help page follows the AdmiraNeXT shell and responsive accessibility basics", () => {
  assert.match(help, /<summary>Opciones<\/summary>/);
  assert.match(help, /<summary>Avanzada<\/summary>/);
  assert.match(help, /<summary>Modo avanzado/);
  assert.match(help, /<main id="contenido">/);
  assert.match(help, /aria-labelledby="pipeline-title"/);
  assert.match(help, /@media\(max-width:700px\)/);
  assert.match(help, /prefers-reduced-motion/);
});

test("the signed dual-project release stamps the Help document", () => {
  assert.match(deploy, /\$TMP\/help\/index\.html/);
  assert.match(deploy, /Admira Academy Ayuda/);
  assert.match(deploy, /el sello no llegó a help\/index\.html/);
  assert.match(deploy, /--project-name bits-and-atoms/);
});
