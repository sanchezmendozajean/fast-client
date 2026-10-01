# Preferencias y actualizaciones

Las preferencias se abren en <span class="ui">Ajustes › Preferencias…</span> o con <kbd>Ctrl</kbd>+<kbd>,</kbd>.

Son ajustes **de la app**, no del perfil: se guardan en tu configuración de Windows (`%APPDATA%\Fast Client\fastclient.settings.json`) y se mantienen aunque cambies de perfil. Si compartes un perfil, no compartes tus preferencias.

## Cómo se aplican

- **Tema y zoom** se aplican en cuanto los tocas, para que veas el resultado.
- **El resto** se aplica al pulsar <span class="ui">Guardar</span> y afecta a los siguientes requests, sin reiniciar.
- <span class="ui">Cancelar</span>, <kbd>Esc</kbd> o la ✕ descartan todos los cambios, incluidos el tema y el zoom que estabas probando.
- Si un valor no es válido, el campo se marca en rojo y <span class="ui">Guardar</span> se desactiva hasta corregirlo.

<span class="ui">Restablecer valores por defecto</span>, abajo a la izquierda, vuelve todo a los valores de fábrica, previa confirmación. Tus perfiles no se ven afectados.

## Red

| Opción | Qué hace | Por defecto |
|---|---|---|
| **Timeout por defecto** | Segundos que se espera una respuesta, entre 1 y 600. Se usa en los requests que no tienen un timeout propio en <span class="ui">Opciones</span>. | 30 s |
| **Verificar certificados SSL** | Rechaza conexiones `https` a servidores con un certificado no válido: vencido, autofirmado o de otro dominio. | Activado |
| **Seguir redirecciones en requests nuevos** | El valor inicial de <span class="ui">Seguir redirecciones</span> en los requests que crees a partir de ahora. Cada request puede cambiarlo, y los que ya existen no cambian. | Activado |
| **Tamaño máximo de respuesta a mostrar** | Por encima de este tamaño, entre 1 y 100 MB, el body no se muestra y se ofrece guardarlo a archivo. Ver [Respuestas grandes](./respuesta#respuestas-grandes). | 5 MB |

::: danger Verificar certificados SSL
Desactívalo solo para servidores de desarrollo con certificados autofirmados, y vuelve a activarlo al terminar. Sin verificación, Fast Client no puede saber si está hablando con el servidor real. Mientras esté desactivada, cada respuesta `https` muestra el aviso «TLS sin verificar».
:::

## Interfaz

| Opción | Valores | Por defecto |
|---|---|---|
| **Tema** | Oscuro, Claro o Sistema (sigue el modo de color de Windows). | Oscuro |
| **Zoom** | De 50 % a 200 %. El botón <span class="ui">100 %</span> lo restablece. | 100 % |

Son los mismos ajustes que el menú <span class="ui">Ajustes</span> y los atajos <kbd>Ctrl</kbd>+<kbd>=</kbd>, <kbd>Ctrl</kbd>+<kbd>-</kbd> y <kbd>Ctrl</kbd>+<kbd>0</kbd>.

## Perfiles

Muestra la ruta completa del perfil abierto. El botón <span class="ui">Abrir carpeta</span> lo muestra en el Explorador de Windows, igual que <span class="ui">Archivo › Ir al archivo</span>. Ver [Archivos de perfil](./perfiles).

## Actualizaciones

| Opción | Qué hace | Por defecto |
|---|---|---|
| **Buscar actualizaciones al iniciar** | Busca una versión nueva cada vez que abres la app. | Activado |
| **Versión instalada** | La versión que estás usando, con el botón <span class="ui">Buscar ahora</span>. | — |

### Cómo funcionan

1. Unos segundos después de abrir la app, Fast Client consulta en GitHub si hay una versión nueva.
2. Si la hay, la descarga en segundo plano, sin interrumpirte.
3. Cuando termina, verás el aviso «Fast Client &lt;versión&gt; está listo. Se instalará al cerrar.».
4. La nueva versión se instala la próxima vez que cierres la app. Si no quieres esperar, pulsa <span class="ui">Reiniciar ahora</span> en el aviso: la app guarda tu perfil, se cierra, se actualiza y vuelve a abrirse.

Si no hay novedades o no hay conexión, la búsqueda automática no muestra nada.

<span class="ui">Buscar ahora</span> siempre te informa del resultado: «Ya tienes la última versión», «Descargando Fast Client &lt;versión&gt;…» o «No se pudo buscar actualizaciones. Revisa tu conexión.».

::: info Privacidad
La búsqueda de actualizaciones es la única conexión que Fast Client hace por su cuenta, y solo consulta la lista de versiones publicadas en GitHub. Si la desactivas, la app solo se conecta a internet cuando pulsas <span class="ui">Send</span>. Puedes seguir actualizando a mano descargando el instalador desde la [página de versiones](https://github.com/sanchezmendozajean/fast-client/releases).
:::
