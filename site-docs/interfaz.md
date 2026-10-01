# La interfaz

Fast Client tiene una sola ventana con tres zonas: la barra de título arriba, la barra lateral a la izquierda y el área de trabajo, que ocupa el resto. No hay barra de estado: los mensajes aparecen como avisos en la esquina inferior derecha.

## Barra de título

De izquierda a derecha:

- **Los menús <span class="ui">Archivo</span> y <span class="ui">Ajustes</span>.** Archivo agrupa todo lo relacionado con el perfil: Nuevo, Abrir, Reubicar, etc. (ver [Archivos de perfil](./perfiles#el-menu-archivo)). Ajustes tiene el zoom, el tema y las Preferencias. Con un menú abierto, basta pasar el ratón sobre el otro para cambiar, y las flechas <kbd>←</kbd> <kbd>→</kbd> hacen lo mismo con el teclado.
- **El nombre del perfil**, centrado. Un punto a su lado indica que hay cambios sin guardar. El tooltip muestra la ruta completa del archivo, y un doble clic lo abre en el Explorador de Windows.
- **Los botones de ventana** de Windows: minimizar, maximizar y cerrar.

## Barra lateral

Contiene el buscador y el árbol de colecciones. Todo lo que puedes hacer en ella está en [Colecciones y requests](./colecciones).

- <kbd>Ctrl</kbd>+<kbd>B</kbd>, o el botón de abajo a la izquierda, la oculta y la vuelve a mostrar.
- Arrastra su borde derecho para cambiar el ancho, entre 200 y 480 píxeles. Un doble clic sobre el borde la devuelve al ancho original.

## Área de trabajo

### Pestañas

Cada pestaña es un request abierto, con el método en color y su nombre. Una pestaña con un punto en lugar de la ✕ tiene ediciones sin guardar.

| Acción | Cómo |
|---|---|
| Abrir un request | Clic sobre él en el árbol. Si ya estaba abierto, se activa su pestaña. |
| Nuevo request | Botón <span class="ui">+</span> o <kbd>Ctrl</kbd>+<kbd>T</kbd>. |
| Cerrar | La ✕, clic con la rueda del ratón o <kbd>Ctrl</kbd>+<kbd>W</kbd>. |
| Cambiar de pestaña | <kbd>Ctrl</kbd>+<kbd>Tab</kbd> y <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Tab</kbd>. <kbd>Ctrl</kbd>+<kbd>1</kbd> a <kbd>Ctrl</kbd>+<kbd>8</kbd> saltan a esa posición, y <kbd>Ctrl</kbd>+<kbd>9</kbd> a la última. |
| Reordenar | Arrastra la pestaña. |
| Renombrar el request | Doble clic sobre el nombre de la pestaña. |

Con clic derecho sobre una pestaña tienes: <span class="ui">Cerrar</span>, <span class="ui">Cerrar otras</span>, <span class="ui">Cerrar a la derecha</span>, <span class="ui">Cerrar todas</span>, <span class="ui">Renombrar</span>, <span class="ui">Duplicar</span> y <span class="ui">Mostrar en el árbol</span>, que despliega su colección y lo selecciona en la barra lateral.

Cerrar una pestaña no borra nada: el request sigue en su colección. Las pestañas abiertas se guardan en el perfil, así que al volver a abrir la app las encuentras igual.

### Editor y respuesta

Debajo de las pestañas, el editor del request queda a la izquierda y la [respuesta](./respuesta) a la derecha.

- **Divisor:** arrástralo para dar más espacio a uno u otro. Un doble clic lo devuelve al centro.
- **Orientación:** el botón de orientación, en la cabecera de la respuesta, alterna entre lado a lado y apilados (el editor arriba y la respuesta abajo). Viene bien en pantallas estrechas o con respuestas muy anchas.

El tamaño de la barra lateral, la posición del divisor y la orientación se guardan en el perfil.

## Avisos

Los avisos aparecen abajo a la derecha, hasta cuatro a la vez. Se quedan quietos mientras tienes el ratón encima.

| Tipo | Duración | Ejemplo |
|---|---|---|
| Éxito | 3 segundos | «Comando cURL copiado» |
| Información | 4 segundos | «Ese perfil ya está abierto» |
| Advertencia | 6 segundos | «Se guardó en …, pero no se pudo eliminar el original» |
| Error | Hasta que lo cierres | «No se pudo guardar el perfil» |

Algunos traen un botón de acción, como <span class="ui">Reintentar</span>, <span class="ui">Ir al archivo</span> o <span class="ui">Importar</span>.

## Tema y zoom

En el menú <span class="ui">Ajustes</span>:

- **Tema oscuro**, **Tema claro** o **Tema según el sistema**. El oscuro es el de fábrica. «Según el sistema» cambia solo cuando cambias el modo de color de Windows.
- **Zoom** entre 50 % y 200 %: <kbd>Ctrl</kbd>+<kbd>=</kbd> amplía, <kbd>Ctrl</kbd>+<kbd>-</kbd> reduce y <kbd>Ctrl</kbd>+<kbd>0</kbd> vuelve al 100 %. Al cambiarlo, el porcentaje aparece un momento bajo la barra de título.

Ambos son preferencias de la app, no del perfil: se mantienen aunque abras otro perfil. Ver [Preferencias](./preferencias).

## Teclado

Todo se puede hacer con el teclado. Los atajos principales aparecen en los tooltips y en los menús, y la lista completa está en [Atajos de teclado](./atajos).

En los menús y diálogos: las flechas mueven la selección, <kbd>Enter</kbd> confirma y <kbd>Esc</kbd> cierra o cancela. En un diálogo de confirmación, <kbd>Enter</kbd> nunca ejecuta la acción destructiva: para eliminar, hay que pulsar el botón <span class="ui">Eliminar</span>.
