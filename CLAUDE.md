# CLAUDE.md — Fast Client

Cliente HTTP de escritorio, minimalista y elegante, inspirado en Postman (área de trabajo con pestañas) y Bruno (árbol Colecciones > Requests). Construido con Electron.

## Antes de escribir código

1. Lee `docs/README.md` y sigue el orden de lectura que indica.
2. Trabaja **por fases**, según `docs/07-plan-de-implementacion.md`. No empieces una fase sin cumplir los criterios de aceptación de la anterior.
3. **Diseño visual:** si existe `docs/diseno/` con un handoff de Claude Design o `docs/diseno/tokens.css`, eso manda en lo visual (colores, espaciados, componentes) por encima de `docs/05-interfaz.md`. Stack, íconos locales, flujos y persistencia no cambian por el diseño.
4. Si una decisión no está cubierta por los docs, elige la opción más simple, déjala anotada en `docs/decisiones.md` (créalo si no existe) y sigue.

## Stack (no cambiar sin consultar)

| Capa | Tecnología |
|---|---|
| Shell de escritorio | Electron (última estable) |
| Build / dev server | electron-vite |
| Lenguaje | TypeScript en modo `strict` en main, preload y renderer |
| UI | React 18 + CSS Modules + variables CSS (sin Tailwind, sin librerías de componentes) |
| Estado (renderer) | Zustand |
| Editores de código (body / respuesta) | CodeMirror 6 |
| Drag & drop | @dnd-kit |
| Validación del archivo de perfil | zod (esquema en `src/shared`) |
| HTTP | `undici` en el proceso **main** (nunca `fetch` desde el renderer) |
| Íconos | Material Symbols de Google, **empaquetados localmente** (paquete npm `material-symbols`) |
| Tipografías | Inter y JetBrains Mono vía `@fontsource` (locales) |
| Tests | Vitest (unitarios) + Playwright para Electron (e2e) |
| Empaquetado | electron-builder, destino Windows (`nsis`) |
| Formato del perfil | JSON (`.fcprofile`). **No** usar SQLite (ver doc 03) |

## Comandos

```bash
npm install          # dependencias
npm run dev          # app en modo desarrollo con HMR
npm run typecheck    # tsc --noEmit en todos los proyectos
npm run lint         # eslint
npm test             # vitest
npm run test:e2e     # playwright (_electron)
npm run build        # build de producción
npm run dist         # instalador con electron-builder
```

Al terminar cada tarea: `npm run typecheck && npm run lint && npm test` deben pasar.

## Reglas no negociables

- **Cero red en la interfaz.** Nada de CDNs, Google Fonts online ni íconos remotos. La CSP del renderer es `default-src 'self'`; cualquier recurso externo es un bug. Las únicas peticiones de red salen del proceso main: las del `HttpService`, solo cuando el usuario pulsa *Send*, y las del `UpdateService` (buscar actualizaciones en GitHub Releases), que el usuario puede desactivar en Preferencias.
- **Seguridad Electron:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. El renderer solo habla con main mediante la API tipada que expone el preload (`window.api`). Nunca expongas `ipcRenderer` completo.
- **Datos en la carpeta del usuario**, nunca junto al ejecutable: perfiles en `Documentos\Fast Client`, configuración en `%APPDATA%\Fast Client` (doc 04 §1).
- **El archivo de perfil es sagrado.** Toda escritura es atómica (archivo temporal + `rename`) y pasa por la cola única de `ProfileService`. Nunca se guardan las respuestas del servidor.
- **La interfaz de trabajo se ve al abrir.** Sin pantallas de bienvenida ni splash. La ventana se muestra en `ready-to-show` con el perfil ya cargado o con el estado vacío.
- **Guardado automático solo en los momentos definidos** en `docs/04-persistencia-y-perfil.md`. No agregues autosave por tecla sin que se pida.
- Los íconos se usan en casi todo: botones, menús, menús contextuales, pestañas y árbol. Usa siempre el componente `<Icon name="..." />`.

## Convenciones

- **Responde siempre en español** al usuario (explicaciones, resúmenes y preguntas).
- Código, identificadores, nombres de archivo y commits: **inglés**. Textos visibles al usuario: **español** (centralizados en `src/renderer/src/i18n/es.ts`).
- Componentes React: `PascalCase.tsx` con su `PascalCase.module.css` al lado.
- Canales IPC definidos una sola vez en `src/shared/ipc.ts` (nombre + tipos de entrada y salida).
- Tipos del dominio en `src/shared/types.ts`; el esquema zod del perfil en `src/shared/profile-schema.ts` es la fuente de verdad.
- **Nunca uses Prettier** (ni otro formateador automático). Se retiró del proyecto: el código no sigue su configuración y reformateaba líneas no tocadas. Formatea a mano siguiendo el estilo del archivo que editas.
- Nada de `any`. Funciones puras siempre que se pueda (interpolación de variables, parseo de cURL, sincronía URL ↔ params) y con test.
- Colores, espaciados, radios y sombras solo mediante tokens de `src/renderer/src/styles/tokens.css`.

## Mapa de la documentación

| Archivo | Contenido |
|---|---|
| `docs/README.md` | Índice y orden de lectura |
| `docs/01-vision-y-alcance.md` | Qué es, qué no es, requisitos del usuario |
| `docs/02-arquitectura.md` | Procesos, estructura de carpetas, IPC, seguridad |
| `docs/03-modelo-de-datos.md` | Formato del archivo de perfil y de configuración |
| `docs/04-persistencia-y-perfil.md` | Autoguardado, menú Archivo (Nuevo, Abrir, Reubicar), arranque |
| `docs/05-interfaz.md` | Diseño visual, layout, componentes, íconos, atajos |
| `docs/06-motor-http.md` | Ejecución de requests, variables, respuesta |
| `docs/07-plan-de-implementacion.md` | Fases y criterios de aceptación |
| `docs/08-pruebas.md` | Estrategia de pruebas y escenarios obligatorios |
