# Extensión de Nautilus (requiere el paquete nautilus-python):
# aplica a las ventanas de Nautilus la opacidad elegida en el botón "Transparencias"
# de Ajustes rápidos (módulo Transparencias de la extensión de GNOME PowerMichi), en directo.
# Con las transparencias apagadas (clave «activado»), las ventanas quedan opacas.
import os

import gi

gi.require_version("Gtk", "4.0")
from gi.repository import Gio, GLib, GObject, Gtk, Nautilus

SCHEMA = "org.gnome.shell.extensions.transparencias"
# El esquema va dentro de la extensión: PowerMichi, o la extensión suelta de antes
DIRS_SCHEMAS = [os.path.expanduser(f"~/.local/share/gnome-shell/extensions/{uuid}/schemas")
                for uuid in ("powermichi@jlcampana.github.io", "transparencias@pandi.local")]


def cargar_ajustes():
    for d in DIRS_SCHEMAS:
        if not os.path.isdir(d):
            continue
        fuente = Gio.SettingsSchemaSource.new_from_directory(
            d, Gio.SettingsSchemaSource.get_default(), False)
        schema = fuente.lookup(SCHEMA, False)
        if schema:
            return Gio.Settings.new_full(schema, None, None)
    return None


class OpacidadNautilus(GObject.GObject, Nautilus.MenuProvider):
    def __init__(self):
        super().__init__()
        self.ajustes = cargar_ajustes()
        if self.ajustes is None:
            return
        self.ajustes.connect("changed::nautilus-opacity", lambda *_: self.aplicar())
        self.con_activado = self.ajustes.props.settings_schema.has_key("activado")
        if self.con_activado:
            self.ajustes.connect("changed::activado", lambda *_: self.aplicar())
        Gtk.Window.get_toplevels().connect(
            "items-changed", lambda *_: GLib.idle_add(self.aplicar))
        GLib.idle_add(self.aplicar)

    def aplicar(self, *_):
        opacidad = self.ajustes.get_double("nautilus-opacity")
        if self.con_activado and not self.ajustes.get_boolean("activado"):
            opacidad = 1.0
        ventanas = Gtk.Window.get_toplevels()
        for i in range(ventanas.get_n_items()):
            ventana = ventanas.get_item(i)
            # Solo ventanas de Nautilus (no diálogos ni menús emergentes)
            if ventana.has_css_class("nautilus-window") and ventana.get_opacity() != opacidad:
                ventana.set_opacity(opacidad)
        return GLib.SOURCE_REMOVE
