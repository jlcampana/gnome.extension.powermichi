#!/usr/bin/env bash
# Pone en rojo (el mismo que el botón de cerrar de gtk-compacto.sh, #e5484d) el fondo del botón
# de apagar del menú de Ajustes rápidos (con el icono en blanco) y el botón de confirmar de dos
# tipos de diálogo de GNOME Shell:
#   - Apagar, Reiniciar y Cerrar sesión
#   - Ventanas de contraseña: autenticación de administrador (polkit), llavero, wifi, discos
#
# Esos diálogos no son GTK sino de GNOME Shell, así que gtk.css no les afecta: lo hace el módulo
# «Botones de sesión en rojo» de la extensión PowerMichi (pestaña Aspecto de sus ajustes).
#
# Uso:  botones-sesion-rojos.sh                    los pone en rojo
#       botones-sesion-rojos.sh --color '#c01c28'  con otro color
#       botones-sesion-rojos.sh --quitar           los deja como en GNOME

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
powermichi_instalada
case "${1:-}" in
    --quitar)
        N set modulo-botones-sesion false
        echo "Botones de sesión como en GNOME."
        exit 0 ;;
    --color)
        [[ "${2:-}" =~ ^#[0-9a-fA-F]{6}$ ]] || { echo "Color no válido: usa el formato #rrggbb" >&2; exit 1; }
        N set botones-sesion-color "$2" ;;
    "") N reset botones-sesion-color ;;
    *)
        echo "Uso: $(basename "$0") [--color '#rrggbb' | --quitar]" >&2
        exit 1 ;;
esac
N set modulo-botones-sesion true
echo "Botones de apagar y de confirmar: $(N get botones-sesion-color | tr -d "'")"
