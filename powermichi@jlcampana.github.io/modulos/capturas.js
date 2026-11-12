// Módulo Capturas: objeto D-Bus org.evilnagi.Capturas en /org/evilnagi/Capturas (bus de sesión)
// para listar, colocar, enfocar y cerrar ventanas desde scripts, p. ej. al hacer las capturas
// de un README.
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

const IFACE = `
<node>
  <interface name="org.evilnagi.Capturas">
    <method name="ListWindows">
      <arg type="s" direction="out"/>
    </method>
    <method name="MoveResize">
      <arg type="u" direction="in"/>
      <arg type="i" direction="in"/>
      <arg type="i" direction="in"/>
      <arg type="i" direction="in"/>
      <arg type="i" direction="in"/>
      <arg type="b" direction="out"/>
    </method>
    <method name="Focus">
      <arg type="u" direction="in"/>
      <arg type="b" direction="out"/>
    </method>
    <method name="Close">
      <arg type="u" direction="in"/>
      <arg type="b" direction="out"/>
    </method>
  </interface>
</node>`;

export default class Capturas {
    constructor() {
        this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
        this._dbus.export(Gio.DBus.session, '/org/evilnagi/Capturas');
    }

    destroy() {
        if (this._dbus) {
            this._dbus.unexport();
            this._dbus = null;
        }
    }

    _find(id) {
        for (const actor of global.get_window_actors()) {
            const win = actor.meta_window;
            if (win && win.get_id() === id)
                return win;
        }
        return null;
    }

    ListWindows() {
        const out = [];
        for (const actor of global.get_window_actors()) {
            const win = actor.meta_window;
            if (!win || win.is_skip_taskbar())
                continue;
            const rect = win.get_frame_rect();
            const ws = win.get_workspace();
            out.push({
                id: win.get_id(),
                title: win.get_title() ?? '',
                wm_class: win.get_wm_class() ?? '',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                focused: win.has_focus(),
                workspace: ws ? ws.index() : -1,
            });
        }
        return JSON.stringify(out);
    }

    MoveResize(id, x, y, width, height) {
        const win = this._find(id);
        if (!win)
            return false;
        win.unmaximize(Meta.MaximizeFlags.BOTH);
        win.move_resize_frame(true, x, y, width, height);
        win.activate(global.get_current_time());
        return true;
    }

    Focus(id) {
        const win = this._find(id);
        if (!win)
            return false;
        win.activate(global.get_current_time());
        return true;
    }

    Close(id) {
        const win = this._find(id);
        if (!win)
            return false;
        win.delete(global.get_current_time());
        return true;
    }
}
