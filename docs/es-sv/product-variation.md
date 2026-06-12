# Documentación de Variación de Producto

![image](https://github.com/user-attachments/assets/5d44dd81-a1d8-474e-b627-d5f3e01e955f)

Accesible al crear o editar un producto, las variaciones permiten hacer una selección (de color, talla, etc.) de un artículo antes de agregarlo al carrito.

## Crear o Agregar un Producto con Variaciones

Al agregar o editar un producto, puede agregar variaciones. Para esto:

- Marque **This is a standalone product** para que el producto con variaciones no se agregue al carrito con una cantidad mayor a 1.
- Marque **Product has light variations (no stock difference)** para poder agregar las diferentes variaciones.

  ![image](https://github.com/user-attachments/assets/80bfe14e-cec9-4b29-b8e2-eb3067a29b26)

Para agregar una variación, complete:

- **Name**: El título de la variación (ejemplo: Talla)
- **Value**: Un valor para el nombre (ejemplo: XL)
- **Price difference**: El valor numérico (en la misma moneda que el precio del producto) a agregar cuando un usuario elige esta variación.
  (ejemplo: una camiseta XL costará 2 dólares más que el precio base)

Haga clic en **add variation** para agregar una nueva variación. El ícono '🗑️' permite eliminar una variación ya guardada.

## Visualización en la Página del Producto

![image](https://github.com/user-attachments/assets/ed13cc76-330b-4c3c-b162-52f6438ccca3)

Al mostrar un producto con variaciones, podrá elegir las variaciones antes de agregar al carrito.

## Visualización en el Carrito

![image](https://github.com/user-attachments/assets/747aed2c-854f-4bf4-a156-9a1b18f3616e)

![image](https://github.com/user-attachments/assets/394264ed-91c0-478c-9aa1-b9064c7c1b6b)

Cuando un producto con variaciones se agrega al carrito, el nombre se convierte en el nombre del producto concatenado con el valor de la variación.

Ejemplo: Camiseta - XL - Rojo (donde XL es un valor de variación de Talla y Rojo un valor de variación de Color)
