/* Cápsula de la hora — la elige y la sella Yokup; aquí solo se pinta.
   Preguntar TAMBIÉN dispara la hora: la plataforma no invoca el cron de ese worker
   (FLT-1016), su reloj va enganchado al tráfico, y esta visita cuenta como tráfico.
   Se refresca cada 5 min para cruzar el cambio de hora sin recargar la página. */
(function () {
  "use strict";
  var API = "https://api.yokup.com/academy/capsula";
  var REFRESCO = 5 * 60 * 1000;

  function hhmm(ms) {
    try {
      return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
        .format(new Date(Number(ms) || 0));
    } catch (e) { return ""; }
  }

  function pinta(capsula) {
    var seccion = document.getElementById("capsula");
    if (!seccion) return;
    // Sin título no hay cápsula que enseñar: se retira la sección entera en vez de
    // dejar un hueco anunciando una formación que no está.
    if (!capsula || !capsula.title) { seccion.hidden = true; return; }
    var pon = function (id, texto) { var n = document.getElementById(id); if (n) n.textContent = texto; };
    pon("capsula-hora", hhmm(capsula.hour_start) + " · activa");
    pon("capsula-fuente", capsula.source === "academia/leccion" ? "Lección de la Academia" : "Material del Consejo");
    pon("capsula-silla", capsula.role ? capsula.role + " · " + capsula.alias : "");
    pon("capsula-pieza", capsula.title);
    pon("capsula-nota", capsula.note || "");
    var cta = document.getElementById("capsula-cta");
    if (cta) {
      cta.href = capsula.url || "#formacion";
      cta.textContent = (capsula.source === "academia/leccion" ? "Ver la lección" : "Ver la pieza") + " →";
    }
    seccion.hidden = false;
  }

  function carga() {
    fetch(API, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { pinta(d && d.capsula); })
      .catch(function () { var s = document.getElementById("capsula"); if (s) s.hidden = true; });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { hhmm: hhmm, API: API };
  if (typeof document !== "undefined") { carga(); setInterval(carga, REFRESCO); }
})();
