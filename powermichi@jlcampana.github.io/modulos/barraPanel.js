// Módulo Barra superior: la barra de un color fijo (por defecto el gris del panel lateral de
// Nautilus en Adwaita oscuro, #2e2e32 al 95 %) y, si se quiere, el dock igual.
//  - Barra: una hoja de estilo generada con la regla de #panel, encima del tema normal. Lleva
//    !important y las clases de Blur my Shell (.transparent-panel…) para que ninguna otra
//    extensión la vuelva transparente.
//  - Dock: ajustes de Dash to Dock (o de Ubuntu Dock, mismo esquema). Se escriben al cambiar el
//    color y al activar el módulo; al quitarlo el dock se queda como esté.
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {HojaEstilo, hexARgb} from './estilos.js';

const DOCKS = ['dash-to-dock@micxgx.gmail.com', 'ubuntu-dock@ubuntu.com'];
const ESQUEMA_DOCK = 'org.gnome.shell.extensions.dash-to-dock';

// Gio.Settings del dock: su esquema va dentro de la carpeta de la extensión
function ajustesDock() {
    for (const uuid of DOCKS) {
        const dir = Main.extensionManager.lookup(uuid)?.dir.get_child('schemas');
        let esquema = null;
        try {
            if (dir?.query_exists(null)) {
                esquema = Gio.SettingsSchemaSource.new_from_directory(dir.get_path(),
                    Gio.SettingsSchemaSource.get_default(), false).lookup(ESQUEMA_DOCK, true);
            }
        } catch {}
        esquema ??= Gio.SettingsSchemaSource.get_default().lookup(ESQUEMA_DOCK, true);
        if (esquema)
            return new Gio.Settings({settings_schema: esquema});
    }
    return null;
}

export default class BarraPanel {
    constructor(ext) {
        this._ajustes = ext.getSettings();
        this._hoja = new HojaEstilo('barra-panel');
        this._ids = ['barra-color', 'barra-opacidad', 'barra-dock'].map(k =>
            this._ajustes.connect(`changed::${k}`, () => this._aplicar()));
        this._aplicar();
    }

    _aplicar() {
        const [r, g, b] = hexARgb(this._ajustes.get_string('barra-color'));
        const opacidad = Math.round(this._ajustes.get_double('barra-opacidad') * 100) / 100;
        this._hoja.cargarTexto(`/* Generado por PowerMichi (módulo Barra superior) */
#panel,
#panel.transparent-panel,
#panel.dark-panel,
#panel.light-panel,
#panel.contrasted-panel {
  background-color: rgba(${r},${g},${b}, ${opacidad}) !important;
}
`);
        if (this._ajustes.get_boolean('barra-dock'))
            this._dock(`rgb(${r},${g},${b})`, opacidad);
    }

    _dock(color, opacidad) {
        const dock = ajustesDock();
        if (!dock)
            return;
        const poner = (clave, tipo, valor) => {
            if (dock.get_value(clave).deep_unpack() !== valor)
                dock[`set_${tipo}`](clave, valor);
        };
        poner('custom-background-color', 'boolean', true);
        poner('background-color', 'string', color);
        poner('background-opacity', 'double', opacidad);
        poner('transparency-mode', 'string', 'FIXED');
    }

    destroy() {
        this._ids.forEach(id => this._ajustes.disconnect(id));
        this._hoja.destroy();
    }
}
