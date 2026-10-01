# cURL

[cURL](https://curl.se/) es la herramienta de línea de comandos más usada para hacer requests HTTP, y casi todas las APIs documentan sus ejemplos con ella. Fast Client la entiende en los dos sentidos: puedes importar un comando `curl` como request y copiar cualquier request como comando `curl`.

## Importar un comando cURL

1. Copia el comando, por ejemplo de la documentación de una API o de las herramientas de desarrollo del navegador.
2. Pégalo en la barra de URL de un request.
3. Fast Client detecta que es un comando cURL y, en lugar de pegarlo, muestra el aviso <span class="ui">Parece un comando cURL. ¿Importarlo en este request?</span>. Pulsa <span class="ui">Importar</span>.

El request de la pestaña activa se rellena con el método, la URL, los params, los headers, el body y la autenticación del comando. Su nombre y su colección no cambian.

::: warning Reemplaza el contenido del request
Importar sobrescribe el método, la URL, los headers, el body y la autenticación del request actual. Si no quieres perder lo que tenías, crea antes un request vacío con <kbd>Ctrl</kbd>+<kbd>T</kbd>.
:::

::: tip Copiar un request desde el navegador
En las herramientas de desarrollo de Chrome o Edge (<kbd>F12</kbd>), pestaña **Red**, haz clic derecho sobre una petición y elige **Copiar › Copiar como cURL (bash)**. Pégalo en Fast Client y tendrás la misma petición, con sus headers y cookies.
:::

### Qué se reconoce

| Opción de curl | Resultado en Fast Client |
|---|---|
| La URL, o `--url` | URL y tabla de Params. |
| `-X`, `--request` | Método. |
| `-H`, `--header` | Headers. Un `Authorization: Bearer …` pasa a <span class="ui">Auth › Bearer</span>. |
| `-d`, `--data`, `--data-raw`, `--data-binary`, `--data-ascii` | Body. El tipo se deduce del `Content-Type` o del contenido: JSON, XML, Form URL-encoded o texto. |
| `--data-urlencode` | Body Form URL-encoded. |
| `-F`, `--form` | Body Multipart. `campo=@ruta` se importa como una fila de archivo. |
| `-u`, `--user` | <span class="ui">Auth › Basic</span>, con usuario y contraseña. |
| `-G`, `--get` | Los datos de `-d` pasan a la query string y el método queda en GET. |
| `-I`, `--head` | Método HEAD. |
| `-L`, `--location` | Activa <span class="ui">Seguir redirecciones</span> en las opciones del request. |
| `-A`, `--user-agent` | Header `User-Agent`. |
| `-b`, `--cookie` | Header `Cookie`. |
| `-k`, `--insecure` | No cambia nada por sí solo, pero te avisa de que el comando desactivaba la verificación SSL. Si la necesitas, desactívala en [Preferencias](./preferencias). |

Si el comando no indica método, se usa POST cuando hay body y GET cuando no.

Las demás opciones (`-o`, `--max-time`, `--proxy`, `-v`…) se ignoran sin dar error.

Se aceptan comandos en varias líneas, tanto con `\` al final de cada línea (bash) como con `^` (CMD de Windows), y comillas simples o dobles.

```bash
curl -X POST 'https://api.tienda.dev/orders' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  --data-raw '{"clienteId": 42, "items": [{"sku": "A-1", "cantidad": 2}]}'
```

Este ejemplo se importa como un <span class="method post">POST</span> con body JSON y autenticación Bearer.

## Copiar como cURL

Haz clic derecho sobre un request en la barra lateral y elige <span class="ui">Copiar como cURL</span>. El comando queda en el portapapeles.

El comando copiado es exactamente lo que Fast Client enviaría:

- Las **variables ya están sustituidas** por sus valores.
- Incluye los **headers automáticos** `Content-Type` y `Authorization`. El `User-Agent` de Fast Client se omite, para que curl use el suyo.
- Incluye `-L` si el request sigue redirecciones.

Por eso es útil para pasarle una petición a alguien que no usa Fast Client o para reproducir un problema en una terminal.

::: warning Contiene tus credenciales
Como las variables y la autenticación ya están resueltas, el comando incluye tokens y contraseñas reales. Revísalo antes de pegarlo en un chat o en un ticket.
:::

::: info Formato bash
El comando va en una sola línea y usa comillas simples al estilo bash. Funciona tal cual en Git Bash, WSL, macOS y Linux. En PowerShell o CMD de Windows las comillas se interpretan distinto y puede necesitar ajustes, sobre todo si el body es JSON; en PowerShell, además, usa `curl.exe` en lugar de `curl`.
:::
