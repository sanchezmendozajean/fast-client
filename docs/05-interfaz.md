# 05 · Interfaz

> **Fuente visual:** handoff de Claude Design en `docs/diseno/project/` (`Fast Client.dc.html`, que importa `Workspace.dc.html` y `Preferences.dc.html`). Pantallas aprobadas: **Bloque A** (área de trabajo, oscuro y claro) y **modal Preferencias** (oscuro y claro, con SSL desactivado). Los bloques B, C y D del brief (menús, diálogos, toasts, estados, hoja de componentes) **no** tienen todavía diseño de alta fidelidad: se construyen con los tokens y controles base de este documento.
>
> **Escala:** el prototipo está dibujado al **80 %** (marco de 1440×900 con barra de título de 32 px, sidebar de 224 px y modal de 448 px, frente a 40 / 280 / 560 de la especificación). Todas las medidas de este documento ya están convertidas a **1:1** (valor del prototipo × 1,25, redondeado a px enteros). Ver `docs/decisiones.md`.

## Dirección visual

Sobria, oscura por defecto, con mucho aire y pocos bordes. Referencias de sensación: Linear, Raycast, VS Code con tema limpio. Reglas:

- Jerarquía por **tono de superficie**, no por líneas. La "carcasa" (barra de título + sidebar) va en `--surface-1`, sin separación entre ambas; el área de trabajo es un panel en `--bg` con la esquina superior izquierda redondeada (`--radius-lg`) y un borde de 1 px solo arriba y a la izquierda (`box-shadow: inset 1px 1px 0 var(--border)`).
- Bordes de 1 px con `--border`, casi siempre como `box-shadow: inset` para no alterar medidas.
- Un único color de acento. Los colores fuertes se reservan para métodos HTTP, códigos de estado, variables y avisos.
- Radios de 4 a 10 px (`--radius-*`), sombras solo en elementos flotantes (menús, diálogos, toasts, tooltips).
- Transiciones de 150 ms con `--ease`; respetar `prefers-reduced-motion` (duración 0).
- Estado activo/seleccionado: texto en `--text` y peso 500; ícono con `FILL 1` y, en sub-pestañas, color `--accent`.
- Hover genérico: fondo `--surface-2` (o `--surface-3` sobre `--surface-1`) y texto de `--text-muted` a `--text`.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚡Fast Client [Archivo] [Ajustes]      perfil.fcprofile •            ─  ▢  ✕ │ 40 TitleBar
├─────────────────────╭────────────────────────────────────────────────────────┤
│ [🔍 Buscar  Ctrl K]+│ GET Listar… ✕ │ POST Crear pedido • │ POST Login ✕  +   │ 44 TabBar
│                     │ [POST ▾│{{baseUrl}}/orders                   ] [➤ Send] │ 40 UrlBar
│ COLECCIONES         │ Params Headers 3 Body Auth ···  ┆ ● 201 Created  248 ms  │ 38 cabeceras
│ ▾ API Tienda      4 │ [Ninguno|JSON|…]    Formatear   ┆ [Body] Headers 9 [F|C] │
│    GET    Listar…   │ ┌────────────────────────────┐  ┆ ┌────────────────────┐ │
│ ▎  POST   Crear…    │ │ 1 {                        │  ┆ │ 1 {                │ │
│    PUT    Actual…   │ │ 2   "clienteId": …         │  ┆ │ 2   "id": …        │ │
│    DELETE Elimin…   │ └────────────────────────────┘  ┆ └────────────────────┘ │
│ ▸ Autenticación   2 │            request              ┆       respuesta        │
│ [⇤]                 │                                 ┆ ← divisor arrastrable  │
└─────────────────────┴────────────────────────────────────────────────────────┘
  sidebar 280 (surface-1)      área de trabajo (--bg, esquina redondeada)
```

- Sin barra de estado; los mensajes van por toast.
- Sidebar redimensionable (200–480 px, por defecto 280) y colapsable (Ctrl+B). El botón de colapsar vive abajo a la izquierda del sidebar.
- División request/respuesta redimensionable. Por defecto request y respuesta van **lado a lado** con divisor vertical (`splitOrientation: "vertical"`); el botón de orientación de la cabecera de la respuesta alterna a apiladas (`"horizontal"`, divisor horizontal). Ambos valores se guardan en `workspace`.

## Tokens (`styles/tokens.css`)

Valores tomados del handoff. Los marcados con `/* derivado */` no aparecen en el diseño y siguen el mismo patrón (ver `docs/decisiones.md`).

```css
:root, [data-theme="dark"] {
  /* Superficies */
  --bg:            #0f1115;   /* panel del área de trabajo, pestaña activa, pie de modales */
  --surface-1:     #151820;   /* barra de título, sidebar, editores de código, modales */
  --surface-2:     #1b1f28;   /* inputs, barra de URL, hover de filas */
  --surface-3:     #232835;   /* hover sobre surface-1, seleccionado, botón secundario */
  --border:        #232833;
  --scrim:         rgb(5 6 10 / .55);   /* fondo detrás de modales */

  /* Texto */
  --text:          #e6e8ee;
  --text-muted:    #8e97a7;
  --text-faint:    #5c6474;

  /* Acento */
  --accent:        #7c9cff;
  --accent-strong: #95afff;   /* hover del primario (más claro en oscuro) */
  --on-accent:     #0b1024;   /* texto/ícono sobre --accent */
  --accent-bg:     rgb(124 156 255 / .12);   /* derivado */

  /* Semánticos */
  --success: #3fcf8e;  --success-bg: rgb(63 207 142 / .12);
  --warning: #f5b544;  --warning-bg: rgb(245 181 68 / .10);
  --danger:  #f06a6a;  --danger-bg:  rgb(240 106 106 / .12);   /* bg derivado */
  --info:    #5fb3f5;  --info-bg:    rgb(95 179 245 / .12);    /* bg derivado */

  /* Variables {{…}} en la URL */
  --var-ok:      #3fcf8e;  --var-ok-bg:      rgb(63 207 142 / .12);
  --var-missing: var(--danger);  --var-missing-bg: var(--danger-bg);   /* derivado */

  /* Métodos HTTP */
  --m-get: #3fcf8e; --m-post: #f5b544; --m-put: #5fb3f5; --m-patch: #b48cff;
  --m-delete: #f06a6a; --m-head: #8a93a3; --m-options: #8a93a3;

  /* Resaltado de sintaxis (CodeMirror) */
  --syn-key:     #a9bcff;
  --syn-string:  #8fd9b0;
  --syn-number:  #f5c47a;
  --syn-keyword: #c7a4ff;   /* true, false, null */
  --syn-punct:   #6f7888;

  /* Controles de ventana */
  --win-close-hover: #c42b1c;   /* rojo estándar de Windows, ambos temas */

  /* Sombras */
  --shadow-float: 0 10px 30px rgb(0 0 0 / .45), 0 0 0 1px #262c38;

  /* Radios */
  --radius-xs: 4px;   /* kbd, resaltado de variables, segmentos internos */
  --radius-sm: 6px;   /* botones, filas del árbol, inputs pequeños, botones de icono */
  --radius-md: 8px;   /* barra de URL, editores, pestañas (solo arriba), controles segmentados, avisos */
  --radius-lg: 10px;  /* modales, esquina del área de trabajo */

  /* Espaciado */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px;

  /* Tipografía */
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --fs-xs: 10px;   /* badges de método, kbd */
  --fs-sm: 11px;   /* títulos de sección en mayúsculas, contadores */
  --fs-md: 13px;   /* base de la UI, URL y código */
  --fs-lg: 15px;   /* títulos de diálogo */
  --lh-code: 20px;
  --fw-regular: 400; --fw-medium: 500; --fw-semibold: 600;

  /* Tamaños */
  --h-titlebar: 40px;
  --h-tabbar:   44px;
  --h-tab:      34px;
  --h-subtabs:  38px;
  --h-row:      28px;   /* filas del árbol */
  --h-urlbar:   40px;   /* barra de URL y botón Send */
  --h-btn:      32px;   /* botones de texto y buscador */
  --h-input:    30px;   /* inputs y selects de formularios */
  --h-icon-btn: 28px;   /* botones solo ícono */
  --w-method:   44px;   /* ancho fijo del badge de método en el árbol */
  --w-win-ctrl: 46px;   /* cada control nativo de ventana */

  /* Movimiento */
  --dur: 150ms;
  --ease: cubic-bezier(.2,.8,.2,1);
}

[data-theme="light"] {
  --bg: #ffffff; --surface-1: #f5f6f8; --surface-2: #eef0f4; --surface-3: #e3e7ee;
  --border: #e3e6ec; --scrim: rgb(20 26 40 / .28);
  --text: #1a1d24; --text-muted: #586170; --text-faint: #98a0ad;
  --accent: #4b6bfb; --accent-strong: #3553e0; --on-accent: #ffffff;
  --accent-bg: rgb(75 107 251 / .10);                          /* derivado */
  --success: #16895a;  --success-bg: rgb(22 137 90 / .10);
  --warning: #9a5c00;  --warning-bg: rgb(184 110 0 / .10);
  --danger:  #d23f3f;  --danger-bg:  rgb(210 63 63 / .10);     /* bg derivado */
  --info:    #1f7fc9;  --info-bg:    rgb(31 127 201 / .10);    /* bg derivado */
  --var-ok: #16895a;   --var-ok-bg: rgb(22 137 90 / .10);
  --m-get: #16895a; --m-post: #b86e00; --m-put: #1f7fc9; --m-patch: #7c4ee0;
  --m-delete: #d23f3f; --m-head: #586170; --m-options: #586170;  /* head/options derivados */
  --syn-key: #3553e0; --syn-string: #16895a; --syn-number: #b86e00;
  --syn-keyword: #7c4ee0; --syn-punct: #8a93a3;
  --shadow-float: 0 10px 30px rgb(20 30 60 / .14), 0 0 0 1px #e1e5ec;
}
```

Notas:
- En claro, `--bg` (blanco) es **más claro** que las superficies: la carcasa gris rodea al panel blanco de trabajo. La jerarquía se mantiene por contraste con la carcasa, no por "elevación".
- Colores de estado HTTP (pill de la respuesta): 1xx `--info`, 2xx `--success`, 3xx `--accent`, 4xx `--warning`, 5xx y errores de red `--danger`; fondo con el `*-bg` correspondiente.
- Foco visible: `outline: 2px solid var(--accent); outline-offset: 1px` (sin diseño específico; se mantiene la regla de accesibilidad).

## Íconos (R2)

- Paquete `material-symbols` (npm). Importar **solo** la variante *Rounded*: `import 'material-symbols/rounded.css'` en `styles/fonts.css`. Vite copia el `.woff2` al bundle → funciona sin internet. (El prototipo carga fuentes e íconos desde Google Fonts; eso **no** se replica.)
- Ajustes por defecto: `FILL 0`, `wght 400`, `GRAD 0`, `opsz 20`. Excepciones del diseño: controles de ventana en `wght 300`; logo, botón Send e ícono de sub-pestaña activa en `FILL 1`.
- Componente único:

```tsx
<Icon name="send" size={18} fill={false} weight={400} />
// <span class="material-symbols-rounded" style="font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20">send</span>
```

- Tamaños usados (1:1): **14** (chevron del código, cerrar pestaña: 15), **16** (sub-pestañas, menús de la barra, carpetas, botones con texto, secciones de Preferencias), **18** (botones solo ícono, chevron del árbol, Send, añadir, logo), **20** (ícono del título de un modal).
- `aria-hidden` en íconos decorativos; los `IconButton` sin texto llevan `aria-label` y tooltip.
- Estado activo/seleccionado: `fill` en 1.

### Mapa de íconos

| Lugar | Ícono (Material Symbols) |
|---|---|
| Logo / marca | `bolt` (relleno, color `--accent`) |
| Controles de ventana (overlay nativo) | minimizar `remove`, maximizar `crop_square`, cerrar `close` — solo de referencia visual; los dibuja Windows |
| Menú Ajustes | `settings` (botón), Zoom: Ampliar `zoom_in`, Zoom: Reducir `zoom_out`, Tema oscuro `dark_mode`, Tema claro `light_mode`, Tema según el sistema `contrast`, tema activo `check`, Preferencias `settings_applications` |
| Modal Preferencias | título `settings_applications`, cerrar `close`, Red `lan`, Interfaz `palette` (tema: `dark_mode` / `light_mode` / `contrast`), Perfiles `folder_managed`, Abrir carpeta `folder_open`, selector de zoom `expand_more`, Restablecer `restart_alt`, aviso SSL `gpp_maybe` |
| Menú Archivo | `description` (botón), Nuevo `note_add`, Abrir `file_open`, Abrir reciente `history`, Reubicar `drive_file_move`, Ir al archivo `folder_open`, Salir `logout` |
| Sidebar | Buscar `search`, Nueva colección `create_new_folder`, colapsar sidebar `left_panel_close` / `left_panel_open` |
| Colección | cerrada `folder`, abierta `folder_open`, expandir `chevron_right` (rota 90°), Nuevo request `add`, Renombrar `edit`, Duplicar `content_copy`, Variables `data_object`, Eliminar `delete` |
| Request (menú contextual) | Abrir `open_in_new`, Renombrar `edit`, Duplicar `content_copy`, Copiar como cURL `terminal`, Mover a… `drive_file_move`, Eliminar `delete` |
| Pestañas | Nueva `add`, Cerrar `close`, cambios sin guardar = punto dibujado (no ícono, ver TabBar), Cerrar otras `tab_close` (o `close`), Cerrar todas `cancel`, Renombrar `edit` |
| Barra de URL | Selector de método `expand_more`, Enviar `send` (relleno), Cancelar `stop_circle`, Importar cURL `content_paste` |
| Sub-pestañas del request | Params `tune`, Headers `list_alt`, Body `data_object`, Auth `key`, Opciones `instant_mix` |
| Body | Formatear `format_align_left`, plegado de código `expand_more` |
| Tablas clave/valor | Habilitar (checkbox), Eliminar fila `remove_circle_outline` (o `delete`), Edición masiva `edit_note` |
| Auth | Mostrar/ocultar `visibility` / `visibility_off`, Vaciar token `close` |
| Respuesta | Buscar `search`, Ajuste de línea `wrap_text`, Copiar `content_copy`, Guardar `download`, Orientación `splitscreen` / `vertical_split`, Formatear `format_align_left` |
| Toasts | Éxito `check_circle`, Info `info`, Advertencia `warning`, Error `error`, Cerrar `close` |
| Diálogos | Pregunta `help`, Peligro `report` |
| Estado vacío | `bolt` grande + atajos sugeridos |

## Controles base

Medidas 1:1. Todos usan `--font-ui`, `--fs-md` y `transition: background var(--dur) var(--ease), color var(--dur) var(--ease)`.

| Control | Reposo | Hover | Otros estados |
|---|---|---|---|
| **Botón primario** | alto 32 (Send: 40), padding 0 16, `--radius-sm`, fondo `--accent`, texto `--on-accent`, peso 600; ícono opcional relleno | fondo `--accent-strong` | deshabilitado: `opacity .4`, `cursor: not-allowed` |
| **Botón secundario** | alto 32, padding 0 16 (con ícono 0 12 0 10), `--radius-sm`, fondo `--surface-3`, texto `--text` | fondo `--surface-2` + borde interior 1 px `--border` | — |
| **Botón fantasma** | alto 32 (en barras 26), padding 0 10 0 8, `--radius-sm`, sin fondo, texto `--text-muted`, ícono 16 + texto | fondo `--surface-2`, texto `--text` | — |
| **Botón peligro** | *sin diseño*: como el primario con fondo `--danger` y texto blanco | `--danger` al 90 % | nunca es la acción de Enter |
| **Botón solo ícono** | 28×28 (26 en la barra de modales y en el sidebar 32), `--radius-sm`, ícono 18, color `--text-muted` (o `--text-faint` en zonas secundarias) | fondo `--surface-2` (o `--surface-3` sobre `--surface-1`), color `--text` | lleva `aria-label` + tooltip |
| **Input / campo numérico** | alto 30, padding 0 10, `--radius-sm`, fondo `--surface-2`, borde interior 1 px `--border`; valores numéricos en mono alineados a la derecha, unidad (`s`, `MB`) en `--text-faint` | — | error: borde `--danger` + mensaje `--danger` debajo, alineado a la derecha; solo lectura: sin borde, texto `--text-muted`, mono, elipsis + tooltip con el valor completo |
| **Dropdown** | como el input, valor en mono y `expand_more` 16 en `--text-faint` a la derecha | — | — |
| **Interruptor** | pista 32×19, radio 10; mando 14×14; apagado: pista `--surface-3`, mando `--text-muted`; encendido: pista `--accent`, mando `--on-accent` | — | mando se desplaza con `left` en `--dur` `--ease`; `role="switch"` |
| **Control segmentado** | contenedor con padding 2, gap 2, `--radius-md`, fondo `--surface-1` (en modales `--surface-2`); segmentos alto 24–25, padding 0 10, `--radius-xs`, texto `--text-muted` | — | activo: fondo `--surface-3`, texto `--text`, peso 500. Opcionalmente ícono 15 + texto |
| **Kbd (pista de atajo)** | mono `--fs-xs`, padding 1 5, `--radius-xs`, fondo `--surface-3`, texto `--text-muted` (ej. "Ctrl K") | — | — |
| **Aviso en línea** | padding 8 10, `--radius-md`, fondo `--warning-bg`, texto e ícono (18) `--warning` | — | — |
| **Título de sección** | `--fs-sm`, peso 500, mayúsculas, `letter-spacing: .04em`, `--text-faint`; ícono 16 opcional | — | — |

## Componentes y comportamiento

### TitleBar + menús Archivo y Ajustes
**Visual:**
- Alto 40, fondo `--surface-1` (el mismo que el sidebar, sin línea divisoria). `-webkit-app-region: drag`, botones en `no-drag`.
- Marca: `bolt` 18 relleno en `--accent` + "Fast Client" peso 600, `letter-spacing: -.01em`; padding 0 12 0 14, gap 6.
- Botones de menú: alto 28, padding 0 10 0 8, gap 6, `--radius-sm`, ícono 16 + texto, color `--text-muted`; hover/abierto: fondo `--surface-3`, texto `--text`. 2 px entre Archivo y Ajustes.
- Nombre del perfil **centrado en la ventana** (posición absoluta), en mono `--fs-md`, color `--text-muted`.
- Punto de "sin guardar" junto al nombre: *no aparece en el diseño* (la pantalla aprobada está en estado guardado); se dibuja igual que el de las pestañas (8 px, `--text-muted`) a 6 px del nombre.
- Controles de ventana a la derecha, 46 px de ancho cada uno, sobre el mismo color de la barra; iconos en `--text-muted`; hover `--surface-3` y, en cerrar, `--win-close-hover` con ícono blanco. (Los dibuja el overlay nativo; ver doc 02.)
- Menús desplegables, submenú Recientes y etiqueta de zoom: *sin diseño todavía*. Usar superficie `--surface-1`, `--radius-md`, `--shadow-float`, padding 4, filas de 28 px con `--radius-sm`, ícono 16 · texto · atajo en `--text-faint` alineado a la derecha, separadores de 1 px `--border` con margen 4.

**Comportamiento** (sin cambios):
- Dos botones de menú, uno al lado del otro: **Archivo** y **Ajustes**. Si uno está abierto, pasar el ratón sobre el otro lo abre (comportamiento de barra de menús). ← → cambia de menú con teclado.
- Botón **Archivo** con ícono; abre un menú flotante propio (teclado: ↑↓, Enter, Esc; mnemónico Alt+A).
- Cada entrada: ícono · texto · atajo alineado a la derecha.
  - Nuevo — Ctrl+N
  - Abrir… — Ctrl+O
  - Abrir reciente ▸ (submenú)
  - Reubicar… — Ctrl+Shift+S
  - Ir al archivo — Ctrl+Shift+E
  - ─────
  - Salir — Ctrl+Q
- Botón **Ajustes** con ícono (mnemónico Alt+J). Entradas, en este orden:
  - Zoom: Ampliar — Ctrl+=
  - Zoom: Reducir — Ctrl+-
  - ─────
  - Tema oscuro
  - Tema claro
  - Tema según el sistema
  - ─────
  - Preferencias… — Ctrl+,
  - Los tres temas se comportan como opciones de radio: el activo lleva `check` a la derecha.
  - Al hacer zoom aparece durante 1 s una pequeña etiqueta flotante centrada bajo la barra de título con el porcentaje ("110 %"). Ctrl+0 vuelve a 100 % (atajo sin entrada de menú).
- Nombre del perfil + punto de "sin guardar". Tooltip con la ruta completa. Doble clic en el nombre = Ir al archivo.

### Sidebar: árbol Colecciones > Requests (R4)
**Visual:**
- Fondo `--surface-1`, padding 4 0 8.
- Cabecera (padding 0 10 0 12, gap 6): buscador alto 32, `--radius-md`, fondo `--surface-2`, ícono `search` 16 + placeholder "Buscar" en `--text-faint` + kbd "Ctrl K" a la derecha; botón **Nueva colección** solo ícono de 32×32.
- Título de sección "COLECCIONES" (estilo *título de sección*), padding 18 20 6.
- Árbol con padding lateral 8 y 1 px entre filas. Filas de 28 px, `--radius-sm`; hover: fondo `--surface-2`.
- Colección: padding 0 8 0 4, gap 6; chevron 18 en `--text-faint` (rota 90° al abrir) · carpeta 16 en `--text-muted` (`folder` / `folder_open`) · nombre peso 500 en `--text` · contador en `--text-faint` alineado a la derecha. 2 px extra de separación antes de cada colección siguiente.
- Request: sangría de 30 px, gap 8; badge del método en mono `--fs-xs` peso 600, color del método, **ancho fijo 44 px** · nombre en `--text-muted` (hover `--text`).
- Request seleccionado: fondo `--surface-3`, texto `--text`, barra de acento de 2 px a la izquierda (inset 6 px arriba y abajo, radio 2).
- Botón de colapsar (`left_panel_close`) abajo, alineado a la izquierda, 30×30, color `--text-faint`.
- Renombrado inline, arrastre, coincidencias de búsqueda, menú contextual y estado vacío: *sin diseño todavía*; usar input (con `--accent` como borde de foco), `--accent-bg` para resaltar coincidencias y controles base.

**Comportamiento** (sin cambios):
- Cabecera: buscador (filtra por nombre de request/colección y por URL; resalta coincidencias) + botón **Nueva colección**.
- Colección: chevron, ícono carpeta, nombre, contador de requests en tono tenue; botones de acción (`add`, `more_horiz`) visibles al pasar el ratón (sustituyen al contador).
- Request: badge del método + nombre. Clic = abrir/enfocar pestaña. Seleccionado = `--surface-3` + barra de acento de 2 px a la izquierda.
- **Renombrar inline**: doble clic, F2 o menú. Enter confirma, Esc cancela, vacío restaura. Confirmar un nombre distinto guarda a disco (`renamed`).
- **Crear colección**: se inserta "Nueva colección" y entra directo en modo renombrar (guardado: `collection-created`).
- **Eliminar**: diálogo de confirmación indicando cuántos requests se borrarán; cierra sus pestañas y guarda a disco (`deleted`).
- **Arrastrar y soltar** (@dnd-kit): reordenar colecciones, reordenar requests, mover requests entre colecciones.
- Menú contextual (clic derecho) con íconos, según el mapa anterior.
- **Variables de colección**: diálogo con una tabla clave/valor.
- Estado vacío: ilustración con ícono + botón "Crear tu primera colección".

### Workspace: pestañas (R5)
**Visual:**
- TabBar de 44 px, padding 0 10, pestañas alineadas abajo con 2 px de separación; línea inferior de 1 px `--border` (`inset 0 -1px 0`).
- Pestaña: alto 34, padding 0 8 0 12, gap 8, radio `--radius-md` solo en las esquinas superiores. Contenido: método en mono `--fs-xs` peso 600 y color del método · nombre · zona de 18×18 a la derecha (cerrar o punto).
- Inactiva: sin fondo, texto `--text-muted`; hover: fondo `--surface-1`, texto `--text`. Botón cerrar: ícono `close` 15 en `--text-faint`, `--radius-xs`.
- Activa: fondo `--bg`, texto `--text`, nombre peso 500, borde de 1 px arriba y a los lados y sin borde abajo (se funde con el contenido: `box-shadow: inset 1px 1px 0 var(--border), inset -1px 0 0 var(--border), 0 1px 0 var(--bg)`).
- Cambios sin guardar: círculo de 8 px en `--text-muted` centrado en la zona de 18×18.
- Botón **+**: 28×28 solo ícono, `add` 18 en `--text-faint`, margen izquierdo 4, 2 px por encima de la base.

**Comportamiento** (sin cambios):
- Cada pestaña: badge del método + nombre + punto de cambios sin guardar o botón cerrar (el punto se convierte en ✕ al pasar el ratón).
- Botón **+** al final (y Ctrl+T): crea un request "Nuevo request" `GET` en la colección de la pestaña activa; si no hay pestaña activa, en la colección seleccionada en el sidebar; si no existe ninguna colección, crea "Mi colección". Se abre en pestaña nueva, con foco en la URL. Guardado: `request-created`.
- Clic central o Ctrl+W cierra; Ctrl+Tab / Ctrl+Shift+Tab navega; Ctrl+1..9 salta.
- Menú contextual: Cerrar, Cerrar otras, Cerrar a la derecha, Cerrar todas, Renombrar (edición en línea sobre la pestaña, igual que el doble clic), Duplicar, Mostrar en el árbol.
- Reordenar arrastrando. Desbordamiento con scroll horizontal y sombras en los bordes.
- Doble clic en el título de la pestaña = renombrar request.
- Sin pestañas: estado vacío con atajos (Ctrl+T nuevo request, Ctrl+O abrir perfil).

### Editor de request
**Visual:**
- **UrlBar** (padding 14 16 6, gap 8): caja de 40 px, `--radius-md`, fondo `--surface-2`, sin borde.
  - Método: mono `--fs-md` peso 600 en el color del método + `expand_more` 16 en `--text-faint`; padding 0 8 0 14. Separador vertical de 1×20 `--border`.
  - URL: mono `--fs-md`, padding 0 12, una línea sin ajuste. Variable existente: texto `--var-ok` sobre `--var-ok-bg`, `--radius-xs`, padding 1 2; variable no definida: `--var-missing` sobre `--var-missing-bg` (*no dibujado*, mismo patrón).
  - **Send**: botón primario de 40 px, padding 0 16 0 14, gap 8, ícono `send` 18 relleno. En curso: mismo tamaño, **Cancelar** con `stop_circle` (*no dibujado*; estilo secundario).
- **Sub-pestañas** (alto 38, padding 0 10, gap 2 entre pestañas; ícono 16 + texto, gap 6): inactiva `--text-muted` (hover `--text`); activa `--text` peso 500, ícono en `--accent` y relleno, subrayado de 2 px `--accent` con radio 2 (inset 10 px a los lados). El contador va sin paréntesis, en mono `--fs-sm` `--text-faint` ("Headers 3").
- Barra de herramientas de la sub-pestaña (padding 12 16 10, gap 12): control segmentado de modos del body (fondo `--surface-1`) y botón fantasma **Formatear** a la derecha (alto 26, `format_align_left` + texto).
  - Etiquetas de modo: Ninguno · JSON · Text · XML · Form URL-encoded · Multipart.
- **Editor de código** (CodeMirror, body y respuesta): margen 0 0 16 16 (respuesta: 0 16 16 0), padding 10 0, `--radius-md`, fondo `--surface-1`, mono `--fs-md`, `--lh-code`. Gutter de números de 40 px alineados a la derecha en `--text-faint`; columna de plegado de 22 px con `expand_more` 14 en `--text-faint`. Colores de sintaxis: claves `--syn-key`, strings `--syn-string`, números `--syn-number`, `true/false/null` `--syn-keyword`, puntuación `--syn-punct`, resto `--text`.
- **Divisor** request/respuesta: zona de arrastre de 14 px, línea de 1 px `--border` centrada y asa de 4×36 `--surface-3` radio 2; `cursor: col-resize` (o `row-resize` en apilado).
- Headers, Auth, Opciones y tabla clave/valor: *sin diseño todavía*; usar inputs, interruptores y botones base. Headers automáticos en `--text-faint`, solo lectura.

**Comportamiento** (sin cambios):
- **UrlBar**: selector de método (dropdown con colores) · input de URL en fuente mono con resaltado de `{{variables}}` (verde si existe en la colección, rojo si no; tooltip con el valor resuelto) · botón **Send** de acento con ícono (se convierte en **Cancelar** mientras hay un request en curso). Ctrl+Enter envía desde cualquier parte del editor. Pegar un texto que empieza por `curl ` ofrece importarlo (toast con acción).
- **Params**: tabla sincronizada en ambos sentidos con la query string de la URL.
- **Headers**: tabla clave/valor con autocompletado de nombres comunes (`Content-Type`, `Authorization`, `Accept`…). Muestra en gris, de solo lectura, los headers automáticos (Content-Type según el body, Authorization según Auth, User-Agent `FastClient/<versión>`). La credencial de Authorization se muestra como `Bearer ••••••••` / `Basic ••••••••`. Tooltips de las filas bloqueadas: Content-Type *Identificado según el contenido del "body"*, Authorization *Valor asignado en "Auth"*; User-Agent sin tooltip.
- **Body**: selector de modo. JSON/Text/XML usan CodeMirror (resaltado, plegado, Ctrl+Shift+F formatea JSON, aviso de JSON inválido no bloqueante). Form URL-encoded y Multipart usan tablas; en Multipart cada fila elige texto o archivo (selector de archivo nativo).
- **Auth**: None / Bearer / Basic; campos con botón de mostrar/ocultar (`visibility` / `visibility_off`). El token Bearer es un textarea que crece con el contenido (parte los tokens largos en varias líneas, sin saltos de línea reales) y tiene un botón para vaciarlo.
- **Opciones**: timeout del request (vacío = global), seguir redirecciones.
- Contadores en las sub-pestañas: el de Headers cuenta solo los habilitados.
- **Tabla clave/valor** (componente común): siempre hay una fila vacía al final que se convierte en real al escribir; checkbox para habilitar; eliminar con ícono; Tab navega entre celdas; modo "edición masiva" (texto `clave: valor` por línea).

### Visor de respuesta
**Visual:**
- Cabecera de 38 px (gap 12):
  - **Pill de estado**: alto 24, padding 0 9 0 8, gap 6, `--radius-sm`, fondo `--{estado}-bg`, texto `--{estado}` en mono `--fs-md` peso 600, con un punto de 6 px del mismo color delante ("● 201 Created").
  - Tiempo y tamaño en mono `--fs-md` `--text-muted`, separados por "·" en `--text-faint`. Tooltip del tamaño: "Headers 412 B · Body 1.0 KB".
  - A la derecha, botones solo ícono de 28 px (gap 4): Buscar · Ajuste de línea · Copiar · Guardar · separador vertical 1×16 `--border` · Orientación.
- Fila de vistas (padding 12 16 10 0): pestañas **Body** / **Headers n** como píldoras (padding 4 10, `--radius-sm`; activa con fondo `--surface-2` y peso 500; inactiva `--text-muted`; contador en mono `--fs-sm` `--text-faint`), y a la derecha el control segmentado **Formateado / Crudo**.
- Body en el editor de código descrito arriba (solo lectura).
- Estados vacío, cargando y error de red: *sin diseño todavía*. Vacío: ícono y texto centrados en `--text-faint`; cargando: barra indeterminada de 2 px en `--accent` + tiempo en mono + botón secundario Cancelar; error: ícono `error` en `--danger` y mensaje en `--text`.

**Comportamiento** (sin cambios):
- Cabecera: pill de estado coloreado (`200 OK`), tiempo (ms/s), tamaño (B/KB/MB) con tooltip de desglose (headers/body).
- Pestañas **Body** y **Headers (n)**.
- Body: vista **Formateado** (JSON/XML indentado y resaltado, CodeMirror en solo lectura con plegado) y **Crudo**. Imágenes se previsualizan. Binarios: mensaje + botón guardar. Si supera `maxResponseBytesToRender`, no se renderiza y se ofrece guardar.
- Acciones: copiar body, guardar a archivo, buscar (Ctrl+F dentro del visor), ajuste de línea, alternar orientación.
- Estados: *vacío* ("Pulsa Send para ver la respuesta"), *cargando* (barra de progreso indeterminada + tiempo transcurrido + Cancelar), *error de red* (ícono, mensaje claro: DNS, conexión rechazada, TLS, timeout, cancelado).
- La respuesta se conserva en memoria por request mientras la app esté abierta; se pierde al cerrar o cambiar de perfil (R7).

### Toasts
**Visual** (*sin diseño todavía*): tarjeta de ~360 px, fondo `--surface-1`, `--radius-md`, `--shadow-float`, padding 10 12, ícono 18 del color del tipo (`--success`, `--info`, `--warning`, `--danger`), texto `--fs-md`, acción como botón fantasma, cerrar como botón solo ícono. Margen de 16 px a la esquina, 8 px entre toasts.

**Comportamiento** (sin cambios):
- Esquina inferior derecha, apilados (máx. 4), entrada con deslizamiento suave.
- Tipos: éxito (3 s), info (4 s), advertencia (6 s), error (persistente hasta cerrar). Pausa al pasar el ratón.
- Pueden llevar una acción (Reintentar, Ir al archivo, Importar).

### Modal Preferencias (Ajustes › Preferencias…)
**Visual:**
- Scrim `--scrim` a pantalla completa, modal centrado de **560 px** de ancho, fondo `--surface-1`, `--radius-lg`, `--shadow-float`, `role="dialog"` + `aria-modal`.
- Cabecera: padding 18 12 12 20, gap 10; ícono `settings_applications` 20 en `--text-muted` · título "Preferencias" `--fs-lg` peso 600 `letter-spacing: -.01em` · botón cerrar solo ícono de 28 px (`--text-faint`) a la derecha.
- Cuerpo: padding 8 20 22, secciones separadas 22 px. Cada sección: título de sección con ícono (padding inferior 8) y filas.
- Fila de opción: padding 8 0, gap 20; a la izquierda la etiqueta en `--text` y debajo una descripción en `--text-faint` (gap 2); a la derecha el control.
  - Timeout: campo numérico de 30 px con valor mono (ancho 50) + "s". Error: borde `--danger` y mensaje "Entre 1 y 600 segundos" debajo.
  - SSL y redirecciones: interruptores.
  - Aviso SSL (al apagar): aviso en línea `gpp_maybe` + "Solo para servidores de desarrollo con certificados autofirmados.", justo bajo la fila, margen inferior 4.
  - Tamaño máximo: campo numérico + "MB".
  - Tema: control segmentado sobre `--surface-2` con ícono + texto (Oscuro `dark_mode`, Claro `light_mode`, Sistema `contrast`), segmentos de 25 px.
  - Zoom: dropdown mono de 30 px (valor "100 %", ancho 55) + botón "100 %" (alto 30, mono, fondo `--surface-2`, texto `--text-muted`; hover `--surface-3`/`--text`).
  - Perfil actual: etiqueta arriba y, debajo (gap 8), input de solo lectura (mono) con la ruta completa del archivo del perfil abierto (carpeta + archivo, sin recortar; se desplaza dentro del input; placeholder "Ningún perfil abierto") + botón secundario **Abrir carpeta** (`folder_open`, misma acción que Archivo › Ir al archivo; deshabilitado sin perfil).
- Pie: padding 12 20, gap 8, fondo `--bg`, borde superior de 1 px (`inset 0 1px 0 var(--border)`). Botones de 32 px: **Restablecer valores por defecto** (fantasma con `restart_alt`, alineado ópticamente al borde con margen −8) · espacio · **Cancelar** (secundario) · **Guardar** (primario, padding 0 18; deshabilitado con `opacity .4` mientras haya errores).

**Comportamiento** (sin cambios). Opciones **generales de la app** (se guardan en `fastclient.settings.json`, no en el perfil).

| Sección | Opción | Control | Por defecto |
|---|---|---|---|
| Red | Timeout por defecto | Número en segundos (1–600). Descripción: "Se usa cuando el request no define uno." | 30 s |
| Red | Verificar certificados SSL | Interruptor. Descripción: "Rechaza conexiones con certificados no válidos." Al apagarlo se muestra un aviso ámbar: *"Solo para servidores de desarrollo con certificados autofirmados."* | Encendido |
| Red | Seguir redirecciones en requests nuevos | Interruptor (valor inicial de la opción del request). Descripción: "Valor inicial; cada request puede cambiarlo." | Encendido |
| Red | Tamaño máximo de respuesta a mostrar | Número en MB (1–100). Descripción: "Por encima, se ofrece guardar a archivo." | 5 MB |
| Interfaz | Tema | Control segmentado Oscuro / Claro / Sistema (el mismo valor que el menú) | Oscuro |
| Interfaz | Zoom | Selector con porcentajes (50 %–200 %) + botón "100 %" | 100 % |
| Perfiles | Perfil actual | Ruta de solo lectura del archivo abierto (carpeta + archivo) + botón **Abrir carpeta** | — (informativo) |

- Pie: **Restablecer valores por defecto** (botón fantasma, a la izquierda, pide confirmación) · **Cancelar** · **Guardar** (primario).
- Tema y zoom se previsualizan en vivo; Cancelar/Esc/botón cerrar revierte. El resto se aplica al pulsar Guardar.
- Validación en línea (borde `--danger` + mensaje bajo el campo); Guardar deshabilitado mientras haya errores.
- Los cambios aplican de inmediato a los siguientes requests, sin reiniciar.

### Diálogos
**Visual** (*sin diseño todavía*): misma carcasa que Preferencias (scrim, `--surface-1`, `--radius-lg`, `--shadow-float`, pie en `--bg`), ancho ~440 px, ícono de 20 px en la cabecera (`help` en `--accent`, `report` en `--danger`), texto en `--text-muted`, botones base en el pie (la acción destructiva usa el botón peligro).

**Comportamiento** (sin cambios):
- Modal propio (no `window.confirm`), con ícono, título, texto, botones con íconos. Foco atrapado; Esc = cancelar; Enter = acción primaria (nunca la destructiva).
- Los diálogos de archivos (abrir/guardar) son los **nativos** del sistema (`dialog.showOpenDialog` / `showSaveDialog` en main).

### Tooltips
*Sin diseño todavía*: fondo `--surface-3`, texto `--text` `--fs-sm`, padding 4 8, `--radius-sm`, `--shadow-tip` (sombra corta; `--shadow-float` dejaba un halo demasiado grande para un elemento tan pequeño), aparición tras 500 ms. Incluyen el atajo cuando existe (p. ej. "Nuevo request (Ctrl+T)", "Ocultar panel (Ctrl+B)", "Formatear (Ctrl+Shift+F)").

## Atajos de teclado

| Atajo | Acción |
|---|---|
| Ctrl+N | Archivo › Nuevo |
| Ctrl+O | Archivo › Abrir |
| Ctrl+Shift+S | Archivo › Reubicar |
| Ctrl+Shift+E | Archivo › Ir al archivo |
| Ctrl+S | Guardar ahora |
| Ctrl+Q | Salir |
| Ctrl+= / Ctrl++ | Ajustes › Zoom: Ampliar |
| Ctrl+- | Ajustes › Zoom: Reducir |
| Ctrl+0 | Zoom al 100 % |
| Ctrl+, | Ajustes › Preferencias |
| Ctrl+T | Nuevo request en pestaña |
| Ctrl+W | Cerrar pestaña |
| Ctrl+Tab / Ctrl+Shift+Tab | Pestaña siguiente / anterior |
| Ctrl+1…9 | Ir a pestaña n |
| Ctrl+Enter | Send |
| Esc (con request en curso) | Cancelar |
| Ctrl+L | Foco en la URL |
| Ctrl+B | Mostrar/ocultar sidebar |
| Ctrl+K | Foco en el buscador del sidebar |
| F2 | Renombrar elemento seleccionado |
| Supr | Eliminar elemento seleccionado (con confirmación) |

## Accesibilidad mínima
- Todo operable con teclado; foco visible (`outline` de 2 px con `--accent`).
- Árbol con roles `tree` / `treeitem`, `aria-expanded` y `aria-selected`.
- Interruptores con `role="switch"` + `aria-checked`; control segmentado de tema con `radiogroup` / `radio`.
- Contraste AA en texto principal y secundario en ambos temas.

## Decisiones sobre diferencias diseño/funcional (2026-09-25)

1. La cuarta sub-pestaña del request se llama **Opciones** (ícono `instant_mix`), para no confundirla con el menú Ajustes.
2. Se **mantiene** el punto de "sin guardar" junto al nombre del perfil en la barra de título (doc 04 §2), dibujado como el de las pestañas.
3. Orientación por defecto: **lado a lado**, que corresponde a `splitOrientation: "vertical"` (divisor vertical). `"horizontal"` = apilados.
4. El overlay de los controles de ventana y el `backgroundColor` de la ventana usan `--surface-1` del tema activo (doc 02).
