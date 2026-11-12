#!/usr/bin/env bash
# Activa o quita el desenfoque (blur) detrás de las ventanas transparentes de Nautilus y Ptyxis.
# El blur lo hace el módulo Transparencias de la extensión PowerMichi: este script solo cambia sus
# ajustes, igual que los interruptores de su menú en Ajustes rápidos.
#
# Uso:  blur-ventanas.sh              blur en Nautilus y Ptyxis
#       blur-ventanas.sh nautilus     solo en Nautilus
#       blur-ventanas.sh ptyxis       solo en Ptyxis
#       blur-ventanas.sh --nivel 30   intensidad del blur (0-100; por defecto 21)
#       blur-ventanas.sh --quitar     lo quita de todas
#       blur-ventanas.sh --apagar     apaga las transparencias (opacas y sin blur), como un clic
#       blur-ventanas.sh --encender   en el botón Transparencias de Ajustes rápidos
#       blur-ventanas.sh --estado     muestra cómo está

set -euo pipefail

DIR=""
for uuid in powermichi@jlcampana.github.io transparencias@pandi.local; do
    d="$HOME/.local/share/gnome-shell/extensions/$uuid/schemas"
    [[ -f "$d/gschemas.compiled" ]] && { DIR="$d"; break; }
done
[[ -n "$DIR" ]] || { echo "Falta la extensión PowerMichi (install.sh de gnome.extension.powermichi)." >&2; exit 1; }
G() { gsettings --schemadir "$DIR" "$1" org.gnome.shell.extensions.transparencias "${@:2}"; }

case "${1:-todas}" in
    todas)    G set nautilus-blur true;  G set ptyxis-blur true ;;
    nautilus) G set nautilus-blur true;  G set ptyxis-blur false ;;
    ptyxis)   G set nautilus-blur false; G set ptyxis-blur true ;;
    --nivel)
        [[ "${2:-}" =~ ^[0-9]+$ && "$2" -le 100 ]] || { echo "Nivel no válido: 0-100" >&2; exit 1; }
        G set blur-nivel "$2" ;;
    --quitar)   G set nautilus-blur false; G set ptyxis-blur false ;;
    --apagar)   G set activado false ;;
    --encender) G set activado true ;;
    --estado) ;;
    *)
        echo "Uso: $(basename "$0") [nautilus|ptyxis|--nivel N|--quitar|--apagar|--encender|--estado]" >&2
        exit 1 ;;
esac
ACT="encendidas"; [[ "$(G get activado 2>/dev/null || echo true)" == true ]] || ACT="apagadas"
echo "Transparencias $ACT · Blur: Nautilus $(G get nautilus-blur) · Terminal $(G get ptyxis-blur) · nivel $(G get blur-nivel)"
