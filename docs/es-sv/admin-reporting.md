# Documentación de la interfaz de reportes

Esta página te permite ver y exportar detalles sobre órdenes, productos y pagos. Es accesible a través de **Admin** > **Config** > **Reporting**.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

Muestra los reportes del mes y año actuales.

---

## Funcionalidades

### 1. Filtros de reportes

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Opciones de filtro**: Permite filtrar órdenes por su estado:
  - `Include pending orders`: Incluir órdenes pendientes.
  - `Include expired orders`: Incluir órdenes expiradas.
  - `Include canceled orders`: Incluir órdenes canceladas.
  - `Include partially paid orders`: Incluir órdenes parcialmente pagadas.
- **Uso**: Marca las casillas correspondientes para incluir estos tipos de órdenes en el reporte.
  Por defecto, solo se listan las órdenes pagadas.

### 2. Detalle de órdenes

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Exportar CSV**: Permite exportar los detalles de las órdenes en formato CSV.
- **Tabla de detalles de órdenes**:
  - Muestra la información de las órdenes. Cada fila representa una orden.
  - `Order ID`: Identificador único de la orden (haz clic para ver más detalles).
  - `Order URL`: Enlace directo a la orden.
  - `Order Date`: Fecha de la orden.
  - `Order Status`: Estado de la orden (ej. paid, pending).
  - `Currency`: Moneda de la transacción.
  - `Amount`: Monto total de la orden.
  - `Billing Country`: País de facturación (si está disponible).
  - `Billing Info`: Información de la dirección de facturación.
  - `Shipping Country`: País de envío (si está disponible).
  - `Shipping Info`: Información de la dirección de envío.
  - `Cart`: Artículos en el carrito de la orden.

### 3. Detalle de productos

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Exportar CSV**: Permite exportar la información de productos asociados a las órdenes en formato CSV.
- **Tabla de detalles de productos**:
  - Muestra información sobre productos asociados a las órdenes. Cada fila corresponde a un producto agregado para una orden específica.
  - `Product URL`: Enlace directo al producto.
  - `Product Name`: Nombre del producto.
  - `Quantity`: Cantidad ordenada.
  - `Deposit`: Monto del depósito para el producto (si aplica).
  - `Order ID`: Referencia de la orden asociada.
  - `Order Date`: Fecha de la orden asociada.
  - `Currency`: Moneda de la transacción.
  - `Amount`: Monto total para este producto.
  - `Vat Rate`: Tasa de IVA aplicada.

### 4. Detalle de pagos

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Exportar CSV**: Permite exportar los detalles de pagos en formato CSV.
- **Tabla de detalles de pagos**:
  - Muestra la información de pagos asociados a las órdenes. Cada fila corresponde a un pago realizado para una orden específica.
  - `Order ID`: Referencia de la orden asociada.
  - `Invoice ID`: Referencia de la factura.
  - `Payment Date`: Fecha de pago.
  - `Order Status`: Estado de la orden.
  - `Payment mean`: Método de pago.
  - `Payment Status`: Estado del pago.
  - `Payment Info`: Información del pago.
  - `Order Status`: Estado de la orden.
  - `Invoice`: Número de factura.
  - `Currency`: Moneda de la tienda.
  - `Amount`: Monto del pago convertido con la moneda.
  - `Cashed Currency`: Moneda del pago.
  - `Cashed Amount`: Monto del pago convertido con la moneda de pago.
  - `Billing Country`: País de facturación.

### 5. Filtro de reportes

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Se usa para filtrar los reportes por mes y año seleccionados.

### 6. Síntesis de órdenes

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Exportar CSV**: Permite exportar la síntesis de órdenes en formato CSV.
- **Tabla de síntesis**:
  - Muestra un resumen de las estadísticas de órdenes para un período determinado.
  - `Period`: Indica el mes y año del período.
  - `Order Quantity`: Número total de órdenes realizadas durante este período.
  - `Order Total`: Monto acumulado de todas las órdenes para el período indicado.
  - `Average Cart`: Monto promedio de las órdenes para este período.
  - `Currency`: Moneda en la que se realizaron las órdenes (ej. BTC para Bitcoin).

### 7. Síntesis de productos

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Exportar CSV**: Permite exportar la síntesis de productos en formato CSV.
- **Tabla de síntesis**:
  - Muestra un resumen de las estadísticas de productos para un período determinado.
  - `Period`: Indica el mes y año del período.
  - `Product ID`: ID del producto.
  - `Product Name`: Nombre del producto.
  - `Order Quantity`: Cantidad ordenada.
  - `Currency`: Moneda en la que se realizaron las órdenes (ej. BTC para Bitcoin).
  - `Total Price`: Total de la orden (ej. BTC para Bitcoin).

### 8. Síntesis de pagos

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Exportar CSV**: Permite exportar la síntesis de pagos en formato CSV.
- **Tabla de síntesis**:
  - Muestra un resumen de las estadísticas de pagos para un período determinado.
  - `Period`: Indica el mes y año del período.
  - `Payment Mean`: El método de pago utilizado.
  - `Payment Quantity`: La cantidad pagada.
  - `Total Price`: El precio total pagado.
  - `Currency`: Moneda en la que se realizaron las órdenes (ej. BTC para Bitcoin).
  - `Currency`: Moneda en la que se realizaron las órdenes (ej. BTC para Bitcoin).
  - `Average`: Monto promedio pagado.

---

## Exportación de datos

Cada sección (Detalle de órdenes, Detalle de productos, Detalle de pagos) tiene un botón `Export CSV` para descargar los datos mostrados como un archivo CSV.

Un ejemplo:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
