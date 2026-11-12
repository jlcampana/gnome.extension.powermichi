// Módulo Botón de aplicaciones: imagen propia en el botón «Mostrar aplicaciones» de Dash to Dock.
// El icono del botón lo crea BaseIcon.createIcon(size) cada vez que cambia el tamaño o el tema de
// iconos: se envuelve esa función para poner la imagen en el St.Icon que devuelve.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const IMAGEN_POR_DEFECTO = GLib.build_filenamev(
    [GLib.get_user_data_dir(), 'icons', 'apps-propias', 'boton-aplicaciones.png']);

export default class BotonAplicaciones {
    constructor(ext) {
        this._ajustes = ext.getSettings();
        this._tocados = new Set();   // BaseIcon del botón con createIcon cambiado
        this._ponerImagen();
        this._idImagen = this._ajustes.connect('changed::boton-aplicaciones-imagen', () => {
            this._ponerImagen();
            this._tocados.forEach(icono => icono._createIconTexture(icono.iconSize));
        });
        // Dash to Dock añade cada dock a Main.layoutManager.uiGroup (addChrome) y los rehace a
        // menudo. Ahí entran también menús, notificaciones y OSD: las altas se agrupan en una sola
        // búsqueda justo antes de pintar el siguiente fotograma (como hace P7 Borders).
        this._laters = global.compositor.get_laters();
        this._idLater = 0;
        this._id = Main.layoutManager.uiGroup.connect('child-added', () => {
            this._idLater ||= this._laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
                this._idLater = 0;
                this._buscar();
                return GLib.SOURCE_REMOVE;
            });
        });
        this._buscar();
    }

    _ponerImagen() {
        const ruta = this._ajustes.get_string('boton-aplicaciones-imagen') || IMAGEN_POR_DEFECTO;
        this._gicon = Gio.FileIcon.new(Gio.File.new_for_path(ruta));
    }

    _buscar() {
        for (const hijo of Main.layoutManager.uiGroup.get_children()) {
            const icono = hijo.dash?._showAppsIcon?.icon;
            if (!icono || this._tocados.has(icono))
                continue;
            const original = icono.createIcon;
            icono._createIconOriginal = original;
            icono.createIcon = size => {
                const actor = original(size);
                actor.fallbackIconName = null;
                actor.fallbackGicon = null;
                actor.gicon = this._gicon;
                return actor;
            };
            icono._createIconTexture(icono.iconSize);
            this._tocados.add(icono);
            icono.connect('destroy', () => this._tocados?.delete(icono));
        }
    }

    destroy() {
        Main.layoutManager.uiGroup.disconnect(this._id);
        if (this._idLater)
            this._laters.remove(this._idLater);
        this._ajustes.disconnect(this._idImagen);
        this._tocados.forEach(icono => {
            icono.createIcon = icono._createIconOriginal;
            delete icono._createIconOriginal;
            icono._createIconTexture(icono.iconSize);
        });
        this._tocados = null;
        this._gicon = null;
    }
}
