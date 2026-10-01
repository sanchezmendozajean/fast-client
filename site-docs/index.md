# Introducción

Fast Client es un cliente HTTP de escritorio para Windows. Sirve para probar APIs: escribes un request, pulsas <span class="ui">Send</span> y ves la respuesta. No pide cuenta, no sube nada a la nube y guarda todo tu trabajo en un solo archivo que controlas tú.

Esta guía explica cómo usarlo. Si es tu primera vez, lee esta página y luego [Hacer una petición](./peticiones). El resto puedes consultarlo cuando lo necesites.

## Qué lo hace distinto

- **Abre directo al trabajo.** No hay pantalla de bienvenida ni inicio de sesión. Al abrir, ves tus pestañas tal como las dejaste.
- **Todo en un archivo.** Colecciones, requests, headers y variables se guardan en un archivo `.fcprofile`. Puedes copiarlo, versionarlo en Git o enviárselo a un compañero. Lo explicamos en [Archivos de perfil](./perfiles).
- **Sin red en la interfaz.** La app solo se conecta a internet en dos casos: cuando pulsas <span class="ui">Send</span> y cuando busca actualizaciones (eso último se puede desactivar).
- **Nunca guarda respuestas.** Lo que devuelve el servidor vive en memoria mientras la app está abierta. Así tu perfil no acumula datos sensibles de las respuestas.

## Instalación

1. Descarga el instalador desde la [página de la última versión](https://github.com/sanchezmendozajean/fast-client/releases/latest). Es el archivo `Fast-Client-Setup-<versión>.exe`.
2. Ejecútalo. Puedes elegir la carpeta de instalación y si quieres un acceso directo en el escritorio.
3. Al terminar, abre Fast Client desde el menú Inicio o el acceso directo.

Funciona en Windows 10 y Windows 11 de 64 bits.

::: warning «Windows protegió su PC»
El instalador todavía no está firmado digitalmente, así que Windows SmartScreen puede mostrar ese aviso la primera vez. Pulsa <span class="ui">Más información</span> y luego <span class="ui">Ejecutar de todos modos</span>.
:::

El instalador también asocia la extensión `.fcprofile` con la app: al hacer doble clic en un perfil desde el Explorador de Windows, se abre en Fast Client.

## El primer arranque

La primera vez que abres la app, Fast Client crea un perfil vacío en:

```
C:\Users\<tu usuario>\Documents\Fast Client\perfil.fcprofile
```

Verás la barra lateral con el mensaje <span class="ui">Aún no hay colecciones</span> y un botón para crear la primera. Desde ese momento, todo lo que hagas se guarda en ese archivo.

## Tu primer request en un minuto

1. Pulsa <kbd>Ctrl</kbd>+<kbd>T</kbd>. Se crea un request <span class="method get">GET</span> llamado «Nuevo request» en una pestaña nueva. Si todavía no tenías colecciones, se crea una llamada «Mi colección» para guardarlo.
2. Escribe una URL, por ejemplo `https://httpbin.org/get`.
3. Pulsa <kbd>Ctrl</kbd>+<kbd>Enter</kbd> o el botón <span class="ui">Send</span>.

La respuesta aparece a la derecha, con el código de estado, el tiempo que tardó y el tamaño.

::: tip
<kbd>Ctrl</kbd>+<kbd>Enter</kbd> envía el request desde cualquier parte del editor, también mientras escribes en el body o en los headers.
:::

## Conceptos básicos

| Concepto | Qué es |
|---|---|
| **Perfil** | El archivo `.fcprofile` donde se guarda todo tu trabajo. Tienes un perfil abierto a la vez; su nombre aparece en el centro de la barra de título. |
| **Colección** | Una carpeta de requests en la barra lateral, por ejemplo «API Tienda». Cada colección tiene sus propias variables. |
| **Request** | Una petición guardada: método, URL, parámetros, headers, body y autenticación. Siempre pertenece a una colección. |
| **Pestaña** | Un request abierto en el área de trabajo. Al cerrar una pestaña, el request sigue en su colección. |
| **Variable** | Un valor con nombre, como `baseUrl` o `token`, que defines en la colección y usas en los requests escribiendo <span v-pre class="var">{{nombre}}</span>. |

## La pantalla

- **Barra de título:** los menús <span class="ui">Archivo</span> y <span class="ui">Ajustes</span> a la izquierda y el nombre del perfil en el centro. Un punto junto al nombre indica que hay cambios sin guardar.
- **Barra lateral:** el buscador (<kbd>Ctrl</kbd>+<kbd>K</kbd>) y el árbol de colecciones y requests. Se oculta y se muestra con <kbd>Ctrl</kbd>+<kbd>B</kbd>.
- **Área de trabajo:** las pestañas arriba y, debajo, el editor del request a la izquierda y la respuesta a la derecha. El divisor entre ambos se puede arrastrar, y el botón de orientación de la respuesta los apila uno sobre otro.

El detalle de cada zona está en [La interfaz](./interfaz).

## Por dónde seguir

- [Hacer una petición](./peticiones): todo lo que puedes configurar en un request y qué pasa al enviarlo.
- [Variables](./variables): cómo dejar de repetir la URL base y los tokens en cada request.
- [Archivos de perfil](./perfiles): dónde se guarda tu trabajo, cuándo se guarda y cómo moverlo o compartirlo.
- [Preguntas frecuentes](./preguntas-frecuentes): respuestas rápidas a las dudas más comunes.

¿Prefieres el teclado? Todos los atajos están en [Atajos de teclado](./atajos).
