# La respuesta

Cuando envías un request, el panel de la derecha muestra lo que devolvió el servidor. Antes del primer envío, dice <span class="ui">Pulsa Send para ver la respuesta</span>.

## La cabecera

<div class="language-text"><pre><code>● 201 Created   248 ms · 1.4 KB</code></pre></div>

- **El código de estado**, con un color según su familia:

  | Código | Significado | Color |
  |---|---|---|
  | 1xx | Informativo | Azul claro |
  | 2xx | Éxito | Verde |
  | 3xx | Redirección | Azul |
  | 4xx | Error del cliente: algo falta o está mal en tu request | Ámbar |
  | 5xx | Error del servidor | Rojo |

- **El tiempo total**, en milisegundos o segundos. El tooltip muestra el *TTFB* (*time to first byte*): cuánto tardó en llegar el primer byte. Si el TTFB es casi todo el tiempo total, el servidor tardó en procesar; si es pequeño, se fue en descargar la respuesta.
- **El tamaño** de la respuesta. El tooltip lo separa en headers y body.

A la derecha están los botones de acción, que se explican [más abajo](#acciones).

## Body

La pestaña <span class="ui">Body</span> muestra el contenido de la respuesta según su tipo:

| Tipo | Cómo se muestra |
|---|---|
| **JSON** | Indentado y con colores, con plegado de bloques. |
| **XML y HTML** | Con colores. El XML también se indenta. |
| **Texto** | Tal cual. |
| **Imagen** (`image/png`, `image/jpeg`…) | La imagen. |
| **Binario** (PDF, ZIP…) | Un mensaje y el botón <span class="ui">Guardar a archivo</span>. |
| **Vacío** | <span class="ui">Respuesta sin body</span>. Es normal en un `204 No Content` o en un <span class="method">HEAD</span>. |

El tipo se deduce del header `Content-Type`. Si el servidor no lo envía, Fast Client mira el contenido: si empieza por `{` o `[` y es JSON válido, lo trata como JSON. El texto se decodifica con el *charset* que indique el servidor, o UTF-8 si no indica ninguno.

### Formateado y Crudo

En respuestas JSON y XML aparece el selector <span class="ui">Formateado</span> / <span class="ui">Crudo</span>. Formateado indenta el contenido para leerlo cómodamente; Crudo lo muestra exactamente como llegó, que es lo que necesitas para comprobar espacios, el orden real de los campos o un JSON compactado.

### Respuestas grandes

Si el body supera el **tamaño máximo a mostrar** (5 MB por defecto), Fast Client no lo dibuja, para que la app no se vuelva lenta, y te ofrece <span class="ui">Guardar a archivo</span>. Puedes subir ese límite hasta 100 MB en [Preferencias](./preferencias).

Más allá de 100 MB, la respuesta se recorta y verás el aviso «La respuesta supera 100 MB y se recortó».

## Headers

La pestaña <span class="ui">Headers</span> lista los headers de la respuesta, en el orden en que llegaron. El número junto al nombre indica cuántos son. Si un header viene repetido, como varios `Set-Cookie`, aparece una vez por cada valor.

## Acciones

| Botón | Qué hace |
|---|---|
| **Buscar** (<kbd>Ctrl</kbd>+<kbd>F</kbd>) | Busca texto dentro del body. |
| **Ajuste de línea** | Parte las líneas largas para que no haga falta desplazarse a los lados. Viene activado; si lo apagas, se mantiene así hasta cerrar la app. |
| **Copiar body** | Copia el body al portapapeles, tal como lo estás viendo (Formateado o Crudo). No está disponible para imágenes ni binarios. |
| **Guardar a archivo** | Guarda el body tal como llegó, byte a byte. Sugiere como nombre el del request con la extensión que corresponde al tipo (`.json`, `.png`…). Sirve para cualquier tipo, también imágenes y binarios. |
| **Orientación** | Alterna entre editor y respuesta lado a lado o apilados. |

## Mientras se envía

El panel muestra <span class="ui">Enviando…</span>, una barra de progreso y el tiempo transcurrido. Puedes cancelar con el botón <span class="ui">Cancelar</span> o con <kbd>Esc</kbd>.

Puedes cambiar de pestaña mientras tanto: cada request lleva su propia respuesta, y la encontrarás al volver.

## Cuando hay un error

Si el request no recibe respuesta (el servidor no existe, rechaza la conexión, tarda demasiado…), el panel muestra <span class="ui">No se pudo completar el request</span>, el motivo y el botón <span class="ui">Reintentar</span>. La lista de mensajes y sus causas está en [Hacer una petición](./peticiones#si-algo-falla).

Un `404` o un `500` **no** son errores de este tipo: el servidor sí respondió, solo que con un código de error. Los verás como cualquier otra respuesta, con su body, que a menudo explica qué falló.

## Avisos

Si algo merece tu atención, verás una franja de aviso sobre el body; por ejemplo, «Variables sin definir: token» o «TLS sin verificar». Qué significa cada uno está en [Avisos](./peticiones#avisos).

## Las respuestas no se guardan

Cada respuesta se guarda en memoria, una por request, mientras la app está abierta. Al cerrar Fast Client o abrir otro perfil, se descartan. Nunca se escriben en el archivo de perfil, así que tu perfil no acumula datos de producción ni tokens de sesión que haya devuelto el servidor.

Si necesitas conservar una respuesta, usa <span class="ui">Guardar a archivo</span>.
