# Documentación de la Interfaz de Gestión POS Pantalla Táctil

Esta documentación describe las funcionalidades de la interfaz táctil (POS Touch Screen) para la selección y gestión de artículos en el carrito.

---

## Descripción General

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

La interfaz está dividida en varias secciones para facilitar la gestión de ventas:

1. **Carrito**: Muestra los artículos seleccionados por el cliente.
2. **Favoritos y Etiquetas de Artículos**: Permite la búsqueda rápida de artículos.
3. **Todos los Artículos**: Muestra todos los artículos disponibles.
4. **Acciones**: Botones para gestionar el carrito y finalizar la venta.

---

## Configuración

En admin/tag, pos-favorite es una etiqueta a crear para mostrar artículos como favoritos por defecto en la interfaz /pos/touch.

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

En admin/config/pos, puede agregar etiquetas para que sirvan como menús en /pos/touch.

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Descripción de las Secciones

### 1. Carrito

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Visualización**: Ubicado en el lado izquierdo de la interfaz, esta sección muestra los artículos actualmente en el carrito.
- **Estado inicial**: Muestra "El carrito está vacío" cuando no se han agregado artículos.
- **Funcionalidad**: Permite ver los artículos agregados junto con su cantidad y precio total.
- **Agregar al Carrito**: Para agregar al carrito en una pantalla de punto de venta, simplemente haga clic en el artículo.

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  Y el artículo se agregará al carrito y se mostrará en el bloque de ticket.

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  Cuando un artículo se agrega al carrito, puede agregar una nota haciendo clic en el nombre del artículo.

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)
  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Favoritos y Etiquetas de Artículos

- **Favoritos**: La sección `Favoritos` en la parte superior presenta una lista de artículos marcados como favoritos para acceso rápido.
  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Gestión de Favoritos**: Puede marcar artículos como favoritos durante su creación para facilitar el acceso posterior.

- **Etiquetas de Artículos**: La sección debajo de "Favoritos" presenta artículos organizados por diferentes etiquetas.
  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. Todos los Artículos

- **Visualización de Artículos**: Presenta una lista de todos los artículos disponibles en el sistema.
  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Acciones

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

- **Tickets**: Accede a los tickets de venta actuales.
- **Pagar**: Redirige a /checkout para finalizar la venta y registrar la transacción.
  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)
- **Guardar**: Guarda el estado actual del carrito.
- **Pool**: Para dividir el pedido o asociar clientes a un pedido específico.
- **Abrir Cajón**: Abre el cajón de efectivo (requiere sistema físico conectado).
- **🗑️**: Permite vaciar el contenido del carrito.
  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)
- **❎**: Permite eliminar la última línea del carrito.
  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Tema

Por defecto, POS Touch Screen usa el diseño mostrado en las capturas anteriores, pero es posible cambiarlo modificando el tema en **Admin** > **Merch** > **Themes**.

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
