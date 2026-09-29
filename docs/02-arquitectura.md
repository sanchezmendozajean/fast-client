# 02 · Arquitectura

## Visión general

```
┌──────────────────────────── Proceso MAIN (Node) ────────────────────────────┐
│  AppLifecycle ── WindowManager ── IPC handlers                              │
│       │                                                                     │
│       ├── PathsService      (carpeta de perfiles y de configuración)      │
│       ├── SettingsService   (fastclient.settings.json)                      │
│       ├── ProfileService    (leer/validar/escribir .fcprofile, cola atómica)│
│       ├── FileMenuService   (Nuevo/Abrir/Reubicar/Ir al archivo + diálogos) │
│       └── HttpService       (undici, cancelación, timeout, métricas)        │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ IPC tipado (invoke / on)
┌──────────────── PRELOAD ─────────────┴── expone window.api (contextBridge) ──┐
└──────────────────────────────────────▲──────────────────────────────────────┘
┌──────────────────────── RENDERER (React, sandbox) ──────────────────────────┐
│  App ─ TitleBar(menú Archivo) ─ Sidebar(árbol) ─ Workspace(pestañas)        │
│  Zustand store: profile (colecciones, requests, pestañas) + ui + responses  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Quién es dueño de qué**

- El **renderer** es dueño del estado editable (Zustand). Cada cambio relevante se refleja en main con `profile:sync` (debounce 300 ms) para que main siempre tenga una copia reciente **en memoria**. `sync` **no escribe a disco**.
- **Main** es dueño del disco. Solo escribe en los *momentos de guardado* (doc 04), usando la última instantánea recibida o una que venga adjunta en la llamada.
- Las **respuestas HTTP** viven solo en el store del renderer (`responses: Record<requestId, ResponseState>`), nunca en el perfil.

Esto hace que cerrar la app sea inmediato y seguro: main ya tiene la instantánea y solo la escribe.

## Estructura de carpetas

```
Fast Client/
├── CLAUDE.md
├── docs/
├── resources/                     # icon.ico, icon.png (empaquetado)
├── electron.vite.config.ts
├── electron-builder.yml
├── package.json
├── tsconfig*.json
├── src/
│   ├── shared/                    # importable desde main, preload y renderer
│   │   ├── types.ts               # Collection, RequestDef, KeyValue, Profile...
│   │   ├── profile-schema.ts      # zod + migraciones por formatVersion
│   │   ├── ipc.ts                 # contrato de canales IPC
│   │   └── defaults.ts            # fábricas: newCollection(), newRequest()...
│   ├── main/
│   │   ├── index.ts               # bootstrap, lifecycle, single-instance lock
│   │   ├── window.ts              # BrowserWindow, CSP, titleBarOverlay
│   │   ├── ipc-handlers.ts
│   │   └── services/
│   │       ├── paths-service.ts
│   │       ├── settings-service.ts
│   │       ├── profile-service.ts
│   │       ├── file-menu-service.ts
│   │       ├── http-service.ts
│   │       └── atomic-write.ts
│   ├── preload/
│   │   └── index.ts               # contextBridge.exposeInMainWorld('api', ...)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── i18n/es.ts
│           ├── styles/            # tokens.css, reset.css, themes.css, fonts.css
│           ├── store/             # profile-store.ts, ui-store.ts, response-store.ts
│           ├── lib/               # interpolate.ts, url-params.ts, curl.ts, format.ts
│           └── components/
│               ├── Icon/
│               ├── TitleBar/      # incluye FileMenu
│               ├── Sidebar/       # CollectionTree, TreeNode, SidebarSearch
│               ├── Workspace/     # TabBar, Tab, EmptyWorkspace
│               ├── RequestEditor/ # UrlBar, MethodSelect, ParamsTable, HeadersTable,
│               │                  # BodyEditor, AuthPanel
│               ├── ResponseViewer/
│               ├── Toast/
│               ├── Dialog/        # modal propio (confirmaciones con íconos)
│               └── common/        # Button, IconButton, KeyValueTable, Menu, Tooltip,
│                                  # SplitPane, InlineRename, Dropdown
└── tests/
    ├── unit/
    ├── e2e/
    └── fixtures/                  # perfiles de ejemplo, servidor HTTP de pruebas
```

## Contrato IPC (`src/shared/ipc.ts`)

Todos los canales se declaran en un único objeto tipado; preload y handlers se generan/validan contra él.

| Canal | Dirección | Entrada | Salida | Uso |
|---|---|---|---|---|
| `app:init` | R → M (invoke) | — | `InitResult` | Arranque: perfil cargado + avisos (toasts) |
| `profile:sync` | R → M (send) | `Profile` | — | Instantánea en memoria, sin escribir |
| `profile:save` | R → M (invoke) | `{ profile, reason }` | `SaveResult` | Escritura en un momento de guardado |
| `file:new` | R → M (invoke) | `{ profile }` | `FileOpResult` | Menú Archivo › Nuevo |
| `file:open` | R → M (invoke) | `{ profile }` | `FileOpResult` | Menú Archivo › Abrir |
| `file:relocate` | R → M (invoke) | `{ profile }` | `FileOpResult` | Menú Archivo › Reubicar |
| `file:reveal` | R → M (invoke) | — | `boolean` | Archivo › Ir al archivo (Explorador con el perfil seleccionado) |
| `settings:get` | R → M (invoke) | — | `AppSettings` | Leer configuración (Preferencias) |
| `settings:update` | R → M (invoke) | `Partial<AppSettings>` | `AppSettings` | Guardar tema, zoom o Preferencias; main aplica efectos (overlay, zoom) |
| `app:zoom` | R → M (invoke) | `'in' \| 'out' \| 'reset'` | `number` (factor) | Ajustes › Zoom |
| `settings:changed` | M → R (event) | `AppSettings` | — | Cambios originados en main (atajos de zoom) |
| `http:send` | R → M (invoke) | `{ requestId, resolved: ResolvedRequest }` | `HttpResult` | Ejecutar request |
| `http:cancel` | R → M (invoke) | `{ requestId }` | — | Abortar |
| `response:save` | R → M (invoke) | `{ suggestedName, bytesBase64 }` | `boolean` | Guardar body de respuesta |
| `app:before-close` | M → R (event) | — | — | Aviso para enviar el último `profile:sync` |
| `app:toast` | M → R (event) | `Toast` | — | Notificaciones originadas en main |
| `file:remove-recent` | R → M (invoke) | `string` | `RecentEntry[]` | Quitar un reciente que ya no existe |
| `file:pick-attachment` | R → M (invoke) | — | `string | null` | Archivo de un campo Multipart (diálogo nativo) |
| `app:quit` | R → M (invoke) | — | — | Archivo › Salir (pasa por el cierre seguro) |
| `app:rendered` | R → M (send) | — | — | Primer render con el perfil: main ya puede mostrar la ventana |
| `menu:command` | M → R (event) | `MenuCommand` | — | Aceleradores del menú nativo oculto (Ctrl+N, Ctrl+O…) |
| `app:open-path` | M → R (event) | `string` | — | `.fcprofile` abierto con la app ya en marcha |

`FileOpResult` = `ok` (con la sesión, los recientes y los toasts) · `cancelled` · `error` · `conflict` (existe el perfil por defecto: el renderer pregunta y reinvoca con `resolution`) · `save-failed` (reinvoca con `skipSave`). Ver `src/shared/types.ts` y `docs/decisiones.md`.

Los `invoke` del menú Archivo **reciben la instantánea actual** del renderer para guardarla antes de cambiar de perfil (momento de guardado "Nuevo/Abrir").

## Seguridad de la ventana

```ts
new BrowserWindow({
  show: false,
  backgroundColor: '#151820',          // --surface-1 del tema (barra de título/sidebar) para evitar flash
  titleBarStyle: 'hidden',
  titleBarOverlay: { color: '#151820', symbolColor: '#8e97a7', height: 40 },  // --surface-1 / --text-muted
  webPreferences: {
    preload, contextIsolation: true, nodeIntegration: false, sandbox: true,
    spellcheck: false,
  },
});
```

- CSP en `index.html`: `default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'`.
- Bloquear navegación y `window.open` (`will-navigate`, `setWindowOpenHandler` → `deny`).
- `app.requestSingleInstanceLock()`: una sola instancia; si se abre otra, enfocar la existente (evita dos procesos escribiendo el mismo perfil).
- `titleBarOverlay.color` (y `symbolColor`) se actualiza al cambiar de tema: `--surface-1` y `--text-muted` del tema activo (oscuro `#151820`/`#8e97a7`, claro `#f5f6f8`/`#586170`).
- **Zoom**: main aplica `webContents.setZoomFactor(f)` y, como la barra de título propia crece con el zoom pero los controles nativos no, llama también a `win.setTitleBarOverlay({ height: Math.round(40 * f) })`. El factor se restaura al arrancar.

## Barra de título propia

Se usa `titleBarStyle: 'hidden'` para poder dibujar los menús **Archivo** y **Ajustes** con íconos (los menús nativos de Windows no admiten Material Symbols). La barra muestra: logo · menús Archivo y Ajustes · nombre del perfil actual (con tooltip de la ruta completa) · controles nativos de ventana (overlay). La zona libre es arrastrable (`-webkit-app-region: drag`; botones con `no-drag`).

Se conserva un `Menu` de aplicación nativo **oculto** solo para registrar aceleradores globales (Ctrl+N, Ctrl+O, Ctrl+Shift+S, Ctrl+Shift+E, Ctrl+Q, Ctrl+=, Ctrl+-, Ctrl+0, Ctrl+,) y roles de edición (copiar/pegar/deshacer).
