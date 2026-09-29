# 04 · Persistencia y perfil

Este es el documento más importante. (Por qué el perfil es JSON y no SQLite: ver doc 03.) Todo lo que el usuario escribe (colecciones, requests, URL, params, headers, body, auth, pestañas abiertas) vive en **un archivo de perfil**. Las respuestas del servidor **nunca** se guardan.

## 1. Ubicaciones: carpeta de perfiles y configuración

> Cambio acordado con el usuario: los datos **no** se guardan junto al ejecutable (en `Program Files` no se puede escribir), sino en la carpeta del usuario.

`PathsService` expone dos rutas:

| Ruta | Valor por defecto (Windows) | Para qué |
|---|---|---|
| **Carpeta de perfiles** `getProfilesDir()` | `app.getPath('documents')/Fast Client` → `C:\Users\<usuario>\Documents\Fast Client` | Perfil por defecto y diálogos de archivo. Visible para el usuario. |
| **Carpeta de configuración** `getConfigDir()` | `app.getPath('userData')` → `C:\Users\<usuario>\AppData\Roaming\Fast Client` | `fastclient.settings.json`. Interna de la app. |

- Perfil por defecto: `<perfiles>/perfil.fcprofile`.
- Configuración: `<config>/fastclient.settings.json`.
- La carpeta de perfiles se crea con `mkdir -p` al arrancar si no existe.
- **Desarrollo** (`!app.isPackaged`): ambas rutas apuntan a `<proyecto>/.dev-data/` para no mezclar datos de prueba con los reales.
- **Tests**: si existe `process.env.FASTCLIENT_HOME`, ambas rutas apuntan ahí (tiene prioridad sobre todo lo demás).
- Si la carpeta de perfiles no se puede crear o escribir (p. ej. Documentos redirigido a una unidad de red caída), se usa `<config>/perfiles` y se muestra una sola vez el toast ⚠ *"No se pudo usar la carpeta Documentos. Tus perfiles se guardarán en …"*.
- En `.gitignore` del proyecto: `.dev-data/`.

En el resto de este documento, "**carpeta de perfiles**" reemplaza a lo que el requisito original llamaba "raíz del programa".

## 2. Momentos de guardado

El perfil se escribe a disco **solo** en estos momentos (R9). Cada escritura lleva un `reason` para logs y tests.

| # | Momento | `reason` | Cuándo exactamente |
|---|---|---|---|
| 1 | Crear colección | `collection-created` | Tras insertar la colección en el store (antes de entrar en modo renombrar) |
| 2 | Crear pestaña/request | `request-created` | Al crear un request nuevo (botón **+** de pestañas, Ctrl+T, menú de colección, duplicar) |
| 3 | Enviar | `send` | Al pulsar **Send**/Ctrl+Enter. Se dispara en paralelo con el request, sin bloquearlo |
| 4 | Cerrar el programa | `close` | En el cierre de la ventana (ver §7) |
| 5 | Nuevo / Abrir | `before-new` / `before-open` | Se guarda el perfil **actual** antes de cambiar a otro |
| 6 | Renombrar colección o request | `renamed` | Al confirmar el renombrado (Enter o perder el foco), solo si el nombre cambió. Incluye renombrar desde la pestaña |
| 7 | Eliminar colección o request | `deleted` | Tras aceptar el diálogo de confirmación y quitar el elemento del store (y cerrar sus pestañas) |
| 8 | Manual | `manual` | Ctrl+S (atajo de seguridad; no aparece en el menú) |
| 9 | Redimensionar paneles | `resized` | Al soltar el divisor del sidebar o el de request/respuesta (o al restablecerlo con doble clic), solo si el tamaño cambió. Pedido por el usuario el 2026-09-29 |

Entre momentos de guardado, los cambios quedan en memoria (renderer + copia en main vía `profile:sync`). La interfaz muestra un punto de "cambios sin guardar" en la barra de título y en cada pestaña modificada; desaparece tras un guardado exitoso.

> No agregar otros momentos de guardado (p. ej. autosave por tecla) sin pedirlo al usuario. Si durante la implementación se ve un riesgo real de pérdida de datos, anotarlo en `docs/decisiones.md` y consultarlo.

## 3. Escritura segura (`atomic-write.ts` + `ProfileService`)

1. Serializar con `JSON.stringify(profile, null, 2)` y actualizar `updatedAt`.
2. Escribir en `<destino>.tmp-<pid>` en la **misma carpeta**, `fsync`.
3. `fs.rename(tmp, destino)`. En Windows, reintentar hasta 5 veces con backoff (50→800 ms) ante `EPERM`/`EBUSY` (antivirus, indexador).
4. Si todo falla: borrar el `.tmp`, devolver error y mostrar toast de error con acción **Reintentar**.

Cola única: las escrituras se serializan. Si llega una nueva mientras otra está en curso, solo se conserva la más reciente pendiente (*latest wins*).

## 4. Arranque (R3, R8, R13)

```
leer settings (si no existe o es inválido → valores por defecto)
│
├─ lastProfilePath == null  (primer arranque)
│    ├─ no existe <perfiles>/perfil.fcprofile → crear perfil vacío ahí, guardarlo
│    └─ existe → cargarlo
│
├─ lastProfilePath existe y es válido → cargarlo
│
└─ lastProfilePath no existe o es ilegible/inválido
     ├─ toast ⚠ "No se encontró el perfil «<nombre>» en <ruta>. Se inició un perfil nuevo."
     │    (o "…no se pudo leer (formato inválido)…" si existe pero está corrupto; nunca se sobrescribe)
     └─ ejecutar el flujo NUEVO (§5) en modo "arranque"
```

Luego: guardar `lastProfilePath` en settings, restaurar pestañas y pestaña activa, mostrar la ventana (`ready-to-show`). La ventana nunca espera diálogos de archivo para mostrarse: si el flujo Nuevo necesita preguntar, el diálogo aparece **sobre** la interfaz ya visible (con el área de trabajo vacía detrás).

## 5. Archivo › Nuevo (R10) — `Ctrl+N`

```
1. Guardar el perfil actual (reason: before-new).
   └─ si falla → diálogo "No se pudo guardar el perfil actual. ¿Continuar de todas formas?"
                 [Cancelar] [Continuar sin guardar]
2. ¿Existe <perfiles>/perfil.fcprofile?
   ├─ NO → crear perfil vacío ahí → cargar → fin.
   └─ SÍ → diálogo:
        Título: "Ya existe un perfil por defecto"
        Texto:  "<ruta>. ¿Qué quieres hacer?"
        [drive_file_move  Reubicar el existente primero]
        [note_add         Crear nuevo de todas formas]   (estilo peligro)
        [                 Cancelar]
        │
        ├─ Reubicar → diálogo nativo "Guardar como" (carpeta inicial: la carpeta de perfiles,
        │             nombre sugerido: perfil-AAAA-MM-DD.fcprofile)
        │     ├─ cancelado → volver al diálogo anterior
        │     └─ destino elegido → MOVER el archivo de la carpeta de perfiles al destino (§8)
        │                          → añadir destino a recientes → crear perfil vacío en la carpeta de perfiles
        ├─ Crear de todas formas → copiar el existente a perfil.fcprofile.bak (reemplaza el .bak anterior)
        │                          → crear perfil vacío en la carpeta de perfiles
        │                          → toast ℹ "Se guardó una copia de respaldo en perfil.fcprofile.bak"
        └─ Cancelar → nada cambia.
3. "Crear perfil vacío": interfaz en blanco (sin colecciones, sin pestañas), escribir a disco,
   settings.lastProfilePath = <perfiles>/perfil.fcprofile, toast ✓ "Nuevo perfil creado".
```

**Modo arranque** (§4): el botón *Cancelar* se reemplaza por **"Abrir el existente"** (carga el perfil de la carpeta de perfiles), porque al iniciar no hay perfil previo al que volver.

## 6. Archivo › Abrir (R11) — `Ctrl+O`

1. Guardar el perfil actual (reason: `before-open`), con el mismo manejo de error que Nuevo.
2. Diálogo nativo de apertura, filtros: *Perfil de Fast Client (\*.fcprofile)*, *JSON (\*.json)*. Carpeta inicial: la del perfil actual.
3. Cancelado → nada. Mismo archivo que el actual → toast ℹ "Ese perfil ya está abierto".
4. Leer y validar (zod + migración). Inválido → toast ✕ "El archivo no es un perfil válido de Fast Client" y **se mantiene el perfil actual**.
5. Válido → reemplazar estado, restaurar pestañas, limpiar respuestas en memoria, actualizar settings y recientes, toast ✓ "Perfil «nombre» abierto".

Submenú **Abrir reciente** dentro de Archivo (hasta 8). Las entradas cuyo archivo ya no existe se muestran deshabilitadas con opción de quitarlas.

## 7. Cierre del programa (R9-4, R13)

1. `win.on('close')` → `preventDefault()` la primera vez.
2. Main envía `app:before-close`; el renderer responde con `profile:save { reason: 'close' }` con su instantánea final.
3. Si el renderer no responde en 2 s, main escribe la última instantánea de `profile:sync`.
4. Guardar settings (tamaño/posición de ventana, `lastProfilePath`).
5. `win.destroy()` → `app.quit()`.
6. Manejar también `session-end` (apagado de Windows): escritura síncrona con la última instantánea.

Si el guardado final falla: diálogo nativo "No se pudo guardar el perfil" con [Reintentar] [Reubicar…] [Salir sin guardar].

## 8. Archivo › Reubicar (R12) — `Ctrl+Shift+S`

Es "Guardar como" que **mueve**: tras la operación, el archivo original deja de existir y el trabajo continúa en la nueva ruta.

1. Diálogo nativo "Guardar como": carpeta inicial = carpeta actual, nombre sugerido = nombre actual, filtro `*.fcprofile`. (Si el usuario no escribe extensión, añadir `.fcprofile`.)
2. Cancelado o misma ruta → nada.
3. Escribir la instantánea **actual** en el destino (escritura atómica, §3). Así la copia movida incluye los cambios no guardados.
4. Verificar leyendo y validando el destino.
5. Borrar el archivo original. Si falla → toast ⚠ "Se guardó en <destino>, pero no se pudo eliminar el original".
6. Actualizar ruta actual, `profile.name` (= nombre del archivo sin extensión), settings, recientes (reemplazar la ruta vieja).
7. Toast ✓ "Perfil reubicado en <ruta>" con acción **Ir al archivo**.

Consecuencia deseada: si se reubica el perfil por defecto, la carpeta de perfiles queda libre y el próximo **Nuevo** no preguntará nada.

Para **mover** un archivo que no es el actual (caso "Reubicar el existente primero" del §5): `fs.rename`; si falla con `EXDEV` (otra unidad), copiar + verificar + borrar.

## 9. Archivo › Ir al archivo — `Ctrl+Shift+E`

Abre el Explorador de Windows en la carpeta del perfil actual, **con el archivo seleccionado**.

1. Renderer invoca `file:reveal`.
2. Main: si el archivo existe → `shell.showItemInFolder(rutaDelPerfil)`.
3. Si el archivo no existe pero su carpeta sí → `shell.openPath(carpeta)` + toast ℹ "El archivo aún no existe en disco; se abrió su carpeta".
4. Si tampoco existe la carpeta → toast ✕ "No se encontró la carpeta del perfil" con acción **Reubicar…**.

También se accede con doble clic sobre el nombre del perfil en la barra de título y desde la acción **Ir al archivo** de los toasts de Reubicar.

## 10. Casos borde obligatorios

| Caso | Comportamiento |
|---|---|
| Se borra el perfil abierto mientras la app corre | El siguiente guardado lo recrea en la misma ruta; toast ℹ "El perfil se había eliminado y fue recreado" |
| Carpeta del perfil deja de existir (USB retirado) | Guardado falla → toast ✕ con acciones **Reintentar** y **Reubicar…** |
| Perfil de solo lectura | Igual que el anterior |
| `formatVersion` mayor que la soportada | No abrir; toast ✕ "Este perfil fue creado con una versión más reciente de Fast Client" |
| Settings corrupto | Renombrar a `fastclient.settings.json.corrupt` y usar valores por defecto |
| Segunda instancia | Se enfoca la ventana existente; la nueva sale sin tocar archivos |
| Pestañas abiertas cuyo request ya no existe | Se descartan al cargar |
