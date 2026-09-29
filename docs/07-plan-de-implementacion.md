# 07 · Plan de implementación

Construir en este orden. Cada fase termina con: `npm run typecheck && npm run lint && npm test` en verde y los criterios de aceptación comprobados. Hacer un commit por fase (o por sub-bloque grande).

## Fase 0 — Andamiaje

- Inicializar con electron-vite (plantilla `react-ts`), TypeScript `strict`, ESLint, Vitest, Playwright.
- Estructura de carpetas del doc 02, alias `@shared`, `@renderer`.
- Ventana con `titleBarStyle: 'hidden'` + `titleBarOverlay`, CSP, seguridad, single-instance lock.
- Fuentes Inter / JetBrains Mono (`@fontsource`) y `material-symbols` rounded, **locales**.
- Tokens y temas (doc 05), componente `<Icon>`.
- `.gitignore` con `.dev-data/` (doc 04 §1).

**Aceptación**
- [ ] `npm run dev` abre una ventana con la barra de título propia, un ícono visible y el tema oscuro, sin parpadeo blanco.
- [ ] Con la red desconectada, los íconos y las fuentes se ven igual.
- [ ] DevTools › Network no muestra ninguna petición externa.

## Fase 1 — Modelo y persistencia (sin UI compleja)

- `src/shared`: tipos, esquema zod, fábricas por defecto, contrato IPC.
- `PathsService`, `SettingsService`, `atomic-write`, `ProfileService` (cola, *latest wins*, reintentos).
- Flujo de arranque completo (doc 04 §4) incluido el toast de perfil faltante.
- `profile:sync`, `profile:save`, cierre seguro (doc 04 §7).
- Store Zustand del perfil con acciones: `createCollection`, `renameCollection`, `deleteCollection`, `createRequest`, `updateRequest`, `renameRequest`, `deleteRequest`, `moveRequest`, `openTab`, `closeTab`, `setActiveTab`… Las acciones de creación disparan su momento de guardado.

**Aceptación**
- [ ] Primer arranque crea `Documentos\Fast Client\perfil.fcprofile` y `%APPDATA%\Fast Client\fastclient.settings.json` (en dev, ambos en `.dev-data/`).
- [ ] Borrar el perfil con la app cerrada → al abrir aparece el toast y se sigue el flujo Nuevo.
- [ ] Tests unitarios de `ProfileService`: escritura atómica, perfil inválido, migración, `formatVersion` futuro.

## Fase 2 — Barra de título y menú Archivo

- `TitleBar`, `FileMenu` con íconos y atajos, submenú Recientes.
- `SettingsMenu` (Zoom, Tema, Preferencias) y modal **Preferencias** (doc 05).
- `FileMenuService`: Nuevo, Abrir, Reubicar e Ir al archivo exactamente como en doc 04 §5, §6, §8, §9, con diálogos propios con íconos y diálogos nativos de archivos.
- Sistema de **Toast** y **Dialog**.
- Nombre de perfil + indicador de cambios sin guardar.

**Aceptación**
- [ ] Nuevo sin perfil por defecto en la carpeta de perfiles: crea y limpia la interfaz sin preguntar.
- [ ] Nuevo con perfil por defecto existente: aparece el diálogo con las 3 opciones y cada una hace lo documentado (incluido el `.bak`).
- [ ] Abrir un archivo inválido muestra error y conserva el perfil actual.
- [ ] Reubicar mueve el archivo (el original desaparece), actualiza el título y al reiniciar se abre la nueva ruta.
- [ ] Zoom ampliar/reducir/100 % funciona por menú y atajo, los controles nativos de la ventana quedan alineados y el zoom se conserva al reiniciar.
- [ ] El tema elegido en el menú Ajustes se marca con `check`, se aplica al instante y se conserva al reiniciar.
- [ ] Preferencias: validar, Cancelar revierte, Guardar persiste en `fastclient.settings.json`; desactivar SSL permite llamar a un servidor autofirmado sin reiniciar.
- [ ] Ir al archivo abre el Explorador en la carpeta del perfil con el archivo seleccionado.

## Fase 3 — Sidebar

- Árbol Colecciones > Requests, renombrado inline, menús contextuales, eliminar con confirmación, duplicar, drag & drop, buscador, variables de colección, estado vacío, redimensionar/colapsar.

**Aceptación**
- [ ] Crear colección guarda a disco (comprobar el archivo) y entra en modo renombrar.
- [ ] Renombrar y eliminar colecciones/requests guarda a disco inmediatamente.
- [ ] Se puede mover un request a otra colección arrastrando; el orden persiste tras reiniciar (después de un momento de guardado).
- [ ] Todo el árbol se opera con teclado.

## Fase 4 — Pestañas y editor de request

- TabBar completa (doc 05), creación con **+**/Ctrl+T (guarda a disco), restauración al reabrir.
- UrlBar con resaltado de variables, sincronía URL ↔ Params.
- KeyValueTable reutilizable, Headers con autocompletado y headers automáticos, Body (CodeMirror + tablas), Auth, Opciones.

**Aceptación**
- [ ] Editar la URL actualiza Params y viceversa, sin perder el foco ni el cursor.
- [ ] Cerrar y reabrir la app restaura las mismas pestañas, la activa y todo lo escrito (siempre que haya pasado un momento de guardado; el cierre lo es).

## Fase 5 — Motor HTTP y visor de respuesta

- `lib/interpolate.ts`, `lib/resolve-request.ts`, `HttpService`, cancelación, timeout, mapeo de errores.
- ResponseViewer completo, guardar body a archivo.
- Guardado `send`.

**Aceptación**
- [ ] GET/POST/PUT/PATCH/DELETE contra el servidor de pruebas devuelven status, headers y body correctos.
- [ ] Cancelar y timeout funcionan y se muestran con mensajes claros.
- [ ] Tras un Send, el archivo de perfil contiene el request pero **ningún** dato de la respuesta.
- [ ] Un certificado autofirmado falla con verificación activa y funciona al desactivarla.

## Fase 6 — Productividad y pulido

- Copiar como cURL / importar cURL.
- Atajos completos (doc 05).
- Animaciones, estados vacíos, tooltips, revisión de contraste en ambos temas.
- Guardar tamaño/posición de ventana.

**Aceptación**
- [ ] Todos los atajos de la tabla del doc 05 funcionan.
- [ ] Revisión visual de todas las pantallas en tema claro y oscuro.

## Fase 7 — Empaquetado

- `electron-builder.yml`: `appId: com.fastclient.app`, `productName: Fast Client`, destino Windows `nsis` con `oneClick: false` y `allowToChangeInstallationDirectory: true` (puede instalarse en `Program Files`: los datos van a la carpeta del usuario), asociación de archivo `.fcprofile` (abrir con doble clic → Abrir ese perfil).
- Ícono de la app en `resources/`.

**Aceptación**
- [ ] Instalado en `Program Files`, el perfil se crea en `Documentos\Fast Client` sin errores de permisos.
- [ ] Doble clic en un `.fcprofile` abre la app con ese perfil (o lo carga en la instancia abierta, guardando antes el actual).
- [ ] Tiempo desde el doble clic hasta la interfaz usable < 1,5 s en un equipo normal.
