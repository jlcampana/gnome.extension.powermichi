# gnome.extension.powermichi

Mis retoques de GNOME (Shell 46–51) en un solo repo:

| Carpeta | Qué es |
|---|---|
| `powermichi@jlcampana.github.io/` | **PowerMichi**: extensión de GNOME Shell que reúne los retoques propios, cada uno como módulo que se enciende y se apaga por separado. |
| `media-controller@jlcampana.github.io/` | **Media Controller**: control de reproducción en la barra superior. Extensión independiente (fork de Advanced Media Controller, GPL-3.0). |
| `nautilus-python/` | Extensiones de Nautilus: Pegar con rsync, Abrir con gThumb, Panel lateral estrecho y la opacidad de Transparencias. |
| `scripts/` | Scripts que cambian el aspecto de GNOME desde la terminal (cada uno se puede bajar y usar suelto). |
| `iconos/` | Imágenes que usan los scripts (botón de aplicaciones, icono de 1Password en la bandeja). |

Fondos animados va aparte: [gnome-animated-wallpaper](https://github.com/jlcampana/gnome-animated-wallpaper).

## Instalar

```bash
./install.sh              # PowerMichi + Media Controller
./install.sh powermichi   # solo PowerMichi
./install.sh media        # solo Media Controller
# o sin clonar:
curl -fsSL https://raw.githubusercontent.com/jlcampana/gnome.extension.powermichi/main/install.sh | bash
```

Luego, cerrar sesión y volver a entrar. El instalador retira las extensiones sueltas a las que
sustituye PowerMichi (Pantalla activa, Transparencias, Barra Nautilus, Botones de sesión rojos,
Clic de bandeja, Botón de aplicaciones, Capturas helper y P7 Borders); sus ajustes se conservan.
Para la opacidad de Nautilus y las extensiones de Nautilus hace falta `nautilus-python`
(Fedora: `nautilus-python`, Ubuntu: `python3-nautilus`).

## PowerMichi

Ajustes: app Extensiones → PowerMichi, con una pestaña por grupo. Cada módulo tiene su
interruptor «Activado» y se aplica en directo.

| Pestaña | Módulo | Qué hace |
|---|---|---|
| Pantalla activa | Pantalla activa | Botón en Ajustes rápidos que evita el bloqueo y el apagado de la pantalla (inhibidor de inactividad de la sesión, sin tocar los ajustes de energía). |
| Transparencias | Transparencias | Botón en Ajustes rápidos: un clic enciende o apaga las transparencias; en su menú, opacidad y blur de Nautilus y Ptyxis. Nivel de blur en los ajustes. |
| Aspecto | Barra superior | Barra de un color fijo (por defecto `#2e2e32` al 95 %) y, si se quiere, el dock igual. |
| Aspecto | Reborde de las ventanas | Borde en todas las ventanas: grosor y color (o el de acento). Código de [P7 Borders](https://github.com/prasannavl/p7-borders-shell-extension) (MIT) en `reborde/`. |
| Aspecto | Botones de sesión en rojo | Botón de apagar y de confirmar de los diálogos de Apagar, Reiniciar, Cerrar sesión y contraseña, del color elegido. |
| Aspecto | Botón de aplicaciones | Imagen propia en el botón «Mostrar aplicaciones» de Dash to Dock. |
| Ventanas | Apps GTK | Estilo macOS (barras de título compactas, botón de cerrar rojo, pestañas bajas, terminal sin ruta bajo el título), Nautilus compacto y diálogos de confirmación. Los aplican los scripts de `scripts/` en `~/.config/gtk-4.0/gtk.css`. |
| Ventanas | Nautilus | Activa o desactiva Pegar con rsync, Abrir con gThumb y Panel lateral estrecho, y reinicia Nautilus. |
| Extras | Clic en la bandeja | Clic izquierdo en ciertos iconos de la bandeja abre su app (por defecto 1Password). |
| Extras | Ayudante de capturas | Objeto D-Bus `org.evilnagi.Capturas` para colocar ventanas desde scripts. |

Los ajustes de Pantalla activa, Transparencias y Reborde siguen en sus esquemas de siempre
(`avoid-screen-off`, `transparencias`, `p7-borders`); el resto, en `org.gnome.shell.extensions.powermichi`.

### Estructura

```
powermichi@jlcampana.github.io/
  extension.js      enciende y apaga los módulos según sus claves modulo-*
  prefs.js          ventana de ajustes con pestañas
  modulos/          un fichero por módulo (new Modulo(ext) / destroy())
  reborde/          código de P7 Borders (MIT)
  schemas/
```

## Scripts

| Script | Qué hace |
|---|---|
| `barra-dock-gris.sh` | Barra superior y dock del mismo gris (módulo Barra superior). |
| `botones-sesion-rojos.sh` | Botones de sesión en rojo (módulo Botones de sesión). |
| `boton-aplicaciones.sh` | Botón de aplicaciones el primero del dock y con imagen propia. |
| `clic-bandeja.sh` | Clic en la bandeja abre la app. |
| `blur-ventanas.sh` | Blur y transparencias de Nautilus y Ptyxis desde la terminal. |
| `reborde-ventanas.sh` | Reborde de las ventanas (módulo Reborde). |
| `gtk-compacto.sh` | Estilo macOS en las apps GTK. |
| `nautilus-compacto.sh` | Nautilus compacto. |
| `dialogos-confirmacion.sh` | Diálogos de confirmación con botones en fila y el destructivo en rojo. |
| `terminal-msx.sh` | Perfil MSX de Ptyxis (colores y fuente). |
| `instalar-morewaita.sh`, `papelera-tela.sh`, `icono-app.sh` | Iconos: MoreWaita, papelera de Tela-circle e icono propio de una app. |

Los que configuran PowerMichi la instalan si falta. Todos aceptan `--quitar` para dejarlo como
en GNOME.
