# Personalizar tu túnel de compra

El túnel consta de 3 páginas sucesivas:
- /cart (el carrito de compras)
- /checkout (página de entrega, método de pago y contacto)
- /order (página de resumen de la orden, solicitud de pago y acceso a la factura y archivos descargables)

Cada una de estas páginas puede ser mejorada integrando contenido de una página CMS.
Estas páginas son:

Para el carrito de compras (/cart]
  /basket-top
  /basket-bottom
Para el túnel (/checkout)
/checkout-top
/checkout-bottom
Para la página de la orden (/order)
  /order-top
  /order-bottom

El contenido se muestra de esta manera (aquí, usando una etiqueta [Picture=ID] en cada página CMS, ver [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Todo el contenido CMS puede ser utilizado (slider, imagen de agradecimiento, formulario de contacto en la página de checkout, etc.).

Sin embargo, no es recomendable integrar enlaces de texto o widgets con CTAs (Tag o Producto), por razones de venta cruzada u otras. Una vez en el /cart, cualquier salida del túnel de compra probablemente resultará en una orden no finalizada y una caída en la tasa de conversión.

Los widgets recomendados son:
- Contenido CMS estándar sin enlaces de hipertexto
- El widget [Picture=ID]
- El widget [Slider=ID]
- El widget [Form=ID], particularmente en la página /order-bottom

Y no sobrecargues estas páginas CMS integradas, o perderás al usuario y harás que abandone su orden.
