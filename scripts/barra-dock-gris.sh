#!/usr/bin/env bash
# Barra superior y dock del mismo gris que el panel lateral de Nautilus en Adwaita oscuro
# (#2e2e32) al 95 % de opacidad.
#
#   - Barra superior: módulo «Barra superior» de la extensión PowerMichi (pestaña Aspecto de sus
#     ajustes), que pone la regla de #panel encima del tema normal de GNOME.
#   - Dock: ajustes de Dash to Dock (Ubuntu Dock usa el mismo esquema, así que vale igual).
#   - Blur my Shell: se le desactivan el blur y "override-background" de la barra, porque si no
#     le pone la clase transparent-panel y la deja transparente aunque no haya blur.
#
# Uso:  barra-dock-gris.sh                                  aplica con #2e2e32 al 95 %
#       barra-dock-gris.sh --color '#rrggbb' --opacidad 0.9  con otro color u opacidad
#       barra-dock-gris.sh --quitar                         vuelve al dock y la barra de GNOME

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
DOCK=/org/gnome/shell/extensions/dash-to-dock
BMS_PANEL=/org/gnome/shell/extensions/blur-my-shell/panel
COLOR="#2e2e32"
OPACIDAD="0.95"

powermichi_instalada
while (( $# )); do
    case "$1" in
        --quitar)
            N set modulo-barra-panel false
            for k in custom-background-color background-color background-opacity transparency-mode; do
                dconf reset "$DOCK/$k"
            done
            echo "Dock y barra superior vuelven a los de GNOME."
            exit 0
            ;;
        --color)
            [[ "${2:-}" =~ ^#[0-9a-fA-F]{6}$ ]] || { echo "Color no válido: usa el formato #rrggbb" >&2; exit 1; }
            COLOR="$2"; shift 2 ;;
        --opacidad)
            [[ "${2:-}" =~ ^(0(\.[0-9]+)?|1(\.0+)?)$ ]] || { echo "Opacidad no válida: un número entre 0 y 1" >&2; exit 1; }
            OPACIDAD="$2"; shift 2 ;;
        *)
            echo "Uso: $(basename "$0") [--color '#rrggbb'] [--opacidad 0.95] | --quitar" >&2
            exit 1 ;;
    esac
done

RGB="$(python3 -c "import sys; c=sys.argv[1]; print(','.join(str(int(c[i:i+2],16)) for i in (1,3,5)))" "$COLOR")"

# Dock: PowerMichi también lo pone (barra-dock), pero así queda hecho aunque aún no esté cargada
dconf write "$DOCK/custom-background-color" true
dconf write "$DOCK/background-color" "'rgb($RGB)'"
dconf write "$DOCK/background-opacity" "$OPACIDAD"
dconf write "$DOCK/transparency-mode" "'FIXED'"

# Barra superior
N set barra-color "$COLOR"
N set barra-opacidad "$OPACIDAD"
N set barra-dock true
N set modulo-barra-panel true

# Blur my Shell no debe volver transparente la barra
dconf write "$BMS_PANEL/blur" false
dconf write "$BMS_PANEL/override-background" false

echo "Barra superior y dock: $COLOR al $(python3 -c "print(round($OPACIDAD*100))") %"
