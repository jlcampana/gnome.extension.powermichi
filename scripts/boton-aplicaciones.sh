#!/usr/bin/env bash
# Pone el botón "Mostrar aplicaciones" de Dash to Dock el primero del dock y con una imagen propia
# (por defecto el avatar de Bubble Bobble, guardado en el repo en iconos/apps-propias/).
#
# Dash to Dock tiene ajustes para mostrar el botón y ponerlo al principio (show-show-apps-button,
# show-apps-at-top), pero no para cambiar su icono: eso lo hace el módulo «Botón de aplicaciones»
# de la extensión PowerMichi (pestaña Aspecto de sus ajustes, donde también se puede elegir la imagen).
# La imagen se copia a ~/.local/share/icons/apps-propias/boton-aplicaciones.png.
#
# Uso:  boton-aplicaciones.sh               con la imagen ya copiada (o la de Bubble Bobble del repo)
#       boton-aplicaciones.sh <imagen>      con otra imagen (PNG, SVG o JPG; mejor cuadrada)
#       boton-aplicaciones.sh --quitar      quita la imagen y el botón (vuelve como estaba)

set -euo pipefail

# --- PowerMichi: si falta, se instala con el install.sh de su repo. Sus ajustes se cambian con
# gsettings y la extensión los aplica en directo (la primera vez, tras volver a iniciar sesión).
POWERMICHI="powermichi@jlcampana.github.io"
SCHEMAS="$HOME/.local/share/gnome-shell/extensions/$POWERMICHI/schemas"
powermichi_instalada() {
    [[ -f "$SCHEMAS/gschemas.compiled" ]] && return
    local r; r="$(cd "$(dirname "$(realpath "$0")")/.." && pwd)"
    if [[ -x "$r/install.sh" && -d "$r/$POWERMICHI" ]]; then
        "$r/install.sh" powermichi
    else
        curl -fsSL https://raw.githubusercontent.com/jlcampana/gnome.extension.powermichi/main/install.sh | bash -s powermichi
    fi
}
N() { gsettings --schemadir "$SCHEMAS" "$1" org.gnome.shell.extensions.powermichi "${@:2}"; }
IMG="$HOME/.local/share/icons/apps-propias/boton-aplicaciones.png"
RAW="https://raw.githubusercontent.com/jlcampana/gnome.extension.powermichi/main"
EN_REPO="iconos/apps-propias/boton-aplicaciones.png"
DOCK=/org/gnome/shell/extensions/dash-to-dock  # con dconf: vale aunque Dash to Dock esté en ~/.local (sin esquema global)

powermichi_instalada
if [[ "${1:-}" == "--quitar" ]]; then
    N set modulo-boton-aplicaciones false
    N reset boton-aplicaciones-imagen
    rm -f "$IMG"
    dconf write $DOCK/show-show-apps-button false
    dconf write $DOCK/show-apps-at-top false
    echo "Botón de aplicaciones quitado."
    exit 0
fi

# Imagen. Sin imagen: la del repo (clon local si el script está dentro de él; si no, de GitHub)
ORIGEN="${1:-}"
if [[ -z "$ORIGEN" && ! -f "$IMG" ]]; then
    R="$(cd "$(dirname "$(realpath "$0")")/.." && pwd)"
    if [[ -f "$R/$EN_REPO" ]]; then
        ORIGEN="$R/$EN_REPO"
    else
        ORIGEN="$(mktemp --suffix=.png)"; trap 'rm -f "$ORIGEN"' EXIT
        curl -fsSL --retry 3 "$RAW/$EN_REPO" -o "$ORIGEN" ||
            { echo "No se pudo descargar la imagen" >&2; exit 1; }
    fi
fi
if [[ -n "$ORIGEN" ]]; then
    [[ -f "$ORIGEN" ]] || { echo "No encuentro la imagen: $ORIGEN" >&2; exit 1; }
    mkdir -p "$(dirname "$IMG")"
    [[ "$(realpath "$ORIGEN")" == "$(realpath -m "$IMG")" ]] || cp "$ORIGEN" "$IMG"
fi

dconf write $DOCK/show-show-apps-button true
dconf write $DOCK/show-apps-at-top true
N reset boton-aplicaciones-imagen   # vacío = $IMG
N set modulo-boton-aplicaciones true
echo "Botón de aplicaciones el primero del dock, con la imagen $IMG."
