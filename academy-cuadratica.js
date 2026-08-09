/* ══════════════════════════════════════════════════════════════════════════
   INTERFAZ CUADRÁTICA · admira.academy
   Opciones a la izquierda, avanzado a la derecha, modo experto abajo. Todo
   plegado por defecto y abierto solo desde los iconos del cuadro.
   Reglas de la casa que se respetan aquí:
     · Nunca hay dos rieles abiertos a la vez: molestan más de lo que ayudan.
     · Escape cierra, el fondo cierra, y al elegir una opción se cierra sola.
     · El experto NO tapa los rieles: convive abajo, que es su sitio.
     · Lo que el visitante elige (contraste, movimiento) se recuerda.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var fondo = $("cuad-fondo"),
      rielOp = $("riel-op"), rielAv = $("riel-av"), experto = $("barra-experto"),
      btnOp = $("cuad-op"), btnAv = $("cuad-av"), btnEx = $("cuad-ex");
  if (!fondo || !rielOp || !rielAv || !experto) return;

  function pinta(el, btn, abierto) {
    el.classList.toggle("on", abierto);
    el.setAttribute("aria-hidden", abierto ? "false" : "true");
    if (btn) btn.setAttribute("aria-expanded", abierto ? "true" : "false");
  }
  function hayRiel() { return rielOp.classList.contains("on") || rielAv.classList.contains("on"); }
  function fondoSegunEstado() { fondo.classList.toggle("on", hayRiel()); }

  function abre(cual) {
    // Uno u otro, nunca los dos: el cuadro se lee, no se apelotona.
    pinta(rielOp, btnOp, cual === "op" && !rielOp.classList.contains("on"));
    pinta(rielAv, btnAv, cual === "av" && !rielAv.classList.contains("on"));
    fondoSegunEstado();
  }
  function cierraRieles() {
    pinta(rielOp, btnOp, false); pinta(rielAv, btnAv, false); fondoSegunEstado();
  }

  btnOp && btnOp.addEventListener("click", function () { abre("op"); });
  btnAv && btnAv.addEventListener("click", function () { abre("av"); });
  btnEx && btnEx.addEventListener("click", function () {
    pinta(experto, btnEx, !experto.classList.contains("on"));
  });
  fondo.addEventListener("click", cierraRieles);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (hayRiel()) cierraRieles();
    else if (experto.classList.contains("on")) pinta(experto, btnEx, false);
  });

  // Elegir una opción cierra el riel: nadie quiere volver a cerrarlo a mano.
  [rielOp, rielAv].forEach(function (r) {
    r.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#'], [data-cuad-ir]");
      if (!a) return;
      var destino = a.getAttribute("data-cuad-ir") || a.getAttribute("href");
      cierraRieles();
      if (destino && destino.charAt(0) === "#") {
        e.preventDefault();
        var t = document.querySelector(destino);
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Iconos sueltos de la izquierda: atajos, no menús.
  var irAcad = $("cuad-ir"), arriba = $("cuad-arriba");
  irAcad && irAcad.addEventListener("click", function () {
    var t = document.querySelector("#academia"); if (t) t.scrollIntoView({ behavior: "smooth" });
  });
  arriba && arriba.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ── Avanzado: preferencias que se recuerdan ──────────────────────────────
  function recuerda(clave, activo) { try { localStorage.setItem(clave, activo ? "1" : "0"); } catch (_) {} }
  function recordado(clave) { try { return localStorage.getItem(clave) === "1"; } catch (_) { return false; } }

  var contraste = $("av-contraste"), motion = $("av-motion");
  function aplicaContraste(on) { document.documentElement.style.filter = on ? "contrast(1.18) saturate(1.06)" : ""; }
  function aplicaMotion(on) { document.documentElement.style.setProperty("scroll-behavior", on ? "auto" : ""); document.body.classList.toggle("sin-movimiento", on); }
  aplicaContraste(recordado("acad.contraste"));
  aplicaMotion(recordado("acad.motion"));
  contraste && contraste.addEventListener("click", function () {
    var on = !recordado("acad.contraste"); recuerda("acad.contraste", on); aplicaContraste(on);
    contraste.textContent = on ? "Contraste alto: activado" : "Alternar contraste alto";
  });
  motion && motion.addEventListener("click", function () {
    var on = !recordado("acad.motion"); recuerda("acad.motion", on); aplicaMotion(on);
    motion.textContent = on ? "Movimiento reducido: activado" : "Reducir movimiento";
  });

  var copiar = $("av-copiar");
  copiar && copiar.addEventListener("click", function () {
    var url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { copiar.textContent = "Enlace copiado ✓"; })
        .catch(function () { copiar.textContent = "No se pudo copiar"; });
    } else { copiar.textContent = "No se pudo copiar"; }
    setTimeout(function () { copiar.textContent = "Copiar enlace de esta vista"; }, 2200);
  });

  // ── Experto: datos de verdad, no adornos ─────────────────────────────────
  var dato = $("ex-dato");
  if (dato) {
    // Se dice lo que se sabe: la vista, el ancho y si el navegador pide calma.
    var calma = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dato.textContent = document.title.split("—")[0].trim() + " · " + window.innerWidth + "px" + (calma ? " · movimiento reducido" : "");
  }
  var estado = $("ex-estado");
  estado && estado.addEventListener("click", function () {
    var info = { url: location.href, ancho: window.innerWidth, alto: window.innerHeight,
                 secciones: [].map.call(document.querySelectorAll("section[id]"), function (n) { return n.id; }) };
    console.log("[admira.academy · modo experto]", info);
    estado.textContent = "Volcado en consola ✓";
    setTimeout(function () { estado.textContent = "Estado en consola"; }, 2200);
  });
})();
