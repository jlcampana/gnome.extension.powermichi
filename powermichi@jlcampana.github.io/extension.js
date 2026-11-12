// PowerMichi: retoques propios de GNOME reunidos en una sola extensión.
//
// Cada retoque es un módulo de modulos/ con la forma
//     new Modulo(ext)   lo pone en marcha
//     modulo.destroy()  lo quita y deja GNOME como estaba
// y se enciende o se apaga en directo con su clave modulo-* (pestañas de los ajustes). Un módulo
// que falle se queda apagado sin arrastrar a los demás.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import PantallaActiva from './modulos/pantallaActiva.js';
import Transparencias from './modulos/transparencias.js';
import BarraPanel from './modulos/barraPanel.js';
import BotonesSesion from './modulos/botonesSesion.js';
import BotonAplicaciones from './modulos/botonAplicaciones.js';
import ClicBandeja from './modulos/clicBandeja.js';
import Capturas from './modulos/capturas.js';
import Reborde from './modulos/reborde.js';
import {limpiarCache} from './modulos/estilos.js';

const MODULOS = [
    ['modulo-pantalla-activa', PantallaActiva],
    ['modulo-transparencias', Transparencias],
    ['modulo-barra-panel', BarraPanel],
    ['modulo-botones-sesion', BotonesSesion],
    ['modulo-reborde', Reborde],
    ['modulo-boton-aplicaciones', BotonAplicaciones],
    ['modulo-clic-bandeja', ClicBandeja],
    ['modulo-capturas', Capturas],
];

export default class PowerMichi extends Extension {
    enable() {
        limpiarCache();
        this._ajustes = this.getSettings();
        this._activos = new Map();   // clave -> módulo en marcha
        this._ids = MODULOS.map(([clave, Clase]) => {
            this._sincronizar(clave, Clase);
            return this._ajustes.connect(`changed::${clave}`, () => this._sincronizar(clave, Clase));
        });
    }

    // Sin session-modes la extensión solo vive en la sesión normal: al bloquear la pantalla se
    // llama a disable() y todo se quita (Pantalla activa deja de evitar el apagado, como antes).
    disable() {
        this._ids.forEach(id => this._ajustes.disconnect(id));
        this._ids = null;
        // Al revés de como se encendieron
        [...this._activos.keys()].reverse().forEach(clave => this._apagar(clave));
        this._activos = null;
        this._ajustes = null;
    }

    _sincronizar(clave, Clase) {
        const quiere = this._ajustes.get_boolean(clave);
        if (quiere && !this._activos.has(clave)) {
            try {
                this._activos.set(clave, new Clase(this));
            } catch (e) {
                console.error(`PowerMichi: no se pudo activar ${clave}: ${e.message}\n${e.stack}`);
            }
        } else if (!quiere && this._activos.has(clave)) {
            this._apagar(clave);
        }
    }

    _apagar(clave) {
        try {
            this._activos.get(clave).destroy();
        } catch (e) {
            console.error(`PowerMichi: error al desactivar ${clave}: ${e.message}\n${e.stack}`);
        }
        this._activos.delete(clave);
    }
}
