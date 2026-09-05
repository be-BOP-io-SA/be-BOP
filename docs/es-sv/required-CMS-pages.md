# Páginas CMS obligatorias

## Introducción

be-BOP utiliza nativamente ciertas páginas obligatorias para mostrar varios textos (como avisos legales), la página de inicio o páginas de error.
Estas páginas son páginas CMS que se pueden personalizar en /admin/CMS como cualquier otra página de contenido enriquecido.

Los slugs para estas páginas son:
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Página de inicio
Esta página se muestra al acceder a la raíz de tu sitio (/).
Sirviendo como vitrina para tu empresa, debería (o puede, según el gusto), en resumen:
- Presentar tu marca
- Presentar tus valores
- Presentar tus novedades
- Destacar ciertos artículos
- Permitir navegar por el resto de tu sitio a medida que avanzas, sin tener que volver a los menús
- Presentar tu identidad gráfica
- Permitir que las personas te contacten
- No estar sobrecargada
Aunque cada uno de estos puntos puede desarrollarse en su propia página CMS, una lectura vertical de tu página de inicio debería hacer que los visitantes quieran descubrir el resto de tu sitio.

## /error - Página de error
Si quieres que se muestre lo menos posible, siempre es mejor redirigir a tu usuario hacia contenido en lugar de un mensaje de error crudo.
Esto puede tomar la forma de:
- Un mensaje de disculpa (esencial)
- Un formulario de contacto para reportar la anomalía encontrada
- Un enlace a una selección de productos, una página de novedades o la página de inicio

## /maintenance - Página de mantenimiento
Ver [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
Cuando estés realizando trabajos en tu sitio o necesites restringir el acceso por migración, respaldo u otras operaciones, puedes poner tu sitio en mantenimiento.
Todo el público (salvo una lista de visitantes cuya IP ha sido incluida en la lista blanca), al intentar acceder a cualquier página de tu sitio, será redirigido a la página /maintenance.
Puedes incluir:
- Una explicación del cierre del sitio
- Un adelanto sobre las nuevas funcionalidades que vendrán con la reapertura
- Un formulario de contacto
- Elementos visuales
- Enlaces a otros sitios o redes sociales

## /terms - Términos de uso
Esta página generalmente se muestra en los enlaces del pie de página del sitio, y también se muestra en el túnel de checkout con la casilla de verificación obligatoria **I agree to the terms of service**.
El enlace a esta opción obligatoria en el túnel (/checkout) lleva a /terms, dando a tus visitantes acceso a todos los términos y condiciones de venta y uso.
Completar esta página es tedioso, ¡pero no obstante obligatorio!

## /privacy - Política de privacidad
Ver [privacy-management.md](/docs/en/privacy-management.md)
Esta página generalmente se muestra en los enlaces del pie de página del sitio.
Permite a tus visitantes conocer todas las condiciones que rigen el uso de su información personal, cumplimiento con el RGPD, recolección de cookies, etc.
La única cookie presente (bootik-session) en be-BOP es la cookie de sesión, que es esencial para el funcionamiento correcto.
No usamos cookies de publicidad.
Una segunda cookie (lang) está presente para almacenar tu elección de idioma.
Como propietario, puedes recopilar más información (información de facturación, dirección IP) por razones legales y contables: por favor explícalo en esta página.
Además, aunque los optins para prospección comercial están nativamente desactivados en be-BOP, es posible presentarlos (desactivados) al cliente, y debes comprometerte a respetar la elección del cliente en cuanto a lo que elige o no en sus optins.
Completar esta página es tedioso, ¡pero no obstante obligatorio y ético hacia tus visitantes!

## /why-vat-customs - Pago de aduanas al recibir
Ver [VAT-configuration.md](/docs/en/VAT-configuration.md)
Bajo el régimen de IVA 2B (venta a la tasa de IVA del país del vendedor y exención para la entrega de artículos físicos al extranjero), el cliente debe validar una nueva opción obligatoria: I understand that I will have to pay VAT upon delivery. Esta opción enlaza a la página CMS /why-vat-customs, que debe ser creada y completada para explicar por qué tu cliente debe pagar IVA en su país al recibir tu artículo.

## /why-collect-ip - Justificación para recopilar IP
Ver [privacy-management.md](/docs/en/privacy-management.md)
Si, por razones contables o legales, necesitas almacenar la dirección IP de tu cliente para una compra desmaterializada sin dirección postal (a través de /admin/config con la opción **Request IP collection on deliveryless order**), al cliente se le dará una opción obligatoria para completar la orden **I agree to the collection of my IP address (why?)**.
El enlace de esta opción va a /why-collect-ip, donde es mejor explicar por qué quieres guardar dichos datos (recordando que la aceptación del cliente es obligatoria para finalizar la orden si configuras tu be-BOP de esta manera).

## /why-pay-reminder - Compromiso de pagar una orden a cuenta
Ver [order-with-deposit.md](/doc/en/order-with-deposit.md)
Cuando activas el pago a cuenta para uno de tus artículos, la primera orden realizada incluye solo el depósito, pero el cliente se compromete a pagar al vendedor el resto del monto de la orden bajo las condiciones presentadas.
Si tu orden incluye una reserva para un artículo a cuenta, el enlace se muestra en el túnel de checkout con la casilla de verificación obligatoria **I agree that I need to pay the remainder in the future (why?)**.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom,  /basket-top, /basket-bottom
Ver [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
