// Ajustes de PowerMichi (app Extensiones → PowerMichi → Ajustes): una pestaña por grupo de retoques. Cada
// módulo tiene arriba su interruptor «Activado» (claves modulo-*), que lo enciende o lo apaga
// en directo; sus opciones solo se pueden tocar con el módulo activado.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const IMAGEN_POR_DEFECTO = GLib.build_filenamev(
    [GLib.get_user_data_dir(), 'icons', 'apps-propias', 'boton-aplicaciones.png']);

// Grupo con el interruptor del módulo; devuelve [grupo, añadir], y lo que se añade con añadir()
// queda desactivado mientras el módulo esté apagado.
function grupoModulo(ajustes, clave, titulo, descripcion) {
    const grupo = new Adw.PreferencesGroup({title: titulo, description: descripcion});
    const fila = new Adw.SwitchRow({title: 'Activado'});
    ajustes.bind(clave, fila, 'active', Gio.SettingsBindFlags.DEFAULT);
    grupo.add(fila);
    const añadir = widget => {
        ajustes.bind(clave, widget, 'sensitive', Gio.SettingsBindFlags.GET);
        grupo.add(widget);
        return widget;
    };
    return [grupo, añadir];
}

function escala(min, max, ancho = 220) {
    return new Gtk.Scale({
        adjustment: new Gtk.Adjustment({lower: min, upper: max, step_increment: 1, page_increment: 5}),
        digits: 0, draw_value: true, value_pos: Gtk.PositionType.RIGHT,
        hexpand: true, valign: Gtk.Align.CENTER, width_request: ancho,
    });
}

// Fila con deslizador de porcentaje (min–100 %) sobre una clave double 0–1
function filaPorcentaje(ajustes, clave, titulo, subtitulo, min) {
    const fila = new Adw.ActionRow({title: titulo, subtitle: subtitulo ?? ''});
    const e = escala(min, 100);
    e.set_format_value_func((_e, v) => `${Math.round(v)} %`);
    let actualizando = false;
    const refrescar = () => {
        actualizando = true;
        e.set_value(Math.round(ajustes.get_double(clave) * 100));
        actualizando = false;
    };
    e.connect('value-changed', () => {
        if (!actualizando)
            ajustes.set_double(clave, e.get_value() / 100);
    });
    const id = ajustes.connect(`changed::${clave}`, refrescar);
    e.connect('destroy', () => ajustes.disconnect(id));
    refrescar();
    fila.add_suffix(e);
    return fila;
}

// Fila con botón de color sobre una clave '#rrggbb', y botón para volver al valor por defecto
function filaColorClave(ajustes, clave, titulo, textoRestaurar, alRestaurar) {
    const fila = new Adw.ActionRow({title: titulo});
    const color = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({with_alpha: false, title: titulo}),
        valign: Gtk.Align.CENTER,
    });
    const leer = () => {
        const rgba = new Gdk.RGBA();
        if (rgba.parse(ajustes.get_string(clave)))
            color.set_rgba(rgba);
        fila.subtitle = ajustes.get_string(clave);
    };
    leer();
    const id = ajustes.connect(`changed::${clave}`, leer);
    color.connect('destroy', () => ajustes.disconnect(id));
    color.connect('notify::rgba', () => {
        const c = color.get_rgba();
        const hex = '#' + [c.red, c.green, c.blue]
            .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
        if (hex !== ajustes.get_string(clave))
            ajustes.set_string(clave, hex);
    });
    const restaurar = new Gtk.Button({
        icon_name: 'edit-undo-symbolic', valign: Gtk.Align.CENTER,
        tooltip_text: textoRestaurar, css_classes: ['flat'],
    });
    restaurar.connect('clicked', () => {
        ajustes.reset(clave);
        alRestaurar?.();
    });
    fila.add_suffix(restaurar);
    fila.add_suffix(color);
    return fila;
}

// Color del reborde. 'auto-solid' = color de acento de GNOME. Las ventanas inactivas llevan el
// mismo color al 50 % (con el acento, el azul de GNOME al 50 %, como dejaba reborde-ventanas.sh).
function filaColorReborde(ajustes) {
    const fila = new Adw.ActionRow({title: 'Color', subtitle: 'Ventana activa; las demás, el mismo al 50 %'});
    const acento = new Gtk.CheckButton({label: 'Acento', valign: Gtk.Align.CENTER,
        tooltip_text: 'Usar el color de acento de GNOME'});
    const color = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({with_alpha: false, title: 'Color del reborde'}),
        valign: Gtk.Align.CENTER,
    });
    let actualizando = false;
    const leer = () => {
        actualizando = true;
        const v = ajustes.get_string('default-active-color');
        const esAcento = v === 'auto' || v === 'auto-solid';
        acento.active = esAcento;
        color.sensitive = !esAcento;
        // Con el acento, el botón muestra el azul de GNOME (desactivado)
        const rgba = new Gdk.RGBA();
        if (rgba.parse(esAcento ? '#3584e4' : v))
            color.set_rgba(rgba);
        actualizando = false;
    };
    const escribir = () => {
        if (actualizando)
            return;
        if (acento.active) {
            ajustes.set_string('default-active-color', 'auto-solid');
            ajustes.set_string('default-inactive-color', 'rgba(53, 132, 228, 0.5)');
        } else {
            const c = color.get_rgba();
            const [r, g, b] = [c.red, c.green, c.blue].map(v => Math.round(v * 255));
            ajustes.set_string('default-active-color', `rgb(${r}, ${g}, ${b})`);
            ajustes.set_string('default-inactive-color', `rgba(${r}, ${g}, ${b}, 0.5)`);
        }
        color.sensitive = !acento.active;
    };
    leer();
    const id = ajustes.connect('changed::default-active-color', leer);
    color.connect('destroy', () => ajustes.disconnect(id));
    acento.connect('toggled', escribir);
    color.connect('notify::rgba', escribir);
    fila.add_suffix(acento);
    fila.add_suffix(color);
    return fila;
}

export default class PowerMichiPrefs extends ExtensionPreferences {
    fillPreferencesWindow(ventana) {
        const powermichi = this.getSettings();
        const pantalla = this.getSettings('org.gnome.shell.extensions.avoid-screen-off');
        const transp = this.getSettings('org.gnome.shell.extensions.transparencias');
        const reborde = this.getSettings('org.gnome.shell.extensions.p7-borders');
        // Que los Gio.Settings vivan lo que la ventana (si no, se pierden las señales)
        ventana._ajustes = [powermichi, pantalla, transp, reborde];
        ventana.set_default_size(880, 780);

        ventana.add(this._paginaPantalla(powermichi, pantalla));
        ventana.add(this._paginaTransparencias(powermichi, transp));
        ventana.add(this._paginaAspecto(powermichi, ventana, reborde));
        ventana.add(this._paginaVentanas(ventana));
        ventana.add(this._paginaExtras(powermichi));
    }

    // --- Pantalla activa

    _paginaPantalla(powermichi, pantalla) {
        const pagina = new Adw.PreferencesPage({title: 'Pantalla activa', icon_name: 'video-display-symbolic'});
        const [grupo, añadir] = grupoModulo(powermichi, 'modulo-pantalla-activa', 'Pantalla activa',
            'Botón en Ajustes rápidos que, mientras está encendido, evita el bloqueo y el apagado ' +
            'automáticos de la pantalla. No cambia los ajustes de energía: pide a la sesión que no ' +
            'se considere inactiva, como hace un reproductor de vídeo.');
        const fila = new Adw.SwitchRow({
            title: 'Evitar el bloqueo y el apagado',
            subtitle: 'Lo mismo que el botón de Ajustes rápidos',
        });
        pantalla.bind('enabled', fila, 'active', Gio.SettingsBindFlags.DEFAULT);
        añadir(fila);
        pagina.add(grupo);
        return pagina;
    }

    // --- Transparencias

    _paginaTransparencias(powermichi, ajustes) {
        const pagina = new Adw.PreferencesPage({title: 'Transparencias', icon_name: 'weather-fog-symbolic'});
        const [grupo, añadir] = grupoModulo(powermichi, 'modulo-transparencias', 'Transparencias',
            'Botón en Ajustes rápidos con la opacidad y el blur de Nautilus y de la terminal. ' +
            'Más alto el nivel de blur = más desenfocado y algo más de trabajo para la tarjeta gráfica.');
        const filaActivado = new Adw.SwitchRow({
            title: 'Transparencias encendidas',
            subtitle: 'Lo mismo que un clic en el botón de Ajustes rápidos. Apagadas, las ventanas quedan opacas y sin blur',
        });
        ajustes.bind('activado', filaActivado, 'active', Gio.SettingsBindFlags.DEFAULT);
        añadir(filaActivado);
        const filaNivel = new Adw.ActionRow({title: 'Nivel de blur', subtitle: 'Común a todas las ventanas con blur. Por defecto: 21'});
        const nivel = escala(0, 100);
        for (const marca of [10, 21, 40])
            nivel.add_mark(marca, Gtk.PositionType.BOTTOM, null);
        ajustes.bind('blur-nivel', nivel.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        filaNivel.add_suffix(nivel);
        añadir(filaNivel);
        pagina.add(grupo);

        const blur = clave => {
            const fila = new Adw.SwitchRow({title: 'Blur', subtitle: 'Desenfoque detrás de la ventana'});
            ajustes.bind(clave, fila, 'active', Gio.SettingsBindFlags.DEFAULT);
            return fila;
        };
        const hayPtyxis = !!Gio.SettingsSchemaSource.get_default().lookup('org.gnome.Ptyxis', true);
        const apps = [
            ['Nautilus', 'La opacidad la aplica la extensión de nautilus-python opacidad-nautilus.py', 'nautilus'],
            ['Terminal (Ptyxis)', hayPtyxis ? 'La opacidad se pone en todos los perfiles de Ptyxis, también en los nuevos'
                : 'Ptyxis no está instalado', 'ptyxis'],
        ];
        for (const [titulo, descripcion, app] of apps) {
            const g = new Adw.PreferencesGroup({title: titulo, description: descripcion});
            g.add(filaPorcentaje(ajustes, `${app}-opacity`, 'Opacidad', null, 50));
            g.add(blur(`${app}-blur`));
            powermichi.bind('modulo-transparencias', g, 'sensitive', Gio.SettingsBindFlags.GET);
            pagina.add(g);
        }
        return pagina;
    }

    // --- Aspecto: barra, botones de sesión, botón de aplicaciones

    _paginaAspecto(powermichi, ventana, reborde) {
        const pagina = new Adw.PreferencesPage({title: 'Aspecto', icon_name: 'applications-graphics-symbolic'});

        // Barra superior
        const [gBarra, añadirBarra] = grupoModulo(powermichi, 'modulo-barra-panel', 'Barra superior',
            'Barra superior de un color fijo, aunque otras extensiones (Blur my Shell…) intenten ' +
            'volverla transparente. Por defecto, el gris del panel lateral de Nautilus.');
        añadirBarra(filaColorClave(powermichi, 'barra-color', 'Color', 'Volver al gris por defecto',
            () => powermichi.reset('barra-opacidad')));
        añadirBarra(filaPorcentaje(powermichi, 'barra-opacidad', 'Opacidad', null, 0));
        const filaDock = new Adw.SwitchRow({
            title: 'El dock del mismo color',
            subtitle: 'Pone el color y la opacidad en los ajustes de Dash to Dock',
        });
        powermichi.bind('barra-dock', filaDock, 'active', Gio.SettingsBindFlags.DEFAULT);
        añadirBarra(filaDock);
        pagina.add(gBarra);

        // Reborde de las ventanas (P7 Borders)
        const [gReborde, añadirReborde] = grupoModulo(powermichi, 'modulo-reborde', 'Reborde de las ventanas',
            'Borde alrededor de todas las ventanas: el color elegido en la activa y el mismo, más ' +
            'transparente, en las demás.');
        const filaGrosor = new Adw.SpinRow({
            title: 'Grosor', subtitle: 'Píxeles',
            adjustment: new Gtk.Adjustment({lower: 1, upper: 20, step_increment: 1, page_increment: 2}),
        });
        reborde.bind('default-width', filaGrosor.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        añadirReborde(filaGrosor);
        añadirReborde(filaColorReborde(reborde));
        pagina.add(gReborde);

        // Botones de sesión
        const [gSesion, añadirSesion] = grupoModulo(powermichi, 'modulo-botones-sesion', 'Botones de sesión en rojo',
            'El botón de apagar de Ajustes rápidos y el de confirmar de los diálogos de Apagar, ' +
            'Reiniciar, Cerrar sesión y contraseña (polkit, llavero, wifi, discos) en rojo. ' +
            '«Cancelar» conserva su estilo.');
        añadirSesion(filaColorClave(powermichi, 'botones-sesion-color', 'Color', 'Volver al rojo por defecto (#e5484d)'));
        pagina.add(gSesion);

        // Botón de aplicaciones
        const [gBoton, añadirBoton] = grupoModulo(powermichi, 'modulo-boton-aplicaciones',
            'Botón de aplicaciones del dock', 'Imagen propia en el botón «Mostrar aplicaciones» de Dash to Dock.');
        const filaImagen = new Adw.ActionRow({title: 'Imagen'});
        const vista = new Gtk.Image({pixel_size: 40, valign: Gtk.Align.CENTER});
        const leerImagen = () => {
            const ruta = powermichi.get_string('boton-aplicaciones-imagen') || IMAGEN_POR_DEFECTO;
            filaImagen.subtitle = GLib.markup_escape_text(ruta.replace(GLib.get_home_dir(), '~'), -1);
            if (GLib.file_test(ruta, GLib.FileTest.EXISTS))
                vista.set_from_file(ruta);
            else
                vista.set_from_icon_name('image-missing-symbolic');
        };
        leerImagen();
        const idImagen = powermichi.connect('changed::boton-aplicaciones-imagen', leerImagen);
        vista.connect('destroy', () => powermichi.disconnect(idImagen));
        const elegir = new Gtk.Button({label: 'Elegir…', valign: Gtk.Align.CENTER});
        elegir.connect('clicked', () => {
            const filtro = new Gtk.FileFilter({name: 'Imágenes'});
            filtro.add_pixbuf_formats();
            const filtros = new Gio.ListStore({item_type: Gtk.FileFilter});
            filtros.append(filtro);
            const dialogo = new Gtk.FileDialog({title: 'Imagen del botón de aplicaciones', filters: filtros});
            dialogo.open(ventana, null, (_d, res) => {
                try {
                    const f = dialogo.open_finish(res);
                    if (f)
                        powermichi.set_string('boton-aplicaciones-imagen', f.get_path());
                } catch {}   // cancelado
            });
        });
        const porDefecto = new Gtk.Button({
            icon_name: 'edit-undo-symbolic', valign: Gtk.Align.CENTER, css_classes: ['flat'],
            tooltip_text: 'Volver a la imagen por defecto',
        });
        porDefecto.connect('clicked', () => powermichi.reset('boton-aplicaciones-imagen'));
        filaImagen.add_prefix(vista);
        filaImagen.add_suffix(porDefecto);
        filaImagen.add_suffix(elegir);
        añadirBoton(filaImagen);
        pagina.add(gBoton);

        return pagina;
    }

    // --- Ventanas: retoques de las apps GTK en gtk.css
    //
    // Los aplican los mismos scripts de siempre (gtk-compacto.sh…), que install.sh copia en
    // scripts/ dentro de la extensión: así el CSS está en un solo sitio. Cada uno escribe su
    // bloque entre marcadores en ~/.config/gtk-4.0/gtk.css (y gtk-3.0); el interruptor mira si
    // el bloque está.

    _paginaVentanas(ventana) {
        const pagina = new Adw.PreferencesPage({title: 'Ventanas', icon_name: 'focus-windows-symbolic'});
        const grupo = new Adw.PreferencesGroup({
            title: 'Apps GTK',
            description: 'Retoques en ~/.config/gtk-4.0/gtk.css (y gtk-3.0). Las apps los cogen al ' +
                'volver a abrirlas.',
        });
        const retoques = [
            ['gtk-compacto', 'Estilo macOS',
                'Barras de título compactas, botón de cerrar rojo y redondo, pestañas más bajas ' +
                '(terminal, Nautilus…) y la terminal sin la ruta bajo el título'],
            ['nautilus-compacto', 'Nautilus compacto',
                'Sin el título «Archivos» en la barra lateral, letra más pequeña y filas más bajas'],
            ['dialogos-confirmacion', 'Diálogos de confirmación',
                'Botones en fila en vez de uno encima de otro y el de borrar o vaciar en rojo'],
        ];
        for (const [nombre, titulo, subtitulo] of retoques)
            grupo.add(this._filaRetoqueGtk(ventana, nombre, titulo, subtitulo));
        pagina.add(grupo);
        pagina.add(this._grupoNautilus(ventana));
        return pagina;
    }

    // Extensiones de nautilus-python: activar = copiarla desde nautilus-python/ de esta extensión
    // a ~/.local/share/nautilus-python/extensions; desactivar = borrarla de allí. Nautilus las
    // carga al arrancar. (opacidad-nautilus.py no sale: la necesita el módulo Transparencias.)
    _grupoNautilus(ventana) {
        const grupo = new Adw.PreferencesGroup({
            title: 'Nautilus',
            description: 'Extensiones de nautilus-python. Nautilus las carga al reiniciarlo.',
        });
        const destino = Gio.File.new_for_path(GLib.build_filenamev(
            [GLib.get_user_data_dir(), 'nautilus-python', 'extensions']));
        const origen = this.dir.get_child('nautilus-python');
        const hayNautilusPython = ['/usr/lib64', '/usr/lib', '/usr/lib/x86_64-linux-gnu'].some(d =>
            GLib.file_test(`${d}/nautilus/extensions-4/libnautilus-python.so`, GLib.FileTest.EXISTS));
        const extensiones = [
            ['pegar-con-rsync.py', 'Pegar con rsync', 'Botón en la barra y en el menú que pega con rsync lo copiado, con su progreso abajo del panel lateral', 'rsync'],
            ['abrir-con-gthumb.py', 'Abrir con gThumb', 'En el menú de carpetas, imágenes y el fondo de la vista', 'gthumb'],
            ['panel-lateral-estrecho.py', 'Panel lateral estrecho', 'Permite un panel lateral más estrecho que el que deja Nautilus', null],
        ];
        for (const [fichero, titulo, subtitulo, programa] of extensiones) {
            const fila = new Adw.SwitchRow({title: titulo, subtitle: subtitulo});
            const instalada = destino.get_child(fichero);
            const falta = !hayNautilusPython ? 'nautilus-python'
                : programa && !GLib.find_program_in_path(programa) ? programa : null;
            if (falta)
                fila.subtitle = `${subtitulo}. Falta ${falta}`;
            fila.sensitive = origen.get_child(fichero).query_exists(null);
            fila.active = instalada.query_exists(null);
            fila.connect('notify::active', () => {
                try {
                    if (fila.active) {
                        destino.make_directory_with_parents(null);
                    }
                } catch {}   // ya existe
                try {
                    if (fila.active) {
                        origen.get_child(fichero).copy(instalada, Gio.FileCopyFlags.OVERWRITE, null, null);
                    } else if (instalada.query_exists(null)) {
                        instalada.delete(null);
                    }
                    ventana.add_toast(new Adw.Toast({title: `${titulo}: ${fila.active ? 'activada' : 'desactivada'}. Reinicia Nautilus para verlo`}));
                } catch (e) {
                    ventana.add_toast(new Adw.Toast({title: `${titulo}: ${e.message}`}));
                }
            });
            grupo.add(fila);
        }

        const filaReiniciar = new Adw.ActionRow({
            title: 'Reiniciar Nautilus',
            subtitle: 'Cierra sus ventanas y cancela las copias en curso',
        });
        const reiniciar = new Gtk.Button({label: 'Reiniciar', valign: Gtk.Align.CENTER});
        reiniciar.connect('clicked', () => {
            try {
                Gio.Subprocess.new(['nautilus', '-q'], Gio.SubprocessFlags.NONE);
            } catch (e) {
                ventana.add_toast(new Adw.Toast({title: e.message}));
            }
        });
        filaReiniciar.add_suffix(reiniciar);
        grupo.add(filaReiniciar);
        return grupo;
    }

    _filaRetoqueGtk(ventana, nombre, titulo, subtitulo) {
        const fila = new Adw.SwitchRow({title: titulo, subtitle: subtitulo});
        const script = this.dir.get_child('scripts').get_child(`${nombre}.sh`);
        if (!script.query_exists(null)) {
            fila.sensitive = false;
            fila.subtitle = `${subtitulo}\n(falta ${nombre}.sh: vuelve a ejecutar install.sh)`;
            return fila;
        }
        const marcador = `/* >>> ${nombre} >>> */`;
        const presente = () => ['gtk-4.0', 'gtk-3.0'].some(v => {
            try {
                const [, datos] = GLib.file_get_contents(
                    GLib.build_filenamev([GLib.get_user_config_dir(), v, 'gtk.css']));
                return new TextDecoder().decode(datos).includes(marcador);
            } catch {
                return false;
            }
        });
        let actualizando = false;
        const leer = () => {
            actualizando = true;
            fila.active = presente();
            actualizando = false;
        };
        leer();
        fila.connect('notify::active', () => {
            if (actualizando)
                return;
            const args = ['bash', script.get_path(), ...(fila.active ? [] : ['--quitar'])];
            fila.sensitive = false;
            try {
                const proceso = Gio.Subprocess.new(args,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE);
                proceso.communicate_utf8_async(null, null, (p, res) => {
                    let salida = '';
                    try {
                        [, salida] = p.communicate_utf8_finish(res);
                    } catch {}
                    fila.sensitive = true;
                    leer();
                    ventana.add_toast(new Adw.Toast({
                        title: p.get_successful()
                            ? `${titulo}: ${fila.active ? 'aplicado' : 'quitado'}. Reabre las apps para verlo`
                            : `${titulo}: error (${(salida ?? '').trim().split('\n').pop()})`,
                    }));
                });
            } catch (e) {
                fila.sensitive = true;
                leer();
                ventana.add_toast(new Adw.Toast({title: `${titulo}: ${e.message}`}));
            }
        });
        return fila;
    }

    // --- Extras: clic en la bandeja, capturas

    _paginaExtras(powermichi) {
        const pagina = new Adw.PreferencesPage({title: 'Extras', icon_name: 'applications-utilities-symbolic'});

        const [gBandeja, añadirBandeja] = grupoModulo(powermichi, 'modulo-clic-bandeja', 'Clic en la bandeja',
            'Clic izquierdo en estos iconos de la bandeja: abre su app en vez del menú (el clic ' +
            'derecho sigue mostrando el menú). El Id es la propiedad Id del icono (StatusNotifierItem).');
        const filas = [];
        const listar = () => {
            filas.splice(0).forEach(f => gBandeja.remove(f));
            const apps = powermichi.get_value('clic-bandeja-apps').deep_unpack();
            for (const [id, app] of Object.entries(apps)) {
                const fila = new Adw.ActionRow({title: GLib.markup_escape_text(app, -1), subtitle: GLib.markup_escape_text(id, -1)});
                const quitar = new Gtk.Button({
                    icon_name: 'user-trash-symbolic', valign: Gtk.Align.CENTER,
                    css_classes: ['flat'], tooltip_text: 'Quitar',
                });
                quitar.connect('clicked', () => {
                    const nuevas = powermichi.get_value('clic-bandeja-apps').deep_unpack();
                    delete nuevas[id];
                    powermichi.set_value('clic-bandeja-apps', new GLib.Variant('a{ss}', nuevas));
                });
                fila.add_suffix(quitar);
                filas.push(añadirBandeja(fila));
            }
            gBandeja.remove(filaNueva);   // la de añadir, siempre la última
            gBandeja.add(filaNueva);
        };
        const filaNueva = new Adw.ExpanderRow({title: 'Añadir un icono'});
        const entradaId = new Adw.EntryRow({title: 'Id del icono (p. ej. 1Password_status_icon_1)'});
        const entradaApp = new Adw.EntryRow({title: 'Lanzador (p. ej. 1password.desktop)'});
        const botonAñadir = new Gtk.Button({label: 'Añadir', halign: Gtk.Align.END, margin_top: 6,
            margin_bottom: 6, margin_end: 6, css_classes: ['suggested-action']});
        botonAñadir.connect('clicked', () => {
            const id = entradaId.text.trim();
            let app = entradaApp.text.trim();
            if (!id || !app)
                return;
            if (!app.endsWith('.desktop'))
                app += '.desktop';
            const nuevas = powermichi.get_value('clic-bandeja-apps').deep_unpack();
            nuevas[id] = app;
            powermichi.set_value('clic-bandeja-apps', new GLib.Variant('a{ss}', nuevas));
            entradaId.text = '';
            entradaApp.text = '';
        });
        filaNueva.add_row(entradaId);
        filaNueva.add_row(entradaApp);
        const cajaBoton = new Gtk.ListBoxRow({activatable: false, selectable: false});
        cajaBoton.set_child(botonAñadir);
        filaNueva.add_row(cajaBoton);
        añadirBandeja(filaNueva);
        const idApps = powermichi.connect('changed::clic-bandeja-apps', listar);
        filaNueva.connect('destroy', () => powermichi.disconnect(idApps));
        listar();
        pagina.add(gBandeja);

        const [gCapturas] = grupoModulo(powermichi, 'modulo-capturas', 'Ayudante de capturas',
            'Publica en el bus de sesión org.evilnagi.Capturas (/org/evilnagi/Capturas) con ' +
            'ListWindows, MoveResize, Focus y Close, para colocar ventanas desde scripts al hacer ' +
            'capturas. Mejor tenerlo apagado si no se usa.');
        pagina.add(gCapturas);

        return pagina;
    }
}
