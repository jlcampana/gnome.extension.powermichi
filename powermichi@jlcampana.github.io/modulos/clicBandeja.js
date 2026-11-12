// Módulo Clic en la bandeja: clic izquierdo en un icono de la bandeja (AppIndicator) = abrir su app.
// Qué iconos y qué apps: clave clic-bandeja-apps (Id del icono -> lanzador .desktop).
// Se engancha a captured-event del icono: es la fase de captura, la primera por la que pasa un
// evento, antes que los gestos (ClickGesture del botón del panel, que abre el menú) y que el
// manejador de AppIndicator. Cortando ahí la pulsación y la suelta del botón izquierdo, el menú
// no llega a abrirse. El clic derecho y el central no se tocan.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Abre la app de un lanzador .desktop. Si el lanzador está marcado como oculto (Hidden=true, como
// el de 1Password), Gio no lo carga: entonces se lee su Exec y se ejecuta tal cual.
function abrir(app) {
    const info = Gio.DesktopAppInfo.new(app);
    if (info) {
        info.launch([], global.create_app_launch_context(0, -1));
        return;
    }
    for (const dir of [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()]) {
        const ruta = GLib.build_filenamev([dir, 'applications', app]);
        if (!GLib.file_test(ruta, GLib.FileTest.EXISTS))
            continue;
        const kf = new GLib.KeyFile();
        kf.load_from_file(ruta, GLib.KeyFileFlags.NONE);
        const exec = kf.get_string('Desktop Entry', 'Exec').replace(/ ?%[a-zA-Z]/g, '');
        GLib.spawn_command_line_async(exec);
        return;
    }
    console.warn(`clic-bandeja: no encuentro ${app}`);
}

export default class ClicBandeja {
    constructor(ext) {
        this._ajustes = ext.getSettings();
        this._leerApps();
        // Los iconos ya enganchados leen this._apps en cada clic: basta con releer la tabla
        this._idApps = this._ajustes.connect('changed::clic-bandeja-apps', () => {
            this._leerApps();
            this._buscar();
        });
        this._enganchados = new Map();   // icono -> id de señal
        // El icono puede entrar en cualquiera de las tres cajas de la barra (AppIndicator lo pone
        // donde diga su ajuste tray-pos y otras extensiones lo mueven)
        this._cajas = [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox]
            .map(caja => [caja, caja.connect('child-added', () => this._buscar())]);
        this._buscar();
    }

    // Id de la app en la bandeja (propiedad Id de StatusNotifierItem) -> lanzador que abre
    _leerApps() {
        this._apps = this._ajustes.get_value('clic-bandeja-apps').deep_unpack();
    }

    _buscar() {
        // AppIndicator registra cada icono como "appindicator-<bus>@<ruta>", que cambia cada vez
        // que se abre la app: se busca por el Id de la app, que es fijo
        for (const [clave, icono] of Object.entries(Main.panel.statusArea)) {
            if (!clave.startsWith('appindicator-') || !icono || this._enganchados.has(icono))
                continue;
            let nombre;
            try {
                nombre = icono._indicator?.id;
            } catch {}
            if (!nombre || !this._apps[nombre])
                continue;
            console.log(`clic-bandeja: enganchado a ${nombre} (abre ${this._apps[nombre]})`);
            const id = icono.connect('captured-event', (_actor, evento) => {
                const tipo = evento.type();
                if (tipo !== Clutter.EventType.BUTTON_PRESS && tipo !== Clutter.EventType.BUTTON_RELEASE)
                    return Clutter.EVENT_PROPAGATE;
                const app = this._apps?.[nombre];
                if (!app || evento.get_button() !== Clutter.BUTTON_PRIMARY)
                    return Clutter.EVENT_PROPAGATE;   // clic derecho / central, o ya no está en la lista
                if (tipo === Clutter.EventType.BUTTON_PRESS) {
                    console.log(`clic-bandeja: clic en ${nombre}, abriendo ${app}`);
                    try {
                        abrir(app);
                    } catch (e) {
                        console.warn(`clic-bandeja: no se pudo abrir ${app}: ${e.message}`);
                    }
                }
                return Clutter.EVENT_STOP;
            });
            this._enganchados.set(icono, id);
            icono.connect('destroy', () => this._enganchados?.delete(icono));
        }
    }

    destroy() {
        this._ajustes.disconnect(this._idApps);
        this._cajas?.forEach(([caja, id]) => caja.disconnect(id));
        this._cajas = null;
        this._enganchados?.forEach((id, icono) => {
            try {
                icono.disconnect(id);
            } catch {}
        });
        this._enganchados = null;
    }
}
