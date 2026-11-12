// Módulo Pantalla activa: botón en Ajustes rápidos que evita el bloqueo y el apagado de la pantalla.
//
// No toca los ajustes de energía ni de bloqueo del usuario: mientras está activo mantiene un
// inhibidor de inactividad en gnome-session, el mismo mecanismo que usa un reproductor de vídeo.
// Al quitarlo, o si la Shell termina, todo vuelve a funcionar como estaba configurado.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';

const NOMBRE = 'Pantalla activa';
const ICONO = 'video-display-symbolic';
const INHIBIR_INACTIVIDAD = 8;   // GsmInhibitorFlag: no bloquea la suspensión manual ni cerrar sesión

function llamarSesion(metodo, parametros, alTerminar) {
    Gio.DBus.session.call(
        'org.gnome.SessionManager',
        '/org/gnome/SessionManager',
        'org.gnome.SessionManager',
        metodo,
        parametros,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        alTerminar);
}

// Inhibit es asíncrono: el botón puede cambiar, o la extensión desactivarse, antes de que llegue
// la respuesta. Solo hay una petición en curso y, al llegar, se vuelve a comparar con lo deseado
// para no dejar nunca un inhibidor huérfano.
class Inhibidor {
    constructor() {
        this._deseado = false;
        this._cookie = 0;
        this._pidiendo = false;
    }

    establecer(activo) {
        this._deseado = activo;
        this._sincronizar();
    }

    _sincronizar() {
        if (this._pidiendo)
            return;
        if (this._deseado && !this._cookie)
            this._inhibir();
        else if (!this._deseado && this._cookie)
            this._liberar();
    }

    _inhibir() {
        this._pidiendo = true;
        const parametros = new GLib.Variant('(susu)',
            ['avoid-screen-off', 0, 'Activado desde Ajustes rápidos', INHIBIR_INACTIVIDAD]);
        llamarSesion('Inhibit', parametros, (conexion, resultado) => {
            this._pidiendo = false;
            try {
                [this._cookie] = conexion.call_finish(resultado).deep_unpack();
            } catch (e) {
                console.error(`${NOMBRE}: no se pudo inhibir: ${e.message}`);
                if (this._deseado)
                    Main.notifyError(NOMBRE, 'No se pudo evitar el apagado de la pantalla');
                return;
            }
            this._sincronizar();
        });
    }

    _liberar() {
        const parametros = new GLib.Variant('(u)', [this._cookie]);
        this._cookie = 0;
        llamarSesion('Uninhibit', parametros, (conexion, resultado) => {
            try {
                conexion.call_finish(resultado);
            } catch (e) {
                console.error(`${NOMBRE}: no se pudo liberar: ${e.message}`);
            }
        });
    }
}

const Boton = GObject.registerClass(
class Boton extends QuickToggle {
    _init(ajustes) {
        super._init({title: NOMBRE, iconName: ICONO, toggleMode: true});
        ajustes.bind('enabled', this, 'checked', Gio.SettingsBindFlags.DEFAULT);
    }
});

const Indicador = GObject.registerClass(
class Indicador extends SystemIndicator {
    _init(ajustes) {
        super._init();
        const boton = new Boton(ajustes);
        this.quickSettingsItems.push(boton);

        // Icono en la barra superior: con el bloqueo desactivado conviene que se vea
        const icono = this._addIndicator();
        icono.iconName = ICONO;
        boton.bind_property('checked', icono, 'visible', GObject.BindingFlags.SYNC_CREATE);
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

// El ajuste «enabled» sigue en su esquema de siempre (org.gnome.shell.extensions.avoid-screen-off).
// No se toca al desactivar: al volver (p. ej. tras desbloquear) el botón queda como estaba.
export default class PantallaActiva {
    constructor(ext) {
        this._ajustes = ext.getSettings('org.gnome.shell.extensions.avoid-screen-off');
        this._inhibidor = new Inhibidor();
        this._idCambio = this._ajustes.connect('changed::enabled', () => this._aplicar());
        this._aplicar();

        this._indicador = new Indicador(this._ajustes);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicador);
    }

    destroy() {
        this._indicador.destroy();
        this._indicador = null;
        this._ajustes.disconnect(this._idCambio);
        this._ajustes = null;
        this._inhibidor.establecer(false);
        this._inhibidor = null;
    }

    _aplicar() {
        this._inhibidor.establecer(this._ajustes.get_boolean('enabled'));
    }
}
