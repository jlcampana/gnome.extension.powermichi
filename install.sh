#!/usr/bin/env bash
# Instala las extensiones de GNOME de este repo en la cuenta del usuario:
#   - PowerMichi (powermichi@jlcampana.github.io): los retoques propios en una sola extensión.
#   - Media Controller (media-controller@jlcampana.github.io): independiente.
#
#   ./install.sh                  instala las dos
#   ./install.sh powermichi             solo PowerMichi
#   ./install.sh media            solo Media Controller
#   curl -fsSL https://raw.githubusercontent.com/jlcampana/gnome.extension.powermichi/main/install.sh | bash
#
# PowerMichi sustituye a las extensiones sueltas de antes (Pantalla activa, Transparencias, Barra
# Nautilus, Botones de sesión rojos, Clic de bandeja, Botón de aplicaciones, Capturas helper y
# P7 Borders, cuyo código va en el módulo Reborde):
# las quita de las activadas y borra su carpeta. Sus ajustes se conservan (Pantalla activa,
# Transparencias y Reborde usan los mismos esquemas). GNOME carga una extensión nueva al volver a iniciar
# sesión.
#
# Todo va dentro de main() para que bash lea el script entero antes de ejecutarlo («curl | bash»).
set -euo pipefail

REPO="jlcampana/gnome.extension.powermichi"
POWERMICHI="powermichi@jlcampana.github.io"
MEDIA="media-controller@jlcampana.github.io"
ANTIGUAS=(
    avoid-screen-off@jlcampana.github.io
    transparencias@pandi.local
    barra-nautilus@pandi.local
    botones-sesion@pandi.local
    clic-bandeja@pandi.local
    boton-aplicaciones@pandi.local
    capturas-helper@evilnagi.local
    p7-borders@prasannavl.com          # su código va ahora en el módulo Reborde
)
EXT="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions"
TMP=""

info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;33m==>\033[0m %s\n' "$*" >&2; }
fallo() { printf '\033[1;31m==>\033[0m %s\n' "$*" >&2; exit 1; }

# activadas <añadir…> -- <quitar…>: cambia enabled-extensions sin reordenar el resto
activadas() {
    python3 - "$@" <<'PY'
import ast, subprocess, sys
args = sys.argv[1:]
corte = args.index("--")
poner, quitar = args[:corte], set(args[corte + 1:])
k = ["org.gnome.shell", "enabled-extensions"]
l = ast.literal_eval(subprocess.check_output(["gsettings", "get", *k], text=True).replace("@as ", ""))
n = [u for u in l if u not in quitar] + [u for u in poner if u not in l]
if n != l:
    subprocess.check_call(["gsettings", "set", *k, str(n)])
PY
}

instalar() { # instalar <origen> <uuid>
    local origen="$1/$2" destino="$EXT/$2"
    [[ -f $origen/metadata.json ]] || fallo "No encuentro $origen"
    rm -rf "$destino"
    mkdir -p "$EXT"
    cp -r "$origen" "$destino"
    if [[ $2 == "$POWERMICHI" ]]; then
        # Los interruptores de la pestaña Ventanas ejecutan estos scripts (el CSS va solo en ellos)
        mkdir -p "$destino/scripts"
        cp "$1/scripts/"{gtk-compacto,nautilus-compacto,dialogos-confirmacion}.sh "$destino/scripts/"
        cp -r "$1/nautilus-python" "$destino/"
    fi
    glib-compile-schemas "$destino/schemas"
    info "Instalada $2"
}

main() {
    command -v glib-compile-schemas >/dev/null || fallo "Falta glib-compile-schemas (glib2 / libglib2.0-bin)"
    command -v python3 >/dev/null || fallo "Falta python3"

    local que="${1:-todas}" src="" aqui=""
    case "$que" in todas|powermichi|media) ;; *) fallo "Uso: install.sh [powermichi|media]" ;; esac

    if [[ -f ${BASH_SOURCE[0]:-} ]]; then
        aqui="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    fi
    if [[ -n $aqui && -d $aqui/$POWERMICHI ]]; then
        src="$aqui"
    else
        TMP="$(mktemp -d)"
        trap 'rm -rf "$TMP"' EXIT
        info "Descargando $REPO"
        curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.tar.gz" | tar -xz -C "$TMP"
        src="$(echo "$TMP"/*)"
    fi

    local poner=() quitar=()
    if [[ $que != media ]]; then
        instalar "$src" "$POWERMICHI"
        poner+=("$POWERMICHI")
        quitar+=("${ANTIGUAS[@]}")
        # Extensiones de nautilus-python: opacidad-nautilus.py (la usa el módulo Transparencias),
        # Pegar con rsync, Abrir con gThumb y Panel lateral estrecho. Se activan y desactivan
        # desde la pestaña Ventanas de los ajustes, que las copia de la carpeta de la extensión.
        local npy="${XDG_DATA_HOME:-$HOME/.local/share}/nautilus-python/extensions"
        mkdir -p "$npy"
        cp "$src/nautilus-python/"*.py "$npy/"
        info "Instaladas las extensiones de Nautilus: $(cd "$src/nautilus-python" && echo *.py)"
        if ! python3 -c 'import gi; gi.require_version("Nautilus", "4.1")' 2>/dev/null &&
           ! python3 -c 'import gi; gi.require_version("Nautilus", "4.0")' 2>/dev/null; then
            aviso "Falta nautilus-python (Fedora: nautilus-python · Ubuntu: python3-nautilus): sin él no cambia la opacidad de Nautilus"
        fi
        pgrep -x nautilus >/dev/null &&
            aviso "Nautilus las carga al reiniciarlo: nautilus -q (cancela las copias en curso)"
        for u in "${ANTIGUAS[@]}"; do
            if [[ -d $EXT/$u ]]; then
                rm -rf "${EXT:?}/$u"
                info "Quitada la extensión suelta $u (ahora va dentro de PowerMichi)"
            fi
        done
    fi
    if [[ $que != powermichi ]]; then
        instalar "$src" "$MEDIA"
        poner+=("$MEDIA")
        quitar+=(advanced-media-controller@sanjai.com)   # el original: saldrían dos controles
    fi

    if command -v gsettings >/dev/null && gsettings get org.gnome.shell enabled-extensions >/dev/null 2>&1; then
        activadas "${poner[@]}" -- "${quitar[@]}"
        gsettings set org.gnome.shell disable-user-extensions false
    else
        aviso "No hay sesión de GNOME: actívalas luego en la app Extensiones"
    fi
    info "Listo. Cierra sesión y vuelve a entrar para que GNOME cargue las extensiones nuevas."
}

main "$@"
