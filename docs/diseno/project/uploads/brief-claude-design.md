# Brief para Claude Design — Fast Client

## Cómo usar este archivo

1. En Claude Design, crea un proyecto nuevo (prototipo de alta fidelidad).
2. Adjunta estos dos archivos como contexto: `docs/05-interfaz.md` (layout, tokens, íconos, componentes, atajos) y `docs/01-vision-y-alcance.md` (requisitos).
3. Pega el **prompt** de abajo tal cual. Pide las pantallas por bloques (A → B → C) para iterar con calma.
4. Cuando el diseño te guste: pide la hoja de tokens final (bloque D) y usa **Handoff a Claude Code**. Guarda lo exportado en `docs/diseno/` (ver "Al volver del diseño").

---

## Prompt (copiar y pegar)

Diseña la interfaz de escritorio de **Fast Client**, un cliente HTTP para Windows (Electron) minimalista, inspirado en Postman (área de trabajo con pestañas) y Bruno (árbol Colecciones > Requests a la izquierda). Los documentos adjuntos son la especificación: respeta el layout, los componentes, el mapa de íconos y los atajos de `05-interfaz.md`. Los tokens de color de ese documento son un **punto de partida**: puedes refinarlos, pero el resultado final debe entregarse como tokens.

**Personalidad visual:** sobria, elegante, oscura por defecto, con mucho aire. La jerarquía se marca con el tono de las superficies, casi sin líneas. Un solo color de acento. Los colores fuertes solo para métodos HTTP (GET verde, POST ámbar, PUT azul, PATCH violeta, DELETE rojo) y códigos de estado. Radios de 6 a 10 px, sombras solo en elementos flotantes. Referencias de sensación: Linear, Raycast, VS Code con un tema limpio.

**Restricciones fijas:**
- Marco de 1440×900. Barra de título propia de 40 px, con los controles nativos de Windows (minimizar, maximizar, cerrar) a la derecha, sobre el mismo color de la barra.
- Íconos: **Material Symbols Rounded** de Google, peso 400, relleno 0 (relleno 1 para el estado activo). Úsalos en casi todo: botones, menús, menús contextuales, pestañas, árbol y toasts.
- Tipografías: **Inter** para la interfaz y **JetBrains Mono** para la URL, el código, los badges de método y los headers.
- Todos los textos en **español**.
- Datos de ejemplo genéricos y realistas. Colecciones: "API Tienda" y "Autenticación". Requests: "Listar productos", "Crear pedido", "Actualizar stock", "Eliminar carrito", "Login", "Refrescar token". Variable `{{baseUrl}}`. Respuesta JSON de unas 30 líneas.
- Nada de pantallas de bienvenida: la app abre directamente en el área de trabajo.

**Bloque A — pantalla principal**
1. Área de trabajo en tema **oscuro**:
   - Sidebar con las dos colecciones (una expandida) y el buscador.
   - Tres pestañas abiertas, una con el punto de "cambios sin guardar".
   - Editor de un POST con la sub-pestaña Body en JSON.
   - Respuesta `201 Created`, con tiempo y tamaño, y el body JSON resaltado.
   - Nombre del perfil `perfil.fcprofile` en la barra de título.
2. La misma pantalla en tema **claro**.

**Bloque B — menús y diálogos**
3. Menú **Archivo** abierto. Cada opción lleva ícono, texto y atajo alineado a la derecha: Nuevo (Ctrl+N), Abrir… (Ctrl+O), Abrir reciente ▸ (submenú desplegado), Reubicar… (Ctrl+Shift+S), Ir al archivo (Ctrl+Shift+E), Tema ▸ y Salir (Ctrl+Q).
4. Diálogo "Ya existe un perfil por defecto", con tres botones: **Reubicar el existente primero**, **Crear nuevo de todas formas** (estilo peligro) y **Cancelar**.
5. Menú contextual de una colección y de un request, con íconos.
6. Pila de toasts en la esquina inferior derecha, uno de cada tipo:
   - éxito: "Perfil reubicado", con la acción *Ir al archivo*;
   - info;
   - advertencia: "No se encontró el perfil…";
   - error: con la acción *Reintentar*.

**Bloque C — estados y detalles**
7. Sidebar en varios estados: renombrado inline, arrastre de un request a otra colección, búsqueda con coincidencias resaltadas y estado vacío ("Crea tu primera colección").
8. Editor de request:
   - sub-pestaña Headers, con los headers automáticos en gris y la fila vacía al final;
   - sub-pestaña Auth en modo Bearer;
   - barra de URL con `{{baseUrl}}` resaltada (existe) y `{{token}}` en rojo (no definida).
9. Estados de la respuesta: vacío ("Pulsa Send para ver la respuesta"), cargando (barra indeterminada, tiempo transcurrido y botón Cancelar) y error de red (DNS o timeout, con un mensaje claro).
10. Área de trabajo sin pestañas: estado vacío con los atajos sugeridos.

**Bloque D — sistema**
11. Hoja de componentes:
    - botones (primario, secundario, fantasma, peligro, solo ícono);
    - badges de método y pills de estado HTTP;
    - pestaña (normal, activa, hover, con cambios);
    - fila del árbol;
    - tabla clave/valor;
    - inputs y dropdown;
    - tooltip, toast y diálogo.
12. Tokens finales como variables CSS para tema oscuro y claro: colores, espaciados, radios, sombras, tipografías, tamaños y transiciones. Usa los mismos nombres de variable de `05-interfaz.md` y agrega los que falten.

---

## Al volver del diseño

- Guarda el paquete de handoff y las capturas en `docs/diseno/` (p. ej. `docs/diseno/handoff/` y `docs/diseno/capturas/`).
- Copia los tokens finales a `docs/diseno/tokens.css`.
- Pídele a Claude Code: *"Actualiza `docs/05-interfaz.md` con los tokens y decisiones del handoff en `docs/diseno/`, sin tocar la lógica ni los flujos"*. Desde ese momento, el diseño manda en lo visual; los docs 01–04 y 06–08 mandan en el comportamiento.
