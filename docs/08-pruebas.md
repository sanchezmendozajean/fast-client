# 08 · Pruebas

## Unitarias (Vitest) — `tests/unit`

Obligatorias para toda la lógica pura y los servicios de main (con `fs` en una carpeta temporal real, no mockeada):

| Módulo | Casos mínimos |
|---|---|
| `profile-schema` | perfil válido, campos faltantes, `formatVersion` futuro, migración, filtrado de pestañas huérfanas |
| `atomic-write` | escribe y reemplaza; no deja `.tmp`; reintento ante `EPERM` simulado |
| `ProfileService` | cola *latest wins*; nunca serializa respuestas; `updatedAt` cambia |
| `SettingsService` | por defecto, corrupto → `.corrupt`, recientes máx. 8 sin duplicados, pasos de zoom con límites, validación de Preferencias, migración de settings sin `zoomFactor`/`followRedirectsDefault` |
| `PathsService` | rutas en dev (`.dev-data`), empaquetado (Documentos / userData) y test (`FASTCLIENT_HOME`); Documentos no escribible → `<config>/perfiles` |
| `FileMenuService` | Nuevo sin/con perfil por defecto existente (3 ramas), `.bak`, Abrir inválido, Reubicar misma ruta, Reubicar con `EXDEV` |
| `interpolate` | variables definidas, no definidas, deshabilitadas, sin recursión |
| `url-params` | URL → params → URL idempotente; codificación; `#fragment`; params sin valor |
| `resolve-request` | auth bearer/basic, prioridad del header explícito, Content-Type automático por modo |
| `curl` | exportar/importar ida y vuelta de los casos del doc 06 |

## E2E (Playwright `_electron`) — `tests/e2e`

- Cada test lanza la app con una **carpeta temporal** como carpeta de perfiles y de configuración (variable de entorno `FASTCLIENT_HOME`) para no tocar archivos reales.
- Servidor HTTP local de pruebas (`tests/fixtures/server.ts`, Node `http`): `/echo` (devuelve método, headers y body), `/status/:code`, `/delay/:ms`, `/json`, `/xml`, `/image.png`, `/big` (6 MB), `/redirect`. Y un servidor HTTPS autofirmado.

### Escenarios obligatorios

1. **Primer arranque**: la interfaz aparece sin diálogos; existe `perfil.fcprofile` en la carpeta de perfiles.
2. **Autoguardado**: crear colección → el archivo cambia; crear request → cambia; renombrar → cambia; eliminar → cambia; Send → cambia; editar un header sin Send → el archivo **no** cambia; cerrar → cambia.
3. **Restauración**: crear 2 colecciones, 3 requests, abrir 2 pestañas, cerrar la app, reabrir → mismo árbol, mismas pestañas, activa correcta, valores de headers/body intactos, sin respuestas.
4. **Perfil perdido**: mover el último perfil fuera, reabrir → toast visible + flujo Nuevo.
5. **Nuevo con conflicto**: con perfil por defecto existente, las tres opciones del diálogo (reubicar, crear de todas formas + `.bak`, cancelar).
6. **Abrir**: perfil válido carga; perfil inválido → toast de error y el anterior sigue activo.
7. **Reubicar**: el original desaparece, el destino existe con los cambios no guardados, el título cambia y al reiniciar se abre el destino.
8. **Send**: echo de POST JSON, cancelar un `/delay/10000`, timeout, error DNS, TLS autofirmado con y sin verificación.
9. **Ir al archivo**: `shell.showItemInFolder` recibe la ruta del perfil actual (espiar la llamada en modo test).
10. **Menú Ajustes**: zoom in/out cambia el factor y se conserva tras reiniciar; cambiar tema cambia `data-theme`; Preferencias › desactivar SSL → request a HTTPS autofirmado responde OK.
11. **Sin red externa**: interceptar peticiones del renderer; cualquier URL que no sea `file:`/`app:`/local hace fallar el test.

Los diálogos nativos de archivo se sustituyen en modo test mediante un hook en `FileMenuService` (`FASTCLIENT_TEST_DIALOG_RESPONSES`) que devuelve rutas predefinidas.

## Verificación manual antes de cada entrega

- [ ] Tema claro y oscuro revisados en todas las vistas.
- [ ] Ventana a 1024×640: nada se corta ni se solapa.
- [ ] Sin conexión a internet: todo se ve correcto.
- [ ] Abrir el `.fcprofile` en un editor: legible, sin respuestas, sin campos basura.
