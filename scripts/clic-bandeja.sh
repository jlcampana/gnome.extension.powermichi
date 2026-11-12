#!/usr/bin/env bash
# Hace que un clic izquierdo en el icono de una app en la bandeja (barra superior, extensión
# AppIndicator) abra la app en vez de mostrar su menú. El clic derecho sigue mostrando el menú.
# Por defecto: 1Password.
#
# AppIndicator no tiene ajuste para esto: lo hace el módulo «Clic en la bandeja» de la extensión
# PowerMichi (pestaña Extras de sus ajustes, donde también se pueden añadir y quitar iconos). Deja
# mensajes "clic-bandeja:" en el registro de GNOME.
#
# Uso:  clic-bandeja.sh                     clic en 1Password = abrir 1Password
#       clic-bandeja.sh <id> <app.desktop>  añade otra app (el id es la propiedad Id de su icono
#                                           de bandeja, p. ej. "1Password_status_icon_1")
#       clic-bandeja.sh --quitar            clic normal en todos los iconos

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
        N set modulo-clic-bandeja false
        echo "Clic de bandeja normal otra vez."
        exit 0 ;;
    "") ;;
    *)
        [[ $# -eq 2 ]] || { echo "Uso: $(basename "$0") [<id> <app.desktop> | --quitar]" >&2; exit 1; }
        ACTUAL="$(N get clic-bandeja-apps)"
        NUEVO="$(python3 - "$ACTUAL" "$1" "$2" <<'PY'
import ast, sys
actual, id_, app = sys.argv[1:]
d = ast.literal_eval(actual.replace("@a{ss} ", ""))
d[id_] = app if app.endswith(".desktop") else app + ".desktop"
print("{" + ", ".join(f"{k!r}: {v!r}" for k, v in d.items()) + "}")
PY
)"
        N set clic-bandeja-apps "$NUEVO" ;;
esac
N set modulo-clic-bandeja true
echo "Clic izquierdo abre la app en: $(N get clic-bandeja-apps)"
