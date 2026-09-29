# Decisiones

Decisiones no cubiertas explícitamente por los docs, tomadas con la opción más simple.

## 2026-09-25 · Traslado del diseño aprobado a `05-interfaz.md`

- **Escala del prototipo.** El handoff (`docs/diseno/project/`) está dibujado al 80 %: barra de título 32 px (spec 40), sidebar 224 (spec 280), modal Preferencias 448 (spec ~560), badge de método 35 (spec 44). Todas las medidas de doc 05 se convierten a 1:1 multiplicando por 1,25 y redondeando a px enteros. La tipografía base del prototipo (10 px) queda en `--fs-md: 13px` (12,5 redondeado).
- **`--warning` en tema claro.** El prototipo usa `#b86e00` en el área de trabajo y `#9a5c00` en el modal Preferencias (sobre `--warning-bg`). Se adopta `#9a5c00` para `--warning` (mejor contraste del aviso SSL) y se mantiene `#b86e00` para `--m-post` y `--syn-number`.
- **`--warning-bg` en tema oscuro.** Solo aparece en la pantalla de Preferencias; se adopta como token global.
- **Tokens derivados** (no aparecen en el diseño, siguen el patrón `color / .10–.12`): `--accent-bg`, `--danger-bg`, `--info-bg`, `--var-missing`, `--var-missing-bg`; `--m-head` / `--m-options` en claro = `--text-muted`.
- **Componentes sin diseño de alta fidelidad** (menús, diálogos, toasts, tooltips, estados vacíos/carga/error, tabla clave/valor, Headers, Auth, botón peligro): se especifican en doc 05 a partir de los tokens y controles base del diseño aprobado, marcados como *sin diseño todavía*.
- **Controles de ventana.** Siguen siendo el overlay nativo (doc 02); las medidas del diseño (46 px, hover rojo `#c42b1c`) coinciden con las nativas de Windows y quedan solo como referencia.

## 2026-09-25 · Construcción (fases 0–7)

**Stack y dependencias**
- React **18** (lo fija CLAUDE.md, aunque ya existe la 19). TypeScript **5.9**: typescript-eslint aún no soporta TS 7. Vite **7**: electron-vite 5 no admite Vite 8.
- Las dependencias que solo usa el renderer (React, Zustand, CodeMirror, dnd-kit, fuentes e íconos) están en `devDependencies`, porque Vite las empaqueta. En `dependencies` quedan solo `undici` y `zod`, que usa main en tiempo de ejecución.
- Vite no incrusta assets como `data:` (`assetsInlineLimit: 0`): la CSP solo admite fuentes de `'self'`.
- La versión de la app (User-Agent `FastClient/<versión>`) se inyecta desde `package.json` en el build de main.

**Contrato IPC** (canales añadidos o ampliados respecto al doc 02; todos en `src/shared/ipc.ts`)
- `FileOpResult` tiene además los estados `conflict` (existe el perfil por defecto) y `save-failed` (no se pudo guardar el actual). El renderer muestra sus diálogos propios y vuelve a invocar con `resolution` o `skipSave`. Cancelar el "Guardar como" de "Reubicar el existente primero" vuelve al diálogo anterior.
- El conflicto de arranque llega en `InitResult.startupConflictPath` y el renderer muestra el diálogo sobre la interfaz ya visible. En modo arranque, Esc equivale a "Abrir el existente".
- Canales nuevos:
  - `file:remove-recent`: quitar un reciente inexistente.
  - `file:pick-attachment`: archivo de un campo Multipart.
  - ~~`app:open-profiles-dir`~~: retirado; el botón "Abrir carpeta" de Preferencias usa `file:reveal` (igual que Archivo › Ir al archivo).
  - `app:quit`: Archivo › Salir.
  - `app:rendered`: primer render con el perfil.
  - `menu:command`: aceleradores del menú nativo oculto.
  - `app:open-path`: `.fcprofile` abierto con la app ya en marcha.
- Main emite `settings:changed` en cada actualización de configuración, no solo con el zoom.

**Ventana y arranque**
- La ventana se muestra cuando se cumplen dos condiciones: `ready-to-show` y `app:rendered`, es decir, cuando la interfaz ya está pintada con el perfil. Hay un límite de 3 s por seguridad.
- La variable `ELECTRON_RUN_AS_NODE` (la define VS Code) impide arrancar Electron. Los e2e la eliminan del entorno.

**Comportamiento de la interfaz**
- El punto de "sin guardar" de la barra de título refleja cualquier cambio del perfil desde el último guardado, incluidos pestañas y anchos (todo va al archivo). El punto de cada pestaña refleja solo las ediciones de ese request.
- Crear colección: el guardado se lanza primero y el modo renombrar empieza sin esperar al disco. Así el foco pasa al campo de nombre y un Enter no crea una segunda colección.
- Duplicar colección guarda con `collection-created`.
- Variables de colección: el diálogo aplica los cambios en memoria al pulsar Guardar. No es un momento de guardado.
- Pegar un cURL en la URL no pega el texto: muestra un toast con la acción **Importar**.
- El resaltado de `{{variables}}` en la URL usa una capa espejo. El tooltip de la barra lista todas las variables con su valor, en lugar de mostrar un tooltip por variable.
- Supr y F2 actúan sobre la selección del árbol solo si el foco no está en un campo de texto. El estado "sidebar colapsado" no se guarda en el perfil, porque no forma parte del modelo.
- Headers: los headers automáticos (gris, solo lectura) se muestran encima de los del usuario.
- Preferencias: tema y zoom se previsualizan aplicándolos de verdad, y Cancelar/Esc restaura los valores originales. "Restablecer valores por defecto" pide confirmación, repone el borrador y previsualiza tema y zoom. El resto se guarda al pulsar Guardar.
- Redirecciones: las sigue `HttpService` manualmente (máx. 10) para conocer la URL final y cambiar a GET en 303, y en 301/302 si el método era POST.
- Importar cURL: fuera de comillas, la barra invertida solo escapa espacios, comillas y caracteres especiales del shell, para que rutas como `C:\tmp` sobrevivan.

**Pruebas y empaquetado**
- `tests/fixtures/selfsigned.{crt,key}` es un certificado autofirmado **solo para pruebas** (CN=localhost).
- Los specs e2e cuyo nombre empieza por `_` son auxiliares locales (capturas) y están ignorados por git y por Playwright.
- `resources/icon.png` (256 px) se genera con el `bolt` de la marca. electron-builder lo convierte a `.ico`.
- Atajos globales (Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Shift+S/E, Ctrl+Q, Ctrl+=/-/0, Ctrl+,): se resuelven en main con `before-input-event` en lugar de con aceleradores del menú nativo oculto. Así funcionan con la barra de menú oculta y se pueden verificar en los e2e. El menú nativo solo conserva los roles de edición.
- Las peticiones de foco (URL tras Ctrl+T, buscador) se atienden una sola vez. Antes, al cambiar de pestaña o al volver a mostrar el sidebar, el componente recién montado recuperaba el foco.
- Renombrado inline: el estado indica dónde se edita (árbol o pestaña). Antes, un request abierto en una pestaña mostraba dos campos a la vez y el renombrado se confirmaba solo.
- Respuesta: el ajuste de línea viene **activado por defecto**, para que valores largos (tokens, base64) se lean sin scroll horizontal. El botón `wrap_text` lo desactiva durante la sesión.

## 2026-09-29 · Sin Prettier

- Se retiró Prettier (dependencia, script `format`, `.prettierrc.json`, `.prettierignore`). El código nunca siguió su configuración y al pasarlo reformateaba líneas no tocadas, ensuciando los diffs. El estilo lo marca cada archivo y ESLint.

## 2026-09-29 · Publicación y actualizaciones

- El repo pasa a ser público bajo licencia MIT. Los releases se publican en GitHub Releases con `electron-builder` (`publish: github` en `electron-builder.yml`). El workflow `.github/workflows/release.yml` compila y publica al subir un tag `vX.Y.Z` que coincida con `package.json`.
- Actualizaciones con `electron-updater` en el proceso main (`UpdateService`). Al iniciar, 5 s después de mostrar la ventana, busca una versión nueva, la descarga en segundo plano y la instala al cerrar. Es una excepción deliberada al principio "offline por diseño": el usuario la apaga en Preferencias → Actualizaciones (`checkForUpdates` en la configuración, `true` por defecto).
- La búsqueda automática es silenciosa si no hay novedades o falla la red. "Buscar ahora" (Preferencias) siempre informa el resultado con un toast.
- Cuando la descarga termina, un toast ofrece **Reiniciar ahora**. Ese botón cierra con el flujo normal (guardado final del perfil) y, en lugar de `app.quit()`, llama a `quitAndInstall(silent, reabrir)`.
- En desarrollo y en los e2e (`FASTCLIENT_HOME`) el servicio está desactivado y nunca toca la red.
- La landing vive en `site/` y se publica en GitHub Pages con `.github/workflows/pages.yml`. `docs/` sigue siendo solo para especificaciones. `site/` no entra en el instalador ni en ESLint.
