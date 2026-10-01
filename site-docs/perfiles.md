# Archivos de perfil

Todo tu trabajo en Fast Client vive en un archivo de perfil con extensión `.fcprofile`: colecciones, requests, variables, las pestañas abiertas e incluso el ancho de los paneles. Esta página explica dónde está ese archivo, cuándo se guarda y cómo crear, abrir, mover y compartir perfiles.

## Qué guarda un perfil

| Se guarda | No se guarda |
|---|---|
| Colecciones y su orden | Las respuestas del servidor |
| Requests: método, URL, params, headers, body, auth y opciones | Los archivos adjuntos de Multipart (solo su ruta) |
| Variables de cada colección | Las preferencias de la app (tema, zoom, timeout por defecto…) |
| Pestañas abiertas y la pestaña activa | |
| Ancho de la barra lateral, proporción y orientación del editor y la respuesta | |

Las preferencias se guardan aparte, en la configuración de la app, porque son tuyas y no del proyecto: si le pasas tu perfil a alguien, no le cambias el tema ni el timeout.

El archivo es JSON legible, con indentación. Puedes abrirlo en cualquier editor de texto y compararlo con Git:

```json
{
  "formatVersion": 1,
  "app": "fast-client",
  "name": "perfil",
  "collections": [
    {
      "name": "API Tienda",
      "variables": [
        { "key": "baseUrl", "value": "https://api.tienda.dev", "enabled": true }
      ],
      "requests": [
        { "name": "Crear pedido", "method": "POST", "url": "{{baseUrl}}/orders" }
      ]
    }
  ]
}
```

*(Ejemplo resumido: el archivo real incluye identificadores, fechas y el resto de campos de cada request.)*

::: warning Editar el archivo a mano
Puedes hacerlo con la app cerrada, pero con cuidado: si el archivo deja de ser un perfil válido, Fast Client no lo abrirá. Nunca lo sobrescribe en ese caso, así que podrás corregirlo.
:::

## Dónde está

| Qué | Ubicación |
|---|---|
| Perfil por defecto | `C:\Users\<tu usuario>\Documents\Fast Client\perfil.fcprofile` |
| Configuración de la app | `C:\Users\<tu usuario>\AppData\Roaming\Fast Client\fastclient.settings.json` |

El perfil por defecto es solo el punto de partida: puedes tener tantos perfiles como quieras, en cualquier carpeta, por ejemplo uno dentro del repositorio de cada proyecto.

Para encontrar el perfil abierto:

- Pasa el ratón sobre su nombre en la barra de título: el tooltip muestra la ruta completa.
- Haz doble clic sobre ese nombre, usa <span class="ui">Archivo › Ir al archivo</span> o pulsa <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>. Se abre el Explorador de Windows con el archivo seleccionado.
- En <span class="ui">Ajustes › Preferencias</span>, la sección <span class="ui">Perfiles</span> muestra la ruta y un botón <span class="ui">Abrir carpeta</span>.

Si la carpeta Documentos no está disponible (por ejemplo, porque está redirigida a una unidad de red desconectada), Fast Client usa una carpeta `perfiles` dentro de su configuración y te lo avisa una vez.

## Cuándo se guarda

Fast Client **no** guarda con cada tecla. Guarda el perfil automáticamente en estos momentos:

- Al **enviar** un request (sin hacerte esperar la respuesta).
- Al **crear** una colección o un request, incluido duplicar.
- Al **renombrar** una colección o un request.
- Al **eliminar** una colección o un request.
- Al terminar de **redimensionar** un panel.
- Antes de crear o abrir **otro perfil**.
- Al **cerrar** la app, también si Windows se apaga.

Y cuando tú quieras, con <kbd>Ctrl</kbd>+<kbd>S</kbd>.

Entre un momento y otro, los cambios están en memoria. Los indicadores te dicen qué falta guardar:

- Un **punto junto al nombre del perfil**, en la barra de título: hay algún cambio sin guardar en el perfil.
- Un **punto en una pestaña**, en lugar de la ✕: ese request tiene ediciones sin guardar. Al pasar el ratón, el punto vuelve a ser la ✕ para cerrar.

Cerrar una pestaña con cambios no los descarta: el request sigue en memoria y se guarda en el siguiente momento de guardado.

::: tip
Si vas a hacer muchos cambios sin enviar nada, por ejemplo preparar diez requests nuevos, pulsa <kbd>Ctrl</kbd>+<kbd>S</kbd> de vez en cuando.
:::

### Un archivo que nunca queda a medias

Cada guardado escribe primero un archivo temporal en la misma carpeta y, solo cuando está completo, reemplaza el perfil. Si se corta la luz o el disco se llena a mitad de camino, el perfil anterior queda intacto.

Si el guardado falla (la carpeta ya no existe, el archivo es de solo lectura, se desconectó el USB…), verás un aviso de error con dos acciones: <span class="ui">Reintentar</span> y <span class="ui">Reubicar…</span>, que te deja guardarlo en otra carpeta.

## El menú Archivo

| Opción | Atajo | Qué hace |
|---|---|---|
| **Nuevo** | <kbd>Ctrl</kbd>+<kbd>N</kbd> | Empieza un perfil vacío en la carpeta por defecto. |
| **Abrir…** | <kbd>Ctrl</kbd>+<kbd>O</kbd> | Abre un perfil existente. |
| **Abrir reciente** | | Los últimos 8 perfiles abiertos. |
| **Reubicar…** | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | Mueve el perfil abierto a otra carpeta o le cambia el nombre. |
| **Ir al archivo** | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | Muestra el perfil en el Explorador de Windows. |
| **Salir** | <kbd>Ctrl</kbd>+<kbd>Q</kbd> | Guarda y cierra la app. |

Antes de **Nuevo** y **Abrir**, Fast Client guarda el perfil actual. Si no puede, te pregunta si quieres continuar sin guardar.

### Nuevo

El perfil nuevo siempre se crea como `perfil.fcprofile` en la carpeta por defecto. Si esa carpeta está libre, se crea sin preguntas. Si ya hay un perfil ahí, Fast Client te pregunta qué hacer:

- **Reubicar el existente primero.** Elige dónde mover el perfil que ya estaba (se sugiere un nombre con la fecha, como `perfil-2026-10-01.fcprofile`). Después se crea el nuevo. Es la opción recomendada: tu trabajo anterior queda a salvo con un nombre propio.
- **Crear nuevo de todas formas.** El perfil anterior se reemplaza por uno vacío, pero antes se copia a `perfil.fcprofile.bak` en la misma carpeta. Esa copia se sobrescribe la próxima vez que hagas lo mismo, así que no la uses como archivo de trabajo.
- **Cancelar.** No cambia nada.

::: tip Recuperar un perfil desde el .bak
Cambia el nombre de `perfil.fcprofile.bak` a, por ejemplo, `perfil-recuperado.fcprofile` y ábrelo con <span class="ui">Archivo › Abrir…</span>.
:::

### Abrir

Abre el diálogo de Windows para elegir un archivo `.fcprofile` (también acepta `.json`). Al abrirlo, Fast Client recupera sus colecciones y sus pestañas tal como quedaron.

- Si el archivo no es un perfil válido, verás el error «El archivo no es un perfil válido de Fast Client» y **seguirás en tu perfil actual**.
- Las respuestas que tenías en pantalla se descartan al cambiar de perfil.

También puedes abrir un perfil con doble clic desde el Explorador de Windows, con la app abierta o cerrada. Si ya estaba abierta, se comporta igual que <span class="ui">Abrir…</span>.

En <span class="ui">Abrir reciente</span>, los perfiles que ya no existen aparecen deshabilitados, con la opción de quitarlos de la lista.

### Reubicar

<span class="ui">Reubicar…</span> funciona como un «Guardar como» que **mueve**: eliges la nueva carpeta y nombre, Fast Client escribe allí el perfil con todos los cambios (también los no guardados), comprueba que la copia es válida y borra el archivo original. Sigues trabajando en la nueva ubicación.

El nombre del perfil que ves en la barra de título es el nombre del archivo, así que reubicar también sirve para renombrarlo.

Si reubicas el perfil por defecto, la carpeta por defecto queda libre y el próximo <span class="ui">Nuevo</span> no preguntará nada.

## Al abrir la app

Fast Client abre automáticamente el último perfil que usaste. Si ese archivo ya no existe o no se puede leer, te avisa, inicia un perfil nuevo y **no toca el archivo dañado**. Si en la carpeta por defecto ya hay un perfil, te ofrece abrirlo en lugar de crear otro.

Solo puede haber una ventana de Fast Client. Si la abres de nuevo, se enfoca la que ya estaba.

## Compartir y versionar un perfil

Como el perfil es un archivo, compartirlo es copiarlo: por correo, en una carpeta compartida o en un USB. Quien lo reciba lo abre con <span class="ui">Archivo › Abrir…</span> o con doble clic.

Para un equipo, lo más cómodo es guardarlo **dentro del repositorio del proyecto**. Usa <span class="ui">Reubicar…</span> para moverlo ahí, y cada cambio en las colecciones quedará en el historial de Git como cualquier otro archivo.

::: danger Revisa los secretos antes de compartir
Tokens, contraseñas de <span class="ui">Auth</span> y valores de variables se guardan en texto plano. Antes de subir el perfil a un repositorio o enviarlo, reemplaza los valores reales por algo como `<tu-token>` y pide a cada persona que ponga el suyo.
:::

Ten en cuenta también que:

- El archivo cambia cuando abres o cierras pestañas, o mueves un divisor, porque también guarda el estado de la pantalla. Esos cambios aparecerán en tus diffs.
- Las rutas de los archivos adjuntos en Multipart son de tu equipo y no funcionarán en otro.
- Un perfil creado con una versión más nueva de Fast Client no se abre en una versión anterior. Actualiza la app si ves el error «Este perfil fue creado con una versión más reciente de Fast Client».

## Situaciones especiales

| Situación | Qué hace Fast Client |
|---|---|
| Borraste el archivo del perfil con la app abierta | Lo vuelve a crear en el mismo lugar en el siguiente guardado y te avisa. |
| La carpeta del perfil desapareció (USB retirado, unidad de red caída) | El guardado falla y te ofrece <span class="ui">Reintentar</span> o <span class="ui">Reubicar…</span>. |
| El archivo es de solo lectura | Igual que el caso anterior. |
| La app no logra guardar al cerrarse | Te pregunta si quieres <span class="ui">Reintentar</span>, <span class="ui">Reubicar…</span> o <span class="ui">Salir sin guardar</span>. |
| La configuración de la app se dañó | La renombra a `fastclient.settings.json.corrupt` y arranca con las preferencias por defecto. Tus perfiles no se ven afectados. |
| Desinstalas Fast Client | Tus perfiles y tu configuración se quedan en su sitio. Si vuelves a instalar la app, los encontrará. |
