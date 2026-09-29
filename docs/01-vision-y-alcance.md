# 01 · Visión y alcance

## Problema

Los clientes HTTP existentes tienen, cada uno, un defecto que rompe la productividad: cuentas obligatorias, sincronización en la nube, lentitud al abrir, interfaces recargadas o datos repartidos en cientos de archivos. Fast Client resuelve una sola cosa y la hace bien: **abrir, escribir un request, enviarlo, ver la respuesta**, con todo guardado en **un único archivo portable** que el usuario controla.

## Principios

1. **Instantáneo.** Al abrir, ya estás en el área de trabajo. Sin login, sin splash, sin "¿qué quieres hacer hoy?".
2. **Un archivo = todo tu trabajo.** El perfil se puede copiar, mover, versionar o enviar.
3. **Offline por diseño.** La interfaz no hace ninguna llamada de red. Íconos y fuentes viven dentro de la app. La única excepción es buscar actualizaciones al iniciar, que se puede desactivar en Preferencias.
4. **Minimalista pero completo.** Solo lo que se usa a diario, cada cosa pulida.
5. **Bonito.** Diseño sobrio, oscuro por defecto, con jerarquía visual clara y microinteracciones suaves.

## Requisitos del usuario (fuente original)

> Se conservan casi literales. Si algún doc contradice esta lista, **gana esta lista**.

- R1. Aplicación Electron con interfaz bonita y elegante.
- R2. Íconos (Google Icons / Material Symbols) en la mayoría de opciones, menús y botones. **Nada online**: los íconos viven dentro de la aplicación.
- R3. Al abrir el programa se muestra directamente la interfaz de trabajo.
- R4. Panel izquierdo jerárquico **Colecciones > Requests** (estilo Bruno). Colecciones y requests tienen un nombre editable.
- R5. Área derecha con **pestañas** de requests, completamente funcional.
- R6. Menú **Archivo** con **Nuevo**, **Abrir**, **Reubicar**.
- R7. El archivo de perfil guarda colecciones, requests, headers, body, URL, etc. **Nunca las respuestas del servidor.**
- R8. En el primer arranque se crea un perfil por defecto en la carpeta de perfiles del usuario (`Documentos\Fast Client`). *Originalmente "raíz del programa"; se cambió porque en `Program Files` no se puede escribir.*
- R9. Guardado automático al: crear colección · crear pestaña/request · **renombrar** o **eliminar** colecciones y requests · hacer *Send* · cerrar el programa · elegir *Nuevo* o abrir otro perfil · soltar un divisor de paneles tras redimensionar.
- R10. **Nuevo** limpia la interfaz y crea un perfil nuevo en la carpeta de perfiles. Si ya existe ahí el perfil por defecto, pregunta si se quiere crear igual o reubicar el existente primero.
- R11. **Abrir** carga un perfil distinto.
- R12. **Reubicar** mueve el perfil actual a otra carpeta y con otro nombre (equivalente a "Guardar como", pero moviendo).
- R13. Al cerrar y volver a abrir se carga el último perfil usado. Si ya no existe, se notifica con un **toast** y se arranca como en **Nuevo**.
- R14. **Ir al archivo** (menú Archivo): abre el Explorador de archivos en la carpeta donde está el perfil actual.
- R15. Menú **Ajustes**, al lado de Archivo: Zoom: Ampliar · Zoom: Reducir · ─ · Tema oscuro · Tema claro · Tema según el sistema · ─ · Preferencias. **Preferencias** abre un modal con las opciones generales de la app.

## Alcance v1 (sí)

- CRUD de colecciones y requests con renombrado inline, duplicado, borrado con confirmación y reordenamiento por arrastre.
- Pestañas: abrir, cerrar, reordenar, indicador de cambios sin guardar, restauración al reabrir.
- Editor de request: método, URL, Query Params (sincronizados con la URL), Headers, Body (none / JSON / Text / XML / Form URL-encoded / Multipart), Auth (None / Bearer / Basic).
- Variables de colección `{{nombre}}` (p. ej. `baseUrl`, `token`).
- Visor de respuesta: estado, tiempo, tamaño, body con resaltado y formato, headers, copiar, guardar a archivo.
- Cancelar un request en curso; timeout configurable.
- Copiar como cURL / pegar un cURL en la barra de URL para importarlo.
- Tema oscuro (por defecto) y claro.

## Fuera de alcance v1 (no)

- Cuentas, nube, sincronización, colaboración.
- Scripts pre/post request, tests automatizados, runners de colecciones.
- WebSocket, GraphQL dedicado, gRPC.
- Historial de respuestas (las respuestas nunca se persisten).
- Importar colecciones de Postman/Bruno (posible v2).
