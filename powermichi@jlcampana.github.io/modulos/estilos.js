// Hojas de estilo que se cargan y se quitan en directo (las de una extensión, stylesheet.css,
// solo se cargan al activarla entera). GNOME pasa las hojas cargadas al tema nuevo cuando
// cambia de tema (ui/main.js, loadTheme), así que no hay que volver a cargarlas.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

const DIR_CACHE = GLib.build_filenamev([GLib.get_user_cache_dir(), 'powermichi']);

// Borra las hojas generadas que hayan quedado de otra sesión
export function limpiarCache() {
    const dir = Gio.File.new_for_path(DIR_CACHE);
    try {
        const lista = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        for (let info; (info = lista.next_file(null));) {
            if (info.get_name().endsWith('.css'))
                dir.get_child(info.get_name()).delete(null);
        }
    } catch {}
}

// '#rrggbb' -> [r, g, b]; si no es válido, el color de reserva
export function hexARgb(hex, reserva = [0x2e, 0x2e, 0x32]) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? m.slice(1).map(v => parseInt(v, 16)) : reserva;
}

export class HojaEstilo {
    constructor(nombre) {
        this._nombre = nombre;
        this._fichero = null;
        this._generado = false;
    }

    _tema() {
        return St.ThemeContext.get_for_stage(global.stage).get_theme();
    }

    cargarFichero(fichero, generado = false) {
        this.quitar();
        this._tema().load_stylesheet(fichero);
        this._fichero = fichero;
        this._generado = generado;
    }

    // Cada versión va a un fichero con nombre nuevo: St reconoce las hojas por su fichero y así
    // no hay dudas de que vuelve a leerla.
    cargarTexto(css) {
        GLib.mkdir_with_parents(DIR_CACHE, 0o700);
        const fichero = Gio.File.new_for_path(
            GLib.build_filenamev([DIR_CACHE, `${this._nombre}-${GLib.get_monotonic_time()}.css`]));
        fichero.replace_contents(new TextEncoder().encode(css), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        this.cargarFichero(fichero, true);
    }

    quitar() {
        if (!this._fichero)
            return;
        try {
            this._tema().unload_stylesheet(this._fichero);
        } catch {}
        if (this._generado) {
            try {
                this._fichero.delete(null);
            } catch {}
        }
        this._fichero = null;
    }

    destroy() {
        this.quitar();
    }
}
