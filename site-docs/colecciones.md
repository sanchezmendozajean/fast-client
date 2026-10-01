# Colecciones y requests

La barra lateral organiza tu trabajo en dos niveles: **colecciones**, que son como carpetas, y dentro de ellas, **requests**. No hay subcarpetas: si necesitas separar más, crea otra colección.

Una forma habitual de organizarlo es tener una colección por API o por servicio («API Tienda», «Autenticación», «Pagos») con sus propias [variables](./variables).

## Crear una colección

Pulsa el botón de nueva colección, junto al buscador. Aparece «Nueva colección» con el nombre listo para editar: escribe el que quieras y pulsa <kbd>Enter</kbd>.

Si el perfil está vacío, el botón <span class="ui">Crear tu primera colección</span> del centro de la barra lateral hace lo mismo.

Cada colección muestra cuántos requests tiene. Al pasar el ratón, ese número se cambia por dos botones: <span class="ui">+</span> (nuevo request) y <span class="ui">Más acciones</span>.

## Crear un request

- Pulsa <span class="ui">+</span> en la colección, o haz clic derecho sobre ella y elige <span class="ui">Nuevo request</span>.
- O pulsa <kbd>Ctrl</kbd>+<kbd>T</kbd>: se crea en la colección de la pestaña activa.

El request nuevo es un <span class="method get">GET</span> llamado «Nuevo request» y se abre en una pestaña. Los detalles están en [Hacer una petición](./peticiones#crear-un-request).

## Menús contextuales

Haz clic derecho sobre un elemento del árbol, usa el botón <span class="ui">Más acciones</span> o pulsa la tecla de menú contextual del teclado.

**Sobre una colección:**

| Opción | Qué hace |
|---|---|
| Nuevo request | Crea un request vacío dentro de la colección. |
| Renombrar | Edita el nombre en el propio árbol (<kbd>F2</kbd>). |
| Duplicar | Crea «&lt;nombre&gt; (copia)» con todos sus requests y variables. |
| Variables | Abre la lista de [variables](./variables) de la colección. |
| Eliminar | Borra la colección y todos sus requests, previa confirmación (<kbd>Supr</kbd>). |

**Sobre un request:**

| Opción | Qué hace |
|---|---|
| Abrir | Lo abre en una pestaña, igual que un clic. |
| Renombrar | Edita el nombre en el propio árbol (<kbd>F2</kbd>). |
| Duplicar | Crea «&lt;nombre&gt; (copia)» en la misma colección. |
| Copiar como cURL | Copia el request como un comando `curl`. Ver [cURL](./curl). |
| Mover a… | Lo pasa a otra colección, que eliges en un submenú. |
| Eliminar | Lo borra, previa confirmación (<kbd>Supr</kbd>). |

## Renombrar

Doble clic sobre el nombre, <kbd>F2</kbd> con el elemento seleccionado o <span class="ui">Renombrar</span> en el menú. <kbd>Enter</kbd> o hacer clic fuera confirma; <kbd>Esc</kbd> cancela. Si dejas el nombre vacío, vuelve el anterior.

Los nombres pueden repetirse: dos requests pueden llamarse igual sin problema.

## Reordenar y mover

Arrastra para cambiar el orden:

- **Un request** dentro de su colección, para reordenarlo.
- **Un request** hasta otra colección, para moverlo ahí. Si sueltas sobre el nombre de una colección desplegada, queda el primero; si está plegada, el último.
- **Una colección**, para reordenarla entre las demás.

<span class="ui">Mover a…</span>, en el menú del request, hace lo mismo sin arrastrar y lo deja al final de la colección elegida.

Al cambiar de colección, el request pasa a usar las variables de su nueva colección.

::: info
Reordenar y mover no guardan el perfil en ese momento. El cambio se guarda en el siguiente momento de guardado; por ejemplo, al enviar un request o con <kbd>Ctrl</kbd>+<kbd>S</kbd>. Ver [Cuándo se guarda](./perfiles#cuando-se-guarda).
:::

## Buscar

Escribe en el buscador de la barra lateral, o pulsa <kbd>Ctrl</kbd>+<kbd>K</kbd> para ir a él desde cualquier parte (si la barra estaba oculta, se muestra).

El árbol se filtra mientras escribes y resalta las coincidencias:

- Un request aparece si su **nombre o su URL** contienen el texto. Buscar `/orders` encuentra todos los requests que llaman a ese endpoint, se llamen como se llamen.
- Si coincide el **nombre de una colección**, se muestran todos sus requests.

Mientras hay una búsqueda activa no se puede arrastrar. Borra el texto para volver al árbol completo.

## Eliminar

<span class="ui">Eliminar</span> en el menú, o <kbd>Supr</kbd> con el elemento seleccionado. Siempre se pide confirmación; al eliminar una colección, el diálogo dice cuántos requests se borrarán. Las pestañas de lo eliminado se cierran y el perfil se guarda.

::: warning No se puede deshacer
Fast Client no tiene papelera ni «deshacer» para lo eliminado. Si fue un error, la única forma de recuperarlo es una copia anterior del perfil; por ejemplo, desde Git si lo tienes versionado.
:::

## Moverse con el teclado

Con el foco en el árbol:

| Tecla | Acción |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> | Elemento anterior o siguiente. |
| <kbd>Inicio</kbd> <kbd>Fin</kbd> | Primer o último elemento. |
| <kbd>→</kbd> | Despliega la colección o, si ya lo está, baja a su primer request. |
| <kbd>←</kbd> | Pliega la colección o, desde un request, sube a su colección. |
| <kbd>Enter</kbd> | Despliega o pliega la colección, o abre el request. |
| <kbd>F2</kbd> | Renombrar. |
| <kbd>Supr</kbd> | Eliminar, con confirmación. |
