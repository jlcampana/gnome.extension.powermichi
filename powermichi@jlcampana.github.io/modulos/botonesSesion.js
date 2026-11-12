// Módulo Botones de sesión en rojo: el botón de apagar de Ajustes rápidos (icono en blanco) y el
// de confirmar de dos tipos de diálogo de GNOME Shell, del color de botones-sesion-color
// (por defecto #e5484d, el mismo que el botón de cerrar de gtk-compacto.sh):
//   - Apagar, Reiniciar y Cerrar sesión
//   - Ventanas de contraseña (clase prompt-dialog): autenticación de administrador (polkit),
//     llavero, wifi y montar discos; por CSS no se pueden distinguir
// Esos botones no llevan ninguna clase distintiva; «Cancelar» es siempre el primero, así que se
// pintan todos menos el primero (también «Opciones de arranque», que sale con Alt).
import {HojaEstilo, hexARgb} from './estilos.js';

// Multiplica cada canal, con tope en 255
function tono(hex, factor) {
    return '#' + hexARgb(hex).map(v => Math.min(255, Math.round(v * factor))
        .toString(16).padStart(2, '0')).join('');
}

function reglas(p, color, claro, oscuro) {
    return `${p} {
  color: #ffffff;
  background-color: ${color};
}

${p}:hover,
${p}:focus:hover {
  background-color: ${claro};
}

${p}:active,
${p}:active:hover,
${p}:active:focus {
  background-color: ${oscuro};
}

${p}:focus {
  background-color: ${color};
}

/* Cancelar: estilo normal de GNOME (valores del tema oscuro de GNOME Shell 50) */
${p}:first-child {
  background-color: rgba(255, 255, 255, 0.1);
}

${p}:first-child:hover {
  background-color: rgba(255, 255, 255, 0.13);
}

${p}:first-child:active {
  background-color: rgba(255, 255, 255, 0.16);
}

${p}:first-child:focus {
  background-color: st-mix(st-mix(-st-accent-color, #ffffff, 60%), rgba(255, 255, 255, 0.1), 5%);
}
`;
}

export function css(color) {
    const claro = tono(color, 1.06), oscuro = tono(color, 0.87);
    const boton = '.quick-settings-system-item > StBoxLayout > .icon-button:last-child';
    return `/* Generado por PowerMichi (módulo Botones de sesión en rojo) */

/* Apagar / Reiniciar / Cerrar sesión */
${reglas('.modal-dialog.end-session-dialog .modal-dialog-button-box .modal-dialog-button', color, claro, oscuro)}
/* Ventanas de contraseña: autenticación (polkit), llavero, wifi, montar discos */
${reglas('.modal-dialog.prompt-dialog .modal-dialog-button-box .modal-dialog-button', color, claro, oscuro)}
/* Botón de apagar del menú de Ajustes rápidos (el último de la fila de arriba) */
${boton} {
  color: #ffffff;
  background-color: ${color};
}

${boton}:hover,
${boton}:focus {
  background-color: ${claro};
}

${boton}:active,
${boton}:checked {
  background-color: ${oscuro};
}
`;
}

export default class BotonesSesion {
    constructor(ext) {
        this._ajustes = ext.getSettings();
        this._hoja = new HojaEstilo('botones-sesion');
        this._id = this._ajustes.connect('changed::botones-sesion-color', () => this._aplicar());
        this._aplicar();
    }

    _aplicar() {
        const [r, g, b] = hexARgb(this._ajustes.get_string('botones-sesion-color'), [0xe5, 0x48, 0x4d]);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        this._hoja.cargarTexto(css(hex));
    }

    destroy() {
        this._ajustes.disconnect(this._id);
        this._hoja.destroy();
    }
}
