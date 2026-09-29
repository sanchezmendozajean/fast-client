# Fast Client — Instructivo de construcción

Este directorio es la especificación completa para construir Fast Client con Claude Code. Está pensado para leerse en orden; cada documento asume los anteriores.

## Orden de lectura

1. [01 · Visión y alcance](01-vision-y-alcance.md) — el *por qué* y los requisitos del usuario, textuales.
2. [02 · Arquitectura](02-arquitectura.md) — procesos de Electron, carpetas, IPC.
3. [03 · Modelo de datos](03-modelo-de-datos.md) — qué contiene el archivo de perfil.
4. [04 · Persistencia y perfil](04-persistencia-y-perfil.md) — el corazón del producto: autoguardado y menú **Archivo**.
5. [05 · Interfaz](05-interfaz.md) — cómo se ve y se siente.
6. [06 · Motor HTTP](06-motor-http.md) — cómo se envían los requests y se muestran las respuestas.
7. [07 · Plan de implementación](07-plan-de-implementacion.md) — fases con criterios de aceptación.
8. [08 · Pruebas](08-pruebas.md) — cómo verificar que todo funciona.

## Glosario

| Término | Significado |
|---|---|
| **Perfil** | Archivo `.fcprofile` (JSON) con todas las colecciones, requests y el estado de pestañas. Es el "documento" de la app. |
| **Perfil por defecto** | `perfil.fcprofile` ubicado en la **carpeta de perfiles**. |
| **Carpeta de perfiles** | `Documentos\Fast Client` del usuario (ver regla exacta en doc 04 §1). |
| **Carpeta de configuración** | `%APPDATA%\Fast Client`, donde vive `fastclient.settings.json`. |
| **Colección** | Carpeta lógica con nombre que agrupa requests. |
| **Request** | Definición guardada de una petición HTTP (método, URL, params, headers, body, auth). |
| **Pestaña** | Request abierto en el área de trabajo. Cerrar una pestaña **no** borra el request. |
| **Configuración** | `fastclient.settings.json`: recuerda el último perfil usado y preferencias de la app. |
| **Momento de guardado** | Evento que dispara la escritura del perfil a disco (lista cerrada en doc 04). |
