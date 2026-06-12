# Gestión de Regímenes y Tasas de IVA

## Introducción

Nativamente, be-BOP muestra precios sin impuestos.
Los cálculos de IVA se realizan desde el carrito.

Existen 3 regímenes principales de IVA, más una variación:
- Exención con justificación
- Venta con tasa de IVA del país del vendedor
- Venta con tasa de IVA del país del comprador
- Venta con tasa de IVA del país del vendedor con exención para compradores que reciben mercancía en el extranjero, sujeta a declaración de pago de IVA en su país

Para auditorías fiscales, cumplimiento legal y contabilidad, a veces es necesario recopilar datos del cliente para justificar una posible exención de IVA.
Estos puntos se tratan en [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Caso 1: Exención de IVA con Justificación

En /admin/config, existe la opción **Disable VAT for my be-BOP**.
Una vez marcada, **se aplica un IVA del 0% a todos los pedidos futuros**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

Al activar esta opción se activa la sub-opción **VAT exemption reason (appears on the invoice)**.
Este es el texto legal a completar para justificar la ausencia de IVA.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Caso 2A: Venta con Tasa de IVA del País del Vendedor

En /admin/config, existe la opción **Use VAT rate from seller's country (always true for products that are digital goods)**.
Luego debe elegir el país al que está asociada su empresa en **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

Al hacerlo:
- La tasa de IVA en el carrito será la del país de su empresa
- La tasa de IVA en la página de checkout será la del país de su empresa
- La tasa de IVA en el pedido será la del país de su empresa
- La tasa de IVA en la factura será la del país de su empresa

## Caso 2B: Venta con IVA del País del Vendedor con Exención para Envíos al Extranjero

Si activa la opción **Make VAT = 0% for deliveries outside seller's country**, las reglas permanecen iguales para clientes que reciben en el país de su empresa.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

Sin embargo, si su cliente quiere recibir la mercancía en otro país:
- La tasa de IVA en el carrito será la del país donde está geolocalizada su IP (datos de ip2location.com)
- La tasa de IVA en checkout, pedido y factura será la del país de entrega elegido

Cuando esta opción está activada, el cliente debe validar: **I understand that I will have to pay VAT upon delivery**.
Esta opción enlaza a la página CMS /why-vat-customs.

### Cliente que Recibe en el País del be-BOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Cliente que Recibe en Otro País

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Caso 3: Venta con Tasa de IVA del País del Comprador

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Cuando en /admin/config no hay opción de régimen de IVA activada y se elige un país de IVA, el IVA aplicado será el del cliente basado en su geolocalización IP o país de entrega.

## ¿Se Almacena el IP del Usuario?
No se almacena nativamente. Se usa solo para estimación de IVA y envío antes de que el cliente ingrese su dirección postal.

## ¿Qué Régimen de IVA Elegir?

Depende de: el estatus de su empresa, tipo de actividad, facturación anual y otras consideraciones legales. Consulte con su contador o abogado.

## Gestión de Perfiles de IVA Reducido

Para crear **Custom VAT Rates**, vaya a /admin/config/vat:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

Puede nombrar y guardar un perfil con tasas de IVA personalizadas por país.

Luego, en /admin/product/{id}, puede especificar el perfil de IVA deseado:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

El IVA de cada artículo se muestra en el carrito:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

Y en la factura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
