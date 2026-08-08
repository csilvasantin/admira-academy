#!/usr/bin/env bash
# Publica admira.academy en CLOUDFLARE PAGES (proyecto 'admira-academy'), FIRMADO.
#
# Por qué existe: hasta el 8-ago-2026 la academia era el único sitio de la suite
# sin sello. Los otros siete publican version.json con persona y máquina, así que
# se puede saber quién puso en antena lo que hay; aquí no lo sabía nadie. Y el
# 7-ago pasó lo que pasa cuando nadie lo sabe: yokup.com estuvo 13 h sirviendo
# código de la semana anterior porque alguien publicó con wrangler a pelo desde
# un árbol viejo y sucio, y no había forma de notarlo.
#
# Uso:  ADMIRA_RELEASE_AGENT=MorfeoMBA16 ADMIRA_RELEASE_MACHINE=MacBookAir16plata ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

: "${ADMIRA_RELEASE_AGENT:?Define ADMIRA_RELEASE_AGENT (ej. MorfeoMBA16)}"
: "${ADMIRA_RELEASE_MACHINE:?Define ADMIRA_RELEASE_MACHINE (ej. MacBookAir16plata)}"

# ── Censo: el apellido del agente tiene que casar con la máquina ──────────────
# Mismo diccionario que yokup-site/deploy-signature.mjs (normativa, regla 02). Una
# firma que no case es una firma que no identifica a nadie, y entonces no es firma.
case "$ADMIRA_RELEASE_MACHINE" in
  MacMini)            SUF="MacMini";;
  MacBookPro14|MacBookProNegro14) SUF="MBP14";;
  MacBookPro16)       SUF="MBP16";;
  MacBookAirAzul)     SUF="MBAAzul";;
  MacBookAirRosa)     SUF="MBARosa";;
  MacBookAirCrema)    SUF="MBACrema";;
  MacBookAirPlata)    SUF="MBAPlata";;
  MacBookAir16plata)  SUF="MBA16";;
  *) echo "✗ '$ADMIRA_RELEASE_MACHINE' no está en el censo operativo" >&2; exit 2;;
esac
PERSONA=""
for p in Morfeo Neo Trinity Oraculo Cypher Smith WhiteRabbit; do
  case "$ADMIRA_RELEASE_AGENT" in "$p"*|Sub"$p"*|Infra"$p"*) PERSONA="$p"; break;; esac
done
[ -n "$PERSONA" ] || { echo "✗ '$ADMIRA_RELEASE_AGENT' no es una identidad operativa (Morfeo, Neo, Trinity…)" >&2; exit 2; }
[ "${ADMIRA_RELEASE_AGENT%$SUF}" != "$ADMIRA_RELEASE_AGENT" ] \
  || { echo "✗ el apellido de '$ADMIRA_RELEASE_AGENT' no corresponde a $ADMIRA_RELEASE_MACHINE (esperaba …$SUF)" >&2; exit 2; }
FIRMA="$ADMIRA_RELEASE_AGENT · $ADMIRA_RELEASE_MACHINE"

# ── Un árbol sucio hace que la firma mienta ──────────────────────────────────
# Si se publica con cambios sin commitear, el sello dice un commit y la antena
# sirve otra cosa. Eso es exactamente lo que llevaba puesto el deploy intruso de
# yokup: dirty=true. Aquí se para antes.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ No se publica desde un árbol sucio: el sello y lo publicado dejarían de corresponder." >&2
  git status --short >&2
  exit 1
fi
GIT_FULL="$(git rev-parse HEAD)"; GIT_SHORT="$(git rev-parse --short HEAD)"

# Producción es main. Con remote configurado, además se exige estar al día.
RAMA="$(git rev-parse --abbrev-ref HEAD)"
if [ "$RAMA" != "main" ] && [ "${ACADEMY_DEPLOY_FORCE:-}" != "1" ]; then
  echo "✗ Producción es main y estás en '$RAMA'. Funde y publica desde main (o ACADEMY_DEPLOY_FORCE=1)." >&2
  exit 1
fi
if git remote | grep -q origin; then
  git fetch --quiet origin main 2>/dev/null || true
  if [ -n "$(git rev-parse origin/main 2>/dev/null)" ] && [ "$GIT_FULL" != "$(git rev-parse origin/main)" ]; then
    echo "⚠ HEAD no coincide con origin/main — revisa antes de publicar." >&2
    [ "${ACADEMY_DEPLOY_FORCE:-}" = "1" ] || exit 1
  fi
else
  echo "⚠ Sin remote: este repo solo vive en este Mac. Publicando igual, pero conviene darle origin."
fi

# ── Versión v.DD.MM.AAAA.rN.HH:MM ────────────────────────────────────────────
# La rN se cuenta contra el sello que hay EN ANTENA, no contra un fichero local:
# tras clonar en otra máquina, un contador local repetiría la r de hoy y dos
# releases distintos compartirían nombre.
HOY="$(date +%d.%m.%Y)"; HORA="$(date +%H:%M)"
PUB="$(curl -sL --max-time 15 "https://admira.academy/version.json?d=$(date +%s)" 2>/dev/null || true)"
R="$(printf '%s' "$PUB" | HOY="$HOY" python3 -c '
import sys, json, os, re
try: v = json.load(sys.stdin).get("version","")
except Exception: v = ""
m = re.match(r"v\.(\d{2}\.\d{2}\.\d{4})\.r(\d+)", v or "")
print(int(m.group(2)) + 1 if m and m.group(1) == os.environ["HOY"] else 1)' 2>/dev/null || echo 1)"
VERSION="v.$HOY.r$R.$HORA"
echo "→ Sello $VERSION · $FIRMA"

# ── Staging: se sella la copia, no el repo ───────────────────────────────────
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"

# El dominio canónico conserva un fallback histórico que responde index.html a
# rutas estáticas nuevas. El preview de Pages sirve sus MIME correctamente, pero
# admira.academy puede convertir /academy.css y /academy.js en text/html. Para que
# la release sea autosuficiente y no dependa de ese router, la copia publicada
# integra ambos recursos dentro del HTML. La fuente sigue separada para poder
# mantenerla y probarla en local.
python3 - "$TMP/index.html" "$TMP/academy.css" "$TMP/academy-training-core.js" "$TMP/academy.js" <<'PY'
import sys
index_path, css_path, core_path, js_path = sys.argv[1:]
html = open(index_path, encoding="utf-8").read()
css = open(css_path, encoding="utf-8").read()
core = open(core_path, encoding="utf-8").read()
js = open(js_path, encoding="utf-8").read()
css_tag = '<link rel="stylesheet" href="/academy.css">'
core_tag = '<script src="/academy-training-core.js" defer></script>'
js_tag = '<script src="/academy.js" defer></script>'
if css_tag not in html or core_tag not in html or js_tag not in html:
    raise SystemExit("✗ no se encontraron los anclajes CSS/JS de la academia")
html = html.replace(css_tag, "<style>\n" + css + "\n</style>", 1)
html = html.replace(core_tag, "<script>\n" + core + "\n</script>", 1)
html = html.replace(
    js_tag,
    '<script>\ndocument.addEventListener("DOMContentLoaded", () => {\n' + js + "\n});\n</script>",
    1,
)
open(index_path, "w", encoding="utf-8").write(html)
PY

# /plataforma comparte dominio y por tanto el mismo fallback histórico. También
# se publica como documento autosuficiente para que su ruta nunca dependa del
# MIME que el router asigne a los recursos raíz.
python3 - "$TMP/plataforma/index.html" "$TMP/platform.css" "$TMP/platform-core.js" "$TMP/platform.js" <<'PY'
import sys
index_path, css_path, core_path, js_path = sys.argv[1:]
html = open(index_path, encoding="utf-8").read()
css = open(css_path, encoding="utf-8").read()
core = open(core_path, encoding="utf-8").read()
js = open(js_path, encoding="utf-8").read()
css_tag = '<link rel="stylesheet" href="/platform.css">'
core_tag = '<script src="/platform-core.js" defer></script>'
js_tag = '<script src="/platform.js" defer></script>'
if css_tag not in html or core_tag not in html or js_tag not in html:
    raise SystemExit("✗ no se encontraron los anclajes de la plataforma")
html = html.replace(css_tag, "<style>\n" + css + "\n</style>", 1)
html = html.replace(core_tag, "<script>\n" + core + "\n</script>", 1)
html = html.replace(js_tag, '<script>\ndocument.addEventListener("DOMContentLoaded", () => {\n' + js + "\n});\n</script>", 1)
open(index_path, "w", encoding="utf-8").write(html)
PY

# Las fichas de consejero comparten una sola ruta dinámica por query string. Se
# integran también en el documento para que las ocho URL y ambos tipos de agente
# sean inmunes al fallback MIME del dominio canónico.
python3 - "$TMP/consejeros/index.html" "$TMP/advisor.css" "$TMP/advisor-core.js" "$TMP/academy-training-core.js" "$TMP/advisor.js" <<'PY'
import sys
index_path, css_path, core_path, training_core_path, js_path = sys.argv[1:]
html = open(index_path, encoding="utf-8").read()
css = open(css_path, encoding="utf-8").read()
core = open(core_path, encoding="utf-8").read()
training_core = open(training_core_path, encoding="utf-8").read()
js = open(js_path, encoding="utf-8").read()
css_tag = '<link rel="stylesheet" href="/advisor.css">'
core_tag = '<script src="/advisor-core.js" defer></script>'
training_core_tag = '<script src="/academy-training-core.js" defer></script>'
js_tag = '<script src="/advisor.js" defer></script>'
if css_tag not in html or core_tag not in html or training_core_tag not in html or js_tag not in html:
    raise SystemExit("✗ no se encontraron los anclajes de consejeros")
html = html.replace(css_tag, "<style>\n" + css + "\n</style>", 1)
html = html.replace(core_tag, "<script>\n" + core + "\n</script>", 1)
html = html.replace(training_core_tag, "<script>\n" + training_core + "\n</script>", 1)
html = html.replace(js_tag, '<script>\ndocument.addEventListener("DOMContentLoaded", () => {\n' + js + "\n});\n</script>", 1)
open(index_path, "w", encoding="utf-8").write(html)
PY

VERSION="$VERSION" FIRMA="$FIRMA" python3 - "$TMP/index.html" <<'PY'
import os, re, sys
p = sys.argv[1]
version, firma = os.environ["VERSION"], os.environ["FIRMA"]
html = open(p, encoding="utf-8").read()
meta = f'<meta name="admiranext-version" content="Admira Academy {version}">'
# Un solo sello canónico: se reemplaza si ya existe, se ancla tras el viewport si no.
if re.search(r'<meta\s+name="admiranext-version"[^>]*>', html):
    html = re.sub(r'<meta\s+name="admiranext-version"[^>]*>', meta, html)
else:
    html = re.sub(r'(<meta\s+name="viewport"[^>]*>)', r'\1\n' + meta, html, count=1)
# El pie deja de decir "maqueta": lleva versión y quién la puso en antena.
html = re.sub(r'(<span class="sig mono">)[^<]*(</span>)', r'\g<1>' + f'{version} · {firma}' + r'\g<2>', html)
open(p, "w", encoding="utf-8").write(html)
PY

VERSION="$VERSION" FIRMA="$FIRMA" python3 - "$TMP/plataforma/index.html" <<'PY'
import os, re, sys
p = sys.argv[1]
version, firma = os.environ["VERSION"], os.environ["FIRMA"]
html = open(p, encoding="utf-8").read()
meta = f'<meta name="admiranext-version" content="Admira Academy Plataforma {version}">'
html = re.sub(r'(<meta\s+name="viewport"[^>]*>)', r'\1\n' + meta, html, count=1)
html = re.sub(r'(<span class="sig">)[^<]*(</span>)', r'\g<1>' + f'{version} · {firma}' + r'\g<2>', html)
open(p, "w", encoding="utf-8").write(html)
PY

VERSION="$VERSION" FIRMA="$FIRMA" python3 - "$TMP/help/index.html" <<'PY'
import os, re, sys
p = sys.argv[1]
version, firma = os.environ["VERSION"], os.environ["FIRMA"]
html = open(p, encoding="utf-8").read()
meta = f'<meta name="admiranext-version" content="Admira Academy Ayuda {version}">'
if re.search(r'<meta\s+name="admiranext-version"[^>]*>', html):
    html = re.sub(r'<meta\s+name="admiranext-version"[^>]*>', meta, html)
else:
    html = re.sub(r'(<meta\s+name="viewport"[^>]*>)', r'\1\n' + meta, html, count=1)
html = re.sub(r'(<span class="sig">)[^<]*(</span>)', r'\g<1>' + f'{version} · {firma}' + r'\g<2>', html)
open(p, "w", encoding="utf-8").write(html)
PY

VERSION="$VERSION" FIRMA="$FIRMA" python3 - "$TMP/consejeros/index.html" <<'PY'
import os, re, sys
p = sys.argv[1]
version, firma = os.environ["VERSION"], os.environ["FIRMA"]
html = open(p, encoding="utf-8").read()
meta = f'<meta name="admiranext-version" content="Admira Academy Consejeros {version}">'
if re.search(r'<meta\s+name="admiranext-version"[^>]*>', html):
    html = re.sub(r'<meta\s+name="admiranext-version"[^>]*>', meta, html)
else:
    html = re.sub(r'(<meta\s+name="viewport"[^>]*>)', r'\1\n' + meta, html, count=1)
html = re.sub(r'(<span class="sig">)[^<]*(</span>)', r'\g<1>' + f'{version} · {firma}' + r'\g<2>', html)
open(p, "w", encoding="utf-8").write(html)
PY

python3 - "$TMP/version.json" <<PY
import json, sys, datetime
json.dump({
  "version": "$VERSION",
  "deployedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "deployer": "$ADMIRA_RELEASE_AGENT",
  "machine": "$ADMIRA_RELEASE_MACHINE",
  "signature": "$FIRMA",
  "git": "$GIT_SHORT", "gitShort": "$GIT_SHORT", "gitFull": "$GIT_FULL",
  "dirty": False
}, open(sys.argv[1], "w"), indent=2, ensure_ascii=False)
PY

grep -q "$VERSION" "$TMP/index.html" || { echo "✗ el sello no llegó al index.html" >&2; exit 1; }
grep -q "$VERSION" "$TMP/plataforma/index.html" || { echo "✗ el sello no llegó a plataforma/index.html" >&2; exit 1; }
grep -q "$VERSION" "$TMP/help/index.html" || { echo "✗ el sello no llegó a help/index.html" >&2; exit 1; }
grep -q "$VERSION" "$TMP/consejeros/index.html" || { echo "✗ el sello no llegó a consejeros/index.html" >&2; exit 1; }

echo "→ Cloudflare Pages (proyecto admira-academy)…"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(bash ~/Claude/admira-vault/vault-get.sh CLOUDFLARE_API_TOKEN)}"
npx --yes wrangler@4.119.0 pages deploy "$TMP" \
  --project-name admira-academy --branch main \
  --commit-hash "$GIT_FULL" --commit-message "Academia $VERSION · $FIRMA"

# bitsandatoms.ai aún conserva DNS externo, pero su proyecto Pages recibe el
# mismo artefacto firmado. Así existe un único producto desplegable y el enlace
# del dominio podrá hacerse sin mantener dos Academias divergentes.
echo "→ Cloudflare Pages (alias preparado: bits-and-atoms)…"
npx --yes wrangler@4.119.0 pages deploy "$TMP" \
  --project-name bits-and-atoms --branch main \
  --commit-hash "$GIT_FULL" --commit-message "Academia $VERSION · $FIRMA"

echo "✓ https://admira.academy + https://bits-and-atoms.pages.dev · $VERSION · $FIRMA"
