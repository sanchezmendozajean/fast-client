# Variables

Las variables evitan repetir lo mismo en cada request. En lugar de escribir `https://api.tienda.dev` en veinte URLs, defines una variable `baseUrl` una vez y escribes <span v-pre class="var">{{baseUrl}}</span>. Cuando la dirección cambie, la actualizas en un solo lugar.

## Las variables son de cada colección

Cada colección tiene su propia lista de variables, y un request solo ve las de **su** colección. Así, dos colecciones pueden tener una variable `token` con valores distintos sin que se mezclen.

Fast Client no tiene variables globales ni entornos. Más abajo verás [cómo alternar entre desarrollo y producción](#alternar-entre-entornos) con lo que hay.

## Definir variables

1. En la barra lateral, haz clic derecho sobre la colección, o pasa el ratón sobre ella y pulsa el botón de más acciones.
2. Elige <span class="ui">Variables</span>. Se abre el diálogo «Variables de "&lt;nombre de la colección&gt;"».
3. Escribe el nombre de cada variable en la primera columna y su valor en la segunda. La tabla funciona igual que las de Params y Headers, incluida la [edición masiva](./peticiones#como-funcionan-las-tablas-clave-valor).
4. Pulsa <span class="ui">Guardar</span>.

| Nombre | Valor |
|---|---|
| `baseUrl` | `https://api.tienda.dev` |
| `token` | `eyJhbGciOiJIUzI1NiIs…` |
| `tenant` | `acme` |

Solo cuentan las filas **activas**, con la casilla marcada. Desmarcar una variable equivale a no tenerla definida.

::: info «Guardar» no escribe en el disco
El botón <span class="ui">Guardar</span> del diálogo aplica los cambios en la app, pero el archivo de perfil se actualiza en el siguiente momento de guardado: cuando envías un request, pulsas <kbd>Ctrl</kbd>+<kbd>S</kbd>, cierras la app, etc. Mientras tanto verás el punto de «cambios sin guardar» junto al nombre del perfil. Ver [Archivos de perfil](./perfiles#cuando-se-guarda).
:::

## Usar variables

Escribe el nombre entre llaves dobles: <span v-pre class="var">{{nombre}}</span>. Funciona en casi cualquier campo de texto del request:

| Dónde | Ejemplo |
|---|---|
| URL | `{{baseUrl}}/orders/{{orderId}}` |
| Params (clave y valor) | `page` = `{{page}}` |
| Headers (nombre y valor) | `X-Tenant` = `{{tenant}}` |
| Body JSON, Text o XML | `{ "tenant": "{{tenant}}", "limit": {{limit}} }` |
| Form URL-encoded | `client_id` = `{{clientId}}` |
| Multipart, filas de texto | `descripcion` = `{{descripcion}}` |
| Auth Bearer | Token: `{{token}}` |
| Auth Basic | Usuario `{{user}}`, contraseña `{{password}}` |

La única excepción son las filas de tipo <span class="ui">Archivo</span> en Multipart: la ruta del archivo se usa tal cual.

Se permiten espacios dentro de las llaves: `{{ token }}` es lo mismo que `{{token}}`. El nombre en sí no puede contener espacios ni llaves, y distingue mayúsculas de minúsculas: `Token` y `token` son variables distintas.

::: tip Variables sin comillas en JSON
En el ejemplo de arriba, `{{limit}}` va sin comillas para que se envíe como número. El editor lo acepta: al comprobar si el JSON es válido, Fast Client trata cada variable como un valor, así que no verás el aviso <span class="ui">JSON no válido</span> por eso.
:::

## Ver qué valor tiene cada variable

En la barra de URL, las variables se colorean mientras escribes:

- <span v-pre class="var">{{baseUrl}}</span> en verde: existe en la colección y está activa.
- <span v-pre class="var missing">{{baseUrl}}</span> en rojo: la colección no tiene esa variable, o está desactivada.

Al pasar el ratón por la URL, un tooltip lista las variables que usa con sus valores e indica las que no están definidas. Es la forma más rápida de comprobar a qué servidor vas a enviar antes de pulsar <span class="ui">Send</span>.

## Qué pasa al enviar

Justo antes de enviar, Fast Client reemplaza cada <span v-pre class="var">{{nombre}}</span> por su valor. El request guardado no cambia: la sustitución solo afecta a lo que sale hacia el servidor.

- **Variable sin definir.** El request se envía igual, con el texto `{{nombre}}` tal cual, y la respuesta muestra el aviso «Variables sin definir: nombre». Si la variable estaba en el dominio, normalmente verás el error «La URL no es válida».
- **Sin sustitución en cadena.** Si el valor de una variable contiene a su vez <span v-pre class="var">{{otra}}</span>, esa segunda no se reemplaza. Una variable no puede construirse a partir de otras.
- **Nombres repetidos.** Si dos filas activas tienen el mismo nombre, gana la que está más arriba.
- **Copiar como cURL** genera el comando con las variables ya sustituidas, listo para pegar en una terminal.

## Mover requests entre colecciones

Si arrastras un request a otra colección, o usas <span class="ui">Mover a…</span>, a partir de ese momento usa las variables de la colección nueva. Si allí falta alguna, la verás en rojo en la URL.

## Alternar entre entornos

Como gana la primera fila activa, puedes tener varios valores para la misma variable y elegir cuál usar marcando una sola casilla:

| ☐/☑ | Nombre | Valor |
|---|---|---|
| ☑ | `baseUrl` | `http://localhost:3000` |
| ☐ | `baseUrl` | `https://staging.tienda.dev` |
| ☐ | `baseUrl` | `https://api.tienda.dev` |

Para pasar a staging, desmarca la primera fila y marca la segunda.

Otra opción es tener dos colecciones con los mismos requests y distintas variables, por ejemplo «API Tienda (dev)» y «API Tienda (prod)». Duplicar la colección desde su menú contextual lo hace en un paso.

## Seguridad

Los valores de las variables se guardan **en texto plano** dentro del archivo de perfil, igual que los tokens y contraseñas de <span class="ui">Auth</span>. Tenlo en cuenta antes de compartir el perfil o subirlo a un repositorio. Ver [Compartir y versionar](./perfiles#compartir-y-versionar-un-perfil).
