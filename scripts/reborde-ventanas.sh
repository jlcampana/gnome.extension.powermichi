#!/usr/bin/env bash
# Reborde de 2 px en todas las ventanas (también Brave, VS Code, apps Qt…) con el módulo
# «Reborde de las ventanas» de la extensión PowerMichi (código de P7 Borders): color de acento de
# GNOME en la ventana activa y el mismo azul al 50 % en las demás. En la pestaña Aspecto de sus
# ajustes se cambian el grosor y el color.
#
# Uso:  reborde-ventanas.sh                lo activa con 2 px y el color de acento
#       reborde-ventanas.sh --grosor 3     con otro grosor (px)
#       reborde-ventanas.sh --quitar       lo desactiva

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
P7() { gsettings --schemadir "$SCHEMAS" "$1" org.gnome.shell.extensions.p7-borders "${@:2}"; }
GROSOR=2

powermichi_instalada
case "${1:-}" in
    --quitar)
        N set modulo-reborde false
        echo "Reborde de ventanas desactivado."
        exit 0 ;;
    --grosor)
        [[ "${2:-}" =~ ^[0-9]+$ ]] || { echo "Grosor no válido: un número de píxeles" >&2; exit 1; }
        GROSOR="$2" ;;
    "") ;;
    *)
        echo "Uso: $(basename "$0") [--grosor N | --quitar]" >&2
        exit 1 ;;
esac

P7 set default-enabled true
P7 set default-width "$GROSOR"
P7 set default-active-color 'auto-solid'                # acento de GNOME, sólido
P7 set default-inactive-color 'rgba(53, 132, 228, 0.5)'  # azul de GNOME al 50 %
N set modulo-reborde true
echo "Reborde de $GROSOR px en todas las ventanas."
