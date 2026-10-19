# Changelog

## v0.1.2

### Novedades
- Preferencias ahora se organiza en pestañas (Red, Interfaz, Perfiles, Actualizaciones) y el modal tiene un tamaño fijo, en lugar de crecer con su contenido.
- El botón para contraer la barra lateral está ahora a la izquierda del buscador, en la misma posición que el de expandirla, de modo que no cambia de lugar al alternar.
- El botón de nueva colección pasó a la fila de la etiqueta «Colecciones», lo que deja el buscador más ancho.

### Correcciones
- El aviso «JSON no válido» ya no desplaza el botón «Formatear» ni cambia el tamaño del editor: ahora es una franja roja con texto blanco pegada al borde inferior del editor.
- Con la barra lateral contraída, el área de pestañas ya no muestra la esquina superior izquierda redondeada.

## v0.1.1

### Novedades
- Cada pestaña muestra debajo del título el nombre de su colección, útil cuando hay requests con el mismo nombre.
- En el árbol de colecciones, los requests con pestaña abierta se destacan en negrita.
- En la barra de título, **Ctrl + doble clic** sobre el nombre del perfil abre su ubicación en el explorador. El doble clic normal vuelve a maximizar o restaurar la ventana.

### Correcciones
- Al arrastrar una pestaña hasta el extremo derecho, las demás ya no siguen desplazándose hacia la izquierda: solo se reubican.
- En los editores de código, escribir `...` ya no hace desaparecer el primer punto (se desactivaron las ligaduras de la fuente).
