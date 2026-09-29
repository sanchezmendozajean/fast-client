# 05 · Interfaz

## Dirección visual

Sobria, oscura por defecto, con mucho aire y pocos bordes. Referencias de sensación: Linear, Raycast, VS Code con tema limpio. Reglas:

- Jerarquía por **tono de superficie**, no por líneas. Bordes de 1 px y muy tenues.
- Un único color de acento. Los colores fuertes se reservan para métodos HTTP y códigos de estado.
- Radios suaves (6–10 px), sombras solo en elementos flotantes (menús, diálogos, toasts).
- Transiciones de 120–180 ms (`cubic-bezier(.2,.8,.2,1)`); respetar `prefers-reduced-motion`.
- Densidad cómoda: filas de árbol de 28 px, pestañas de 36 px, barra de título de 40 px.

## Layout

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ◆ Fast Client   Archivo      perfil.fcprofile •                   ─  ▢  ✕     │ 40px TitleBar
├──────────────────┬────────────────────────────────────────────────────────────┤
│ 🔍 Buscar…    ＋ │ [GET Listar empleados ✕] [POST Crear pago • ✕]  ＋         │ TabBar
│                  ├────────────────────────────────────────────────────────────┤
│ ▾ 📁 API Planillas│ [GET ▾] {{baseUrl}}/employees?page=1              [ ➤ Send ]│ UrlBar
│    GET Listar…   │ Params  Headers(2)  Body  Auth  Ajustes                    │
│    POST Crear…   │ ┌──────────────────────────────────────────────────────┐   │
│ ▸ 📁 Auth        │ │ tabla clave / valor                                   │   │
│                  │ └──────────────────────────────────────────────────────┘   │
│                  ├──────────────────────── ═══ (divisor arrastrable) ═════────┤
│                  │ ● 200 OK   142 ms   3.2 KB        Body  Headers(12)  ⧉ ⤓   │
│                  │ { "items": [ … ] }                                          │
├──────────────────┴────────────────────────────────────────────────────────────┤
│ (sin barra de estado; los mensajes van por toast)                             │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Sidebar redimensionable (200–480 px, por defecto 280) y colapsable (Ctrl+B).
- División request/respuesta redimensionable; alternar vertical/horizontal con un botón en la cabecera de la respuesta. Ambos valores se guardan en `workspace`.

## Tokens (`styles/tokens.css`)

```css
:root, [data-theme="dark"] {
  --bg:            #0f1115;
  --surface-1:     #151820;   /* sidebar, tabbar */
  --surface-2:     #1b1f28;   /* inputs, tablas */
  --surface-3:     #232835;   /* hover, seleccionado */
  --border:        #262c38;
  --text:          #e6e8ee;
  --text-muted:    #8a93a3;
  --text-faint:    #5c6474;
  --accent:        #7c9cff;
  --accent-strong: #5b7cf5;
  --success: #3fcf8e;  --warning: #f5b544;  --danger: #f06a6a;  --info: #5fb3f5;

  --m-get: #3fcf8e; --m-post: #f5b544; --m-put: #5fb3f5; --m-patch: #b48cff;
  --m-delete: #f06a6a; --m-head: #8a93a3; --m-options: #8a93a3;

  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --shadow-float: 0 10px 30px rgb(0 0 0 / .45), 0 0 0 1px var(--border);
  --font-ui: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --fs-sm: 12px; --fs-md: 13px; --fs-lg: 15px;
  --ease: cubic-bezier(.2,.8,.2,1);
}
[data-theme="light"] {
  --bg: #f7f8fa; --surface-1: #ffffff; --surface-2: #f1f3f6; --surface-3: #e7eaf0;
  --border: #e1e5ec; --text: #1a1d24; --text-muted: #5d6675; --text-faint: #98a0ad;
  --accent: #4b6bfb; --accent-strong: #3553e0;
  --shadow-float: 0 10px 30px rgb(20 30 60 / .12), 0 0 0 1px var(--border);
}
```

Colores de estado HTTP: 1xx `--info`, 2xx `--success`, 3xx `--accent`, 4xx `--warning`, 5xx y errores de red `--danger`.

## Íconos (R2)

- Paquete `material-symbols` (npm). Importar **solo** la variante *Rounded*: `import 'material-symbols/rounded.css'` en `styles/fonts.css`. Vite copia el `.woff2` al bundle → funciona sin internet.
- Componente único:

```tsx
<Icon name="send" size={18} fill={false} weight={400} />
// <span class="material-symbols-rounded" style="font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20">send</span>
```

- `aria-hidden` en íconos decorativos; los `IconButton` sin texto llevan `aria-label` y tooltip.
- Estado activo/seleccionado: `fill` en 1.

### Mapa de íconos

| Lugar | Ícono (Material Symbols) |
|---|---|
| Logo / marca | `bolt` |
| Menú Ajustes | `settings` (botón), Zoom: Ampliar `zoom_in`, Zoom: Reducir `zoom_out`, Tema oscuro `dark_mode`, Tema claro `light_mode`, Tema según el sistema `contrast`, tema activo `check`, Preferencias `settings_applications` |
| Modal Preferencias | Red `lan`, Interfaz `palette`, Perfiles `folder_managed` (o `folder`), Restablecer `restart_alt`, aviso SSL `gpp_maybe` |
| Menú Archivo | `description` (botón), Nuevo `note_add`, Abrir `file_open`, Abrir reciente `history`, Reubicar `drive_file_move`, Ir al archivo `folder_open`, Salir `logout` |
| Sidebar | Buscar `search`, Nueva colección `create_new_folder`, colapsar sidebar `left_panel_close` / `left_panel_open` |
| Colección | cerrada `folder`, abierta `folder_open`, expandir `chevron_right` (rota 90°), Nuevo request `add`, Renombrar `edit`, Duplicar `content_copy`, Variables `data_object`, Eliminar `delete` |
| Request (menú contextual) | Abrir `open_in_new`, Renombrar `edit`, Duplicar `content_copy`, Copiar como cURL `terminal`, Mover a… `drive_file_move`, Eliminar `delete` |
| Pestañas | Nueva `add`, Cerrar `close`, cambios sin guardar `circle` (8 px, relleno), Cerrar otras `tab_close` (o `close`), Cerrar todas `cancel` |
| Barra de URL | Enviar `send`, Cancelar `stop_circle`, Importar cURL `content_paste` |
| Sub-pestañas del request | Params `tune`, Headers `list_alt`, Body `data_object`, Auth `key`, Ajustes `settings` |
| Tablas clave/valor | Habilitar (checkbox), Eliminar fila `remove_circle_outline` (o `delete`), Edición masiva `edit_note` |
| Respuesta | Copiar `content_copy`, Guardar `download`, Formatear `format_align_left`, Buscar `search`, Ajuste de línea `wrap_text`, Orientación `splitscreen` / `vertical_split` |
| Toasts | Éxito `check_circle`, Info `info`, Advertencia `warning`, Error `error`, Cerrar `close` |
| Diálogos | Pregunta `help`, Peligro `report` |
| Estado vacío | `bolt` grande + atajos sugeridos |

## Componentes y comportamiento

### TitleBar + menús Archivo y Ajustes
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
- Al centro/izquierda: nombre del perfil + punto de "sin guardar". Tooltip con la ruta completa. Doble clic en el nombre = Ir al archivo.

### Sidebar: árbol Colecciones > Requests (R4)
- Cabecera: buscador (filtra por nombre de request/colección y por URL; resalta coincidencias) + botón **Nueva colección**.
- Colección: chevron, ícono carpeta, nombre, contador de requests en tono tenue; botones de acción (`add`, `more_horiz`) visibles al pasar el ratón.
- Request: badge del método (texto en mono, 10–11 px, color del método, ancho fijo 44 px) + nombre. Clic = abrir/enfocar pestaña. Seleccionado = `--surface-3` + barra de acento de 2 px a la izquierda.
- **Renombrar inline**: doble clic, F2 o menú. Enter confirma, Esc cancela, vacío restaura. Confirmar un nombre distinto guarda a disco (`renamed`).
- **Crear colección**: se inserta "Nueva colección" y entra directo en modo renombrar (guardado: `collection-created`).
- **Eliminar**: diálogo de confirmación indicando cuántos requests se borrarán; cierra sus pestañas y guarda a disco (`deleted`).
- **Arrastrar y soltar** (@dnd-kit): reordenar colecciones, reordenar requests, mover requests entre colecciones.
- Menú contextual (clic derecho) con íconos, según el mapa anterior.
- **Variables de colección**: diálogo con una tabla clave/valor.
- Estado vacío: ilustración con ícono + botón "Crear tu primera colección".

### Workspace: pestañas (R5)
- Cada pestaña: badge del método + nombre + punto de cambios sin guardar o botón cerrar (el punto se convierte en ✕ al pasar el ratón).
- Botón **+** al final (y Ctrl+T): crea un request "Nuevo request" `GET` en la colección de la pestaña activa; si no hay pestaña activa, en la colección seleccionada en el sidebar; si no existe ninguna colección, crea "Mi colección". Se abre en pestaña nueva, con foco en la URL. Guardado: `request-created`.
- Clic central o Ctrl+W cierra; Ctrl+Tab / Ctrl+Shift+Tab navega; Ctrl+1..9 salta.
- Menú contextual: Cerrar, Cerrar otras, Cerrar a la derecha, Cerrar todas, Duplicar, Mostrar en el árbol.
- Reordenar arrastrando. Desbordamiento con scroll horizontal y sombras en los bordes.
- Doble clic en el título de la pestaña = renombrar request.
- Sin pestañas: estado vacío con atajos (Ctrl+T nuevo request, Ctrl+O abrir perfil).

### Editor de request
- **UrlBar**: selector de método (dropdown con colores) · input de URL en fuente mono con resaltado de `{{variables}}` (verde si existe en la colección, rojo si no; tooltip con el valor resuelto) · botón **Send** de acento con ícono (se convierte en **Cancelar** mientras hay un request en curso). Ctrl+Enter envía desde cualquier parte del editor. Pegar un texto que empieza por `curl ` ofrece importarlo (toast con acción).
- **Params**: tabla sincronizada en ambos sentidos con la query string de la URL.
- **Headers**: tabla clave/valor con autocompletado de nombres comunes (`Content-Type`, `Authorization`, `Accept`…). Muestra en gris, de solo lectura, los headers automáticos (Content-Type según el body, Authorization según Auth, User-Agent `FastClient/<versión>`).
- **Body**: selector de modo. JSON/Text/XML usan CodeMirror (resaltado, plegado, Ctrl+Shift+F formatea JSON, aviso de JSON inválido no bloqueante). Form URL-encoded y Multipart usan tablas; en Multipart cada fila elige texto o archivo (selector de archivo nativo).
- **Auth**: None / Bearer / Basic; campos con botón de mostrar/ocultar (`visibility` / `visibility_off`).
- **Ajustes**: timeout del request (vacío = global), seguir redirecciones.
- Contadores en las sub-pestañas: "Headers (3)" cuenta solo los habilitados.
- **Tabla clave/valor** (componente común): siempre hay una fila vacía al final que se convierte en real al escribir; checkbox para habilitar; eliminar con ícono; Tab navega entre celdas; modo "edición masiva" (texto `clave: valor` por línea).

### Visor de respuesta
- Cabecera: pill de estado coloreado (`200 OK`), tiempo (ms/s), tamaño (B/KB/MB) con tooltip de desglose (headers/body).
- Pestañas **Body** y **Headers (n)**.
- Body: vista **Formateado** (JSON/XML indentado y resaltado, CodeMirror en solo lectura con plegado) y **Crudo**. Imágenes se previsualizan. Binarios: mensaje + botón guardar. Si supera `maxResponseBytesToRender`, no se renderiza y se ofrece guardar.
- Acciones: copiar body, guardar a archivo, buscar (Ctrl+F dentro del visor), ajuste de línea.
- Estados: *vacío* ("Pulsa Send para ver la respuesta"), *cargando* (barra de progreso indeterminada + tiempo transcurrido + Cancelar), *error de red* (ícono, mensaje claro: DNS, conexión rechazada, TLS, timeout, cancelado).
- La respuesta se conserva en memoria por request mientras la app esté abierta; se pierde al cerrar o cambiar de perfil (R7).

### Toasts
- Esquina inferior derecha, apilados (máx. 4), entrada con deslizamiento suave.
- Tipos: éxito (3 s), info (4 s), advertencia (6 s), error (persistente hasta cerrar). Pausa al pasar el ratón.
- Pueden llevar una acción (Reintentar, Ir al archivo, Importar).

### Modal Preferencias (Ajustes › Preferencias…)
Opciones **generales de la app** (se guardan en `fastclient.settings.json`, no en el perfil). Modal centrado de ~560 px de ancho, con título, secciones con ícono y pie de botones.

| Sección | Opción | Control | Por defecto |
|---|---|---|---|
| Red | Timeout por defecto | Número en segundos (1–600) | 30 s |
| Red | Verificar certificados SSL | Interruptor. Al apagarlo se muestra un aviso ámbar: *"Solo para servidores de desarrollo con certificados autofirmados."* | Encendido |
| Red | Seguir redirecciones en requests nuevos | Interruptor (valor inicial de la opción del request) | Encendido |
| Red | Tamaño máximo de respuesta a mostrar | Número en MB (1–100); por encima se ofrece guardar a archivo | 5 MB |
| Interfaz | Tema | Control segmentado Oscuro / Claro / Sistema (el mismo valor que el menú) | Oscuro |
| Interfaz | Zoom | Selector con porcentajes (50 %–200 %) + botón "100 %" | 100 % |
| Perfiles | Carpeta de perfiles | Ruta de solo lectura + botón **Abrir carpeta** | `Documentos\Fast Client` |

- Pie: **Restablecer valores por defecto** (botón fantasma, a la izquierda, pide confirmación) · **Cancelar** · **Guardar** (primario).
- Tema y zoom se previsualizan en vivo; Cancelar/Esc revierte. El resto se aplica al pulsar Guardar.
- Validación en línea (borde `--danger` + mensaje bajo el campo); Guardar deshabilitado mientras haya errores.
- Los cambios aplican de inmediato a los siguientes requests, sin reiniciar.

### Diálogos
- Modal propio (no `window.confirm`), con ícono, título, texto, botones con íconos. Foco atrapado; Esc = cancelar; Enter = acción primaria (nunca la destructiva).
- Los diálogos de archivos (abrir/guardar) son los **nativos** del sistema (`dialog.showOpenDialog` / `showSaveDialog` en main).

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
- Árbol con roles `tree` / `treeitem` y `aria-expanded`.
- Contraste AA en texto principal y secundario en ambos temas.
