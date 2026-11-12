// Módulo Reborde: borde alrededor de todas las ventanas (también Brave, VS Code, apps Qt…), con
// el código de P7 Borders (carpeta reborde/, licencia MIT). Usa el esquema de ajustes de la
// extensión original (org.gnome.shell.extensions.p7-borders): grosor default-width, color de la
// ventana activa default-active-color ('auto-solid' = color de acento) y de las demás
// default-inactive-color.
import {BorderManager} from '../reborde/shell/bordermanager.js';

export const ESQUEMA = 'org.gnome.shell.extensions.p7-borders';

export default class Reborde {
    constructor(ext) {
        this._gestor = new BorderManager(console, ext.getSettings(ESQUEMA));
        this._gestor.enable();
    }

    destroy() {
        this._gestor.disable();
        this._gestor = null;
    }
}
