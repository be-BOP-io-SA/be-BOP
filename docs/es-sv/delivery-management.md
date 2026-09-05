# Gestión de costos de envío

## Introducción
be-BOP actualmente ofrece solo un método de envío genérico.
Sin embargo, hay varias formas de gestionar los costos de envío.
Los costos de envío se pueden configurar:
- Globalmente en /admin/config/delivery
- Detalladamente en /admin/product/{id}

## Modo de gestión
Los dos principales son:
- Tarifa fija: cada orden se factura con un monto determinado (definido en /admin/config/delivery), en una moneda definida.
  - "Apply flat fee for each item instead of once for the whole order": en este modo, la tarifa fija se aplica a cada línea de artículo en lugar de al carrito completo.
- "Fees depending on product": cada producto tiene sus propios costos de envío específicos, que se agregan al carrito según la cantidad de artículos ordenados.
  - En este modo, solo se aplica la tarifa de envío del artículo más alto, en lugar de la suma total.

En todos los casos, estos cálculos solo conciernen a productos para los cuales la opción "The product has a physical component that will be shipped to the customer's address" ha sido activada en /admin/product/{id}.
Los costos de envío y las contribuciones de tarifa fija al envío no se toman en cuenta al calcular los tipos de producto.

### ¿Línea de artículo?
[Screenshot requis]
Un carrito de compras de un cliente generalmente contiene varias líneas, cada una correspondiente a un producto A en cantidad n.
Así, si tengo el siguiente carrito:
- Artículo A cant. 2
- Artículo B cant. 3
- Artículo C cant. 4
- Artículo D cant. 8
Mi carrito contiene 4 líneas de artículos.

En el caso de una configuración de tarifa fija de €10, el precio del envío será de €10.
Para una configuración de "Tarifa fija" de €10 con la opción "Apply flat fee for each item instead of once for the whole order", el costo de envío será 4 líneas de artículos * €10, es decir €40.

### Artículo independiente
A veces, un artículo voluminoso o frágil justifica por sí solo un envío separado, seguro, un paquete especial, protección de envío, etc.
Cuando agregas el mismo artículo A al carrito de compras 2 veces, el carrito muestra una sola línea con "Artículo A cant. 2".
Si activas la opción "This is a standalone product" en /admin/product/{id}, cada vez que agregues un producto, lo agregarás en una línea individual.
Así, si tengo un artículo B (por ejemplo, un televisor) y lo agrego 3 veces, mi carrito se convierte en:
- Artículo A cant. 2
- Artículo B
- Artículo B
- Artículo B
Mi carrito ahora contiene 4 líneas de artículos: 1 artículo independiente corresponde a 1 línea de carrito.

## Zonas de envío
Por defecto, las zonas de envío y sus tarifas no están definidas.
Para definir una tarifa de envío global, selecciona "Other countries", agrégala y establece una tarifa.
Si definimos un precio de envío para el país A, otro para el país B y uno final para "Other Countries", el precio establecido para "Other Countries" se usará por defecto para todos los países que no sean ni el país A ni el país B.

## Precios de envío específicos por producto y restricciones de envío de productos
(Por definir)
