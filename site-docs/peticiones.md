# Hacer una petición

Un request en Fast Client tiene seis partes: el método, la URL y cuatro secciones que se editan en sub-pestañas: <span class="ui">Params</span>, <span class="ui">Headers</span>, <span class="ui">Body</span> y <span class="ui">Auth</span>. Una quinta sub-pestaña, <span class="ui">Opciones</span>, ajusta el timeout y las redirecciones de ese request.

Esta página recorre cada parte en el orden en que normalmente las usarás.

## Crear un request

Hay tres formas:

- **<kbd>Ctrl</kbd>+<kbd>T</kbd> o el botón <span class="ui">+</span>** al final de las pestañas. El request se crea en la colección de la pestaña activa; si no hay pestañas abiertas, en la colección seleccionada en la barra lateral; y si no tienes ninguna colección, se crea «Mi colección».
- **Menú de una colección.** Pasa el ratón sobre la colección y pulsa <span class="ui">+</span>, o haz clic derecho y elige <span class="ui">Nuevo request</span>.
- **Duplicar** un request existente desde su menú contextual. La copia se llama «&lt;nombre&gt; (copia)».

Todo request nuevo empieza como <span class="method get">GET</span>, se abre en una pestaña y deja el cursor en la URL. Crear un request guarda el perfil automáticamente.

Para cambiarle el nombre, haz doble clic sobre su pestaña o sobre él en el árbol, o selecciónalo y pulsa <kbd>F2</kbd>. <kbd>Enter</kbd> confirma y <kbd>Esc</kbd> cancela.

## Método y URL

El selector a la izquierda de la URL ofrece siete métodos: <span class="method get">GET</span>, <span class="method post">POST</span>, <span class="method put">PUT</span>, <span class="method patch">PATCH</span>, <span class="method delete">DELETE</span>, <span class="method">HEAD</span> y <span class="method">OPTIONS</span>. Cada uno tiene su color, el mismo que verás en las pestañas y en el árbol.

En la URL puedes escribir:

- Una dirección completa: `https://api.ejemplo.com/users?page=2`.
- Una dirección sin esquema: `localhost:3000/health`. Al enviar, Fast Client le agrega `http://`.
- Variables de la colección: <span v-pre class="var">{{baseUrl}}</span>`/users`. Se resaltan en verde si existen y en rojo si no. Lo explicamos en [Variables](./variables).

<kbd>Ctrl</kbd>+<kbd>L</kbd> lleva el cursor a la URL desde cualquier lugar.

::: tip Pegar un comando cURL
Si pegas en la URL un texto que empieza por `curl`, Fast Client no lo pega: te ofrece importarlo con un aviso que tiene el botón <span class="ui">Importar</span>. Al aceptar, rellena el request de la pestaña activa con el método, la URL, los headers, el body y la autenticación del comando.
:::

## Params

La tabla de <span class="ui">Params</span> y la query string de la URL (lo que va después de `?`) son dos vistas de lo mismo, sincronizadas en ambos sentidos:

- Si escribes `?page=2&size=50` en la URL, la tabla muestra dos filas: `page` y `size`.
- Si agregas una fila en la tabla, aparece en la URL.

Desmarcar la casilla de una fila la **quita de la URL pero la conserva en la tabla**, para que puedas volver a activarla sin reescribirla. El orden de las filas es el orden en que se envían.

### Cómo funcionan las tablas clave/valor

Params, Headers, Form URL-encoded, Multipart y las variables usan la misma tabla:

- Siempre hay una fila vacía al final. Escribe en ella y se convierte en una fila real.
- La casilla de la izquierda activa o desactiva la fila sin borrarla.
- El ícono de la derecha elimina la fila.
- <kbd>Tab</kbd> avanza de celda en celda.
- **Edición masiva** cambia la tabla por un cuadro de texto con una fila por línea, en formato `clave: valor`. Una línea que empieza por `//` queda desactivada. Es la forma más rápida de pegar muchos headers de una vez.

```
Accept: application/json
X-Request-Id: 42
// X-Debug: true
```

## Headers

Escribe los headers como pares clave/valor. Al escribir el nombre, la tabla sugiere los más comunes (`Content-Type`, `Authorization`, `Accept`…). El número junto a <span class="ui">Headers</span> cuenta solo los headers activos.

Encima de tus headers, en gris y de solo lectura, verás los que Fast Client agrega por su cuenta:

| Header | De dónde sale |
|---|---|
| `Content-Type` | Del tipo de body elegido (ver la tabla de [Body](#body)). |
| `Authorization` | De lo que configures en [Auth](#auth). Se muestra enmascarado: `Bearer ••••••••`. |
| `User-Agent` | Siempre `FastClient/<versión>`. |

**Tus headers mandan.** Si escribes tu propio `Content-Type` o `Authorization`, Fast Client no agrega el automático.

## Body

Elige el tipo de body con el selector de la sub-pestaña <span class="ui">Body</span>:

| Tipo | Para qué | `Content-Type` automático |
|---|---|---|
| **Ninguno** | Requests sin cuerpo, como la mayoría de GET. | — |
| **JSON** | APIs REST. Editor con resaltado y plegado. | `application/json` |
| **Text** | Texto libre. | `text/plain; charset=utf-8` |
| **XML** | Servicios SOAP o XML. Editor con resaltado. | `application/xml` |
| **Form URL-encoded** | Formularios clásicos: tabla clave/valor. | `application/x-www-form-urlencoded` |
| **Multipart** | Subir archivos. Tabla donde cada fila es texto o archivo. | `multipart/form-data` con su *boundary* |

En JSON y XML, el botón <span class="ui">Formatear</span> (o <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>) ordena e indenta el contenido. Si el JSON tiene un error de sintaxis aparece el aviso <span class="ui">JSON no válido</span>, pero puedes enviarlo igual: a veces es justo lo que quieres probar.

En **Multipart**, cada fila elige entre <span class="ui">Texto</span> y <span class="ui">Archivo</span>. Para un archivo, pulsa <span class="ui">Elegir archivo…</span> y selecciónalo en el diálogo de Windows.

::: info Los archivos adjuntos no se copian al perfil
El perfil guarda solo la **ruta** del archivo, y Fast Client lo lee del disco en el momento de enviar. Si mueves o borras el archivo, el envío fallará. Si compartes el perfil, tu compañero tendrá que elegir el archivo en su equipo.
:::

::: warning Body con GET o HEAD
Fast Client te deja enviar un body con <span class="method get">GET</span> o <span class="method">HEAD</span>, pero te avisa en la respuesta: muchos servidores lo ignoran.
:::

## Auth

La sub-pestaña <span class="ui">Auth</span> genera el header `Authorization` por ti:

| Tipo | Qué completas | Qué se envía |
|---|---|---|
| **Ninguna** | Nada. | Ningún header de autenticación. |
| **Bearer** | El token. | `Authorization: Bearer <token>` |
| **Basic** | Usuario y contraseña. | `Authorization: Basic <usuario:contraseña en Base64>` |

Los campos se muestran ocultos. El botón del ojo los muestra u oculta. El token Bearer crece en varias líneas si es largo, para que puedas revisarlo entero, y tiene un botón para vaciarlo.

Puedes usar variables en todos los campos, por ejemplo <span v-pre class="var">{{token}}</span>. Así, cuando el token cambie, lo actualizas en un solo lugar.

::: tip
Si escribes un header `Authorization` propio en <span class="ui">Headers</span>, ese es el que se envía y lo configurado en <span class="ui">Auth</span> se ignora.
:::

## Opciones

| Opción | Qué hace | Valor inicial |
|---|---|---|
| **Timeout del request** | Segundos que se espera la respuesta antes de abandonar, entre 1 y 600. Vacío significa «usar el de Preferencias». | Vacío (30 s por defecto en Preferencias) |
| **Seguir redirecciones** | Si el servidor responde con una redirección (3xx), Fast Client va a la nueva dirección, hasta 10 saltos. Si lo desactivas, ves la respuesta 3xx tal cual. | El valor de Preferencias (activado) |

Al seguir una redirección, Fast Client hace lo mismo que los navegadores: tras un `303`, o tras un `301`/`302` de un <span class="method post">POST</span>, repite la petición como <span class="method get">GET</span> y sin body.

## Enviar

Pulsa <span class="ui">Send</span> o <kbd>Ctrl</kbd>+<kbd>Enter</kbd>. Fast Client:

1. **Guarda el perfil**, sin hacerte esperar.
2. **Prepara el request:** sustituye las variables, arma la URL con los params activos, aplica la autenticación y agrega los headers automáticos.
3. **Lo envía** y muestra la respuesta.

Mientras espera, el botón <span class="ui">Send</span> se convierte en <span class="ui">Cancelar</span> y el panel de respuesta muestra el tiempo transcurrido. Para cancelar, pulsa el botón o <kbd>Esc</kbd>.

La respuesta se conserva mientras la app esté abierta, una por request: si cambias de pestaña y vuelves, sigue ahí. Al cerrar la app o abrir otro perfil, se pierde. Nunca se guarda en el archivo.

### Avisos

A veces el request se envía, pero Fast Client te advierte de algo en el panel de respuesta:

| Aviso | Qué significa |
|---|---|
| `Variables sin definir: token` | Usaste <span v-pre class="var missing">{{token}}</span> y la colección no tiene esa variable activa. Se envió el texto `{{token}}` tal cual. |
| `Se envía un body con GET; muchos servidores lo ignoran` | El request es GET o HEAD y tiene un body. |
| `TLS sin verificar` | Desactivaste la verificación de certificados SSL en Preferencias y la URL es `https`. |
| `La respuesta supera 100 MB y se recortó` | La respuesta era demasiado grande y no se recibió completa. |

### Si algo falla

Si el request no llega a recibir respuesta, el panel muestra un error y el botón <span class="ui">Reintentar</span>:

| Mensaje | Causa probable |
|---|---|
| Escribe una URL | La URL está vacía. |
| La URL no es válida: … | La URL tiene un formato que no se puede interpretar, a menudo por una variable sin definir dentro del dominio. |
| No se pudo resolver el nombre del servidor (DNS). | El dominio no existe, está mal escrito o no tienes conexión. |
| El servidor rechazó la conexión. | No hay nada escuchando en esa dirección y puerto. Revisa que el servidor esté levantado. |
| La conexión se cerró inesperadamente. | El servidor cortó la conexión a mitad de camino. |
| Se agotó el tiempo de espera del servidor. | El servidor no respondió dentro del timeout. Súbelo en <span class="ui">Opciones</span> si la operación es lenta. |
| El certificado del servidor no es válido… | Certificado vencido, autofirmado o de otro dominio. Si es tu servidor de desarrollo, desactiva <span class="ui">Verificar certificados SSL</span> en <span class="ui">Ajustes › Preferencias</span>. |
| Demasiadas redirecciones (máx. 10). | El servidor redirige en bucle. |
| Request cancelado. | Lo cancelaste tú. |

::: info Sin problemas de CORS
Los requests salen de la propia app, no de un navegador, así que las restricciones de CORS no se aplican. Si una API funciona en Fast Client pero no en tu web, el problema suele ser la configuración de CORS del servidor.
:::
