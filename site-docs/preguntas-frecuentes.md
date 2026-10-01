---
outline: 2
---

# Preguntas frecuentes

## Sobre la app

### ¿Es gratis? ¿Necesito una cuenta?

Es gratis y de código abierto, con licencia MIT. No hay cuentas, registro ni versión de pago.

### ¿Funciona en macOS o Linux?

Por ahora solo en Windows 10 y 11 de 64 bits.

### ¿Envía mis datos a algún sitio?

No. La app solo se conecta a internet cuando pulsas <span class="ui">Send</span> (al servidor de tu request) y para buscar actualizaciones en GitHub, algo que puedes desactivar en [Preferencias](./preferencias#actualizaciones). Tus colecciones, tokens y respuestas no salen de tu equipo.

### ¿Puedo importar mis colecciones de Postman, Insomnia o Bruno?

No hay un importador de colecciones. Lo que sí puedes hacer es importar requests uno a uno como cURL: en Postman, abre el request, pulsa el ícono de código (**Code snippet**), elige **cURL**, cópialo y pégalo en la URL de Fast Client. Ver [Importar un comando cURL](./curl#importar-un-comando-curl).

### ¿Hay entornos o variables globales?

No. Las variables son de cada colección. Para alternar entre desarrollo y producción hay un truco con filas activas e inactivas que se explica en [Alternar entre entornos](./variables#alternar-entre-entornos).

### ¿Maneja cookies automáticamente?

No. Fast Client no guarda las cookies que devuelve el servidor ni las reenvía solo. Si una API necesita una cookie, cópiala del header `Set-Cookie` de la respuesta y agrégala como header `Cookie` en tus requests, idealmente con una variable: `Cookie` = `sesion={{sesion}}`.

## Instalación

### Windows dice «Windows protegió su PC» al instalar

El instalador aún no está firmado digitalmente. Pulsa <span class="ui">Más información</span> y luego <span class="ui">Ejecutar de todos modos</span>. Ver [Instalación](./#instalacion).

### ¿Cómo desinstalo Fast Client?

Desde **Configuración › Aplicaciones** de Windows, como cualquier otro programa. Desinstalar no borra tus perfiles (en `Documentos\Fast Client`) ni tu configuración (en `%APPDATA%\Fast Client`). Si quieres eliminarlos, borra esas carpetas a mano.

### ¿Cómo actualizo?

Si la búsqueda de actualizaciones está activada, es automático: Fast Client descarga la nueva versión y la instala al cerrarse. También puedes ir a <span class="ui">Ajustes › Preferencias › Buscar ahora</span>, o descargar el instalador nuevo e instalarlo encima: tus datos se conservan. Ver [Actualizaciones](./preferencias#actualizaciones).

## Tu trabajo

### ¿Dónde se guardan mis colecciones?

En el archivo de perfil abierto, por defecto `Documentos\Fast Client\perfil.fcprofile`. Haz doble clic en el nombre del perfil, en la barra de título, para ver dónde está. Ver [Archivos de perfil](./perfiles).

### ¿Tengo que guardar a mano?

Normalmente no. Fast Client guarda al enviar, al crear, renombrar o eliminar, al cerrar la app y en otros momentos clave. Si ves un punto junto al nombre del perfil, hay cambios pendientes: <kbd>Ctrl</kbd>+<kbd>S</kbd> los guarda en el acto. Ver [Cuándo se guarda](./perfiles#cuando-se-guarda).

### ¿Cómo paso mi trabajo a otro equipo?

Copia el archivo `.fcprofile` al otro equipo y ábrelo con <span class="ui">Archivo › Abrir…</span> o con doble clic. Las preferencias (tema, timeout…) no van en el perfil, así que tendrás que ajustarlas allí. Los archivos adjuntos de Multipart tampoco: vuelve a elegirlos.

### ¿Puedo trabajar en equipo con el mismo perfil?

Sí, guardándolo en un repositorio Git que compartan. Antes, quita los tokens y contraseñas reales. Ver [Compartir y versionar un perfil](./perfiles#compartir-y-versionar-un-perfil).

### Eliminé un request por error. ¿Puedo recuperarlo?

Fast Client no tiene papelera ni «deshacer» para lo eliminado. Si tienes el perfil en Git o una copia de seguridad, puedes recuperarlo desde ahí. Si usaste <span class="ui">Archivo › Nuevo › Crear nuevo de todas formas</span>, el perfil anterior está en `perfil.fcprofile.bak`.

### Al abrir la app dice que no encontró mi perfil

El archivo se movió, se renombró o está en una unidad que ya no está conectada. Fast Client inicia un perfil nuevo para que puedas trabajar, sin tocar nada. Busca tu archivo y ábrelo con <span class="ui">Archivo › Abrir…</span>; si estaba en un USB, conéctalo y usa <span class="ui">Archivo › Abrir reciente</span>.

## Requests

### Me sale «El certificado del servidor no es válido»

El servidor usa un certificado que no se puede verificar: vencido, autofirmado o emitido para otro dominio. Si es **tu servidor de desarrollo**, desactiva <span class="ui">Verificar certificados SSL</span> en <span class="ui">Ajustes › Preferencias</span> y vuelve a activarlo al terminar. Si es un servidor de producción, el problema es del servidor: avisa a quien lo administre.

### Me sale «El servidor rechazó la conexión» con localhost

Fast Client llegó a tu equipo, pero no hay nada escuchando en ese puerto. Comprueba que tu servidor está levantado y que el puerto de la URL es el correcto.

Si el servidor está levantado y aun así falla, prueba a cambiar `localhost` por `127.0.0.1`. Algunos servidores solo escuchan en IPv4, y `localhost` puede resolverse a la dirección IPv6 `::1`.

### Funciona en el navegador pero no en Fast Client (o al revés)

Revisa las diferencias habituales:

- **Cookies y sesión:** el navegador envía tus cookies solo; Fast Client no. Ver [¿Maneja cookies automáticamente?](#maneja-cookies-automaticamente).
- **Headers:** compara los headers que envía cada uno. La forma más fácil es copiar la petición del navegador como cURL e [importarla](./curl#importar-un-comando-curl).
- **CORS:** si funciona en Fast Client pero no en tu web, el problema suele ser la configuración de CORS del servidor. Fast Client no está sujeto a CORS porque no es un navegador.

### ¿Fast Client usa el proxy de mi empresa?

No. Fast Client se conecta directamente y no usa el proxy configurado en Windows. Si tu red solo permite salir a internet a través de un proxy, los requests a servidores externos fallarán, aunque los de tu red interna funcionen.

### Mi request se queda esperando mucho tiempo

Fast Client espera hasta el timeout: 30 segundos por defecto. Puedes cancelar con <kbd>Esc</kbd>. Si la operación es lenta de verdad, súbelo para ese request en <span class="ui">Opciones</span> o para todos en [Preferencias](./preferencias#red).

### Veo «Variables sin definir» en la respuesta

El request usa una variable que su colección no tiene, o que está desactivada. Las variables sin definir se ven en rojo en la URL. Ver [Variables](./variables#que-pasa-al-enviar).

### La respuesta dice que es demasiado grande para mostrarse

Supera el tamaño máximo a mostrar, que por defecto es 5 MB. Guárdala con <span class="ui">Guardar a archivo</span>, o sube el límite (hasta 100 MB) en [Preferencias](./preferencias#red).

## ¿Otra duda?

Si encontraste un error o quieres proponer una mejora, abre un *issue* en [GitHub](https://github.com/sanchezmendozajean/fast-client/issues). Incluye la versión de Fast Client (la ves en <span class="ui">Preferencias › Actualizaciones</span>) y los pasos para reproducirlo.
