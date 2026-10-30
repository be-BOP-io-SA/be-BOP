# Opción de Punto de Venta

## Introducción

be-BOP te permite interactuar con tu comunidad en Internet, y también puede ser usado como software de caja registradora (en un stand o tienda).

POS: Point Of Sale (para el comportamiento de cobro en tienda)

Al usar el rol POS y asignarlo a un perfil [team-access-management.md](team-access-management.md), puedes dar a un perfil de caja opciones adicionales para opciones de compra específicas.
Usar la cuenta POS también te permite tener una pantalla para el cliente que muestra:
- Una página de inicio
- El carrito de compras mostrado en tiempo real
- El código QR de pago (Bitcoin, Lightning o CB Sum Up) una vez que la orden ha sido validada
- Una página de validación una vez que el pago ha sido confirmado

## Gestión de la cuenta POS

El rol de punto de venta se configura por defecto en el módulo /admin/arm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Iniciar sesión en la cuenta POS

Una vez asignado a un perfil, la persona con acceso POS debe ir a la página de inicio de sesión en administración (/admin/login, donde /admin es la cadena segura configurada por el propietario del be-BOP (ver [back-office-access.md](back-office-access.md))) e iniciar sesión.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(En el caso de una tienda, es preferible elegir un tiempo de mantenimiento de conexión de "1 day", para evitar desconexiones en medio de una sesión de ventas).

## Uso de la cuenta POS

Una vez conectado, el usuario POS navega a la URL /pos:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

La sesión /pos/session se vincula a la pantalla del lado del cliente (ver después "Pantalla del cliente").
La visualización de las últimas transacciones permite proporcionar servicio postventa en caso de solicitud de un cliente.
Si la cuenta POS ha sido configurada de esta manera en el ARM, puede acceder manualmente a las páginas /admin en otra pestaña.

## Agregar al carrito

Los productos accesibles para la cuenta POS son aquellos configurados en el selector de canal de producto ([Retail (POS logged seat)](Retail (POS logged seat))):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

Las opciones activadas en la columna "Retail (POS logged seat)" se aplicarán exclusivamente a la cuenta POS.

### Navegación del catálogo

El cajero puede agregar productos ya sea:
- A través de páginas CMS que muestran widgets de productos (ver [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md))
- Accediendo a la página /catalog que muestra todos los artículos elegibles a través del canal selector

El recorrido hacia el carrito de compras es entonces similar al de cualquier otro usuario en la web.

### Agregar rápido vía Alias

Se puede agregar un alias a cada producto ([product-alias-management.md](product-alias-management.md)).
Si los artículos que vendes tienen un código de barras (tipo ISBN / EAN13), este puede ser ingresado como alias.

En el carrito de compras, la cuenta POS tiene una opción no disponible para el usuario promedio: al ir directamente a la página del carrito de compras (/cart), la cuenta POS tiene un campo para ingresar un alias (manualmente, o a través de un lector USB portátil).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Después de la validación con "enter":__

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

El campo "Alias" se limpia para permitir escanear el siguiente artículo más rápidamente.

En caso de un error al agregar al carrito, el error se notificará y el campo Alias se vaciará:
- Número máximo de líneas de carrito ya alcanzado: "Cart has too many items".
- Alias inexistente: "Product not found".
- Stock agotado: "Product is out of stock".
- Artículo de "suscripción" agregado 2 veces: el artículo no se agrega una segunda vez (los artículos de suscripción tienen una cantidad fija de 1).
- Artículo con lanzamiento futuro pero preorden no autorizada: "Product is not available for pre-order".
- Artículo con adición al carrito deshabilitada en el canal selector: "Product can't be added to basket".
- Artículo con límite de cantidad por orden ya alcanzado:
  - Si no es un artículo "Stand alone": "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (actualmente hay un error con este control, el artículo se agrega y el mensaje se muestra después de refrescar el carrito, y la validación del carrito vuelve a /cart con el mensaje de error)
- Artículo no disponible para entrega en tu país de destino: el artículo se agrega, pero el mensaje "Delivery is not available in your country for some items in your basket" se muestra al final del carrito.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Ten en cuenta que al agregar un artículo PWYW vía alias, el monto del producto será el monto mínimo configurado en el producto.

## Especificidades del túnel (/checkout)

La cuenta POS ofrece opciones adicionales:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Envío

El formulario de dirección es opcional, siempre que se seleccione un país (dependiendo de la tienda); todos los demás campos son opcionales (en el caso de un cliente que compra, recoge directamente en la tienda y no requiere una factura nominativa).
- Si el cliente requiere entrega, se puede completar el formulario de dirección.
- Si el cliente requiere una factura, la opción "My delivery address and billing address are different" se puede usar para completar la factura.

### Ofrecer envío gratuito
Por defecto, todas las órdenes con artículos que tienen una contraparte física se consideran en entrega.
El administrador (o cualquier persona con acceso de escritura a /admin/config) puede habilitar esta opción en /admin/config/delivery (ver [delivery-management.md](delivery-management.md)).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Si la opción "Allow voiding delivery fees on POS sale" está habilitada, esta opción estará disponible en la página /checkout para la cuenta POS:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

Si la opción está activada, se debe completar una justificación obligatoria, para seguimiento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

El monto (costos de envío + IVA relacionado) se deducirá en la siguiente página (los precios de la página /checkout aún no se actualizan en tiempo real según las opciones POS aplicadas).

### Pago múltiple o pago en tienda

La cuenta POS te permite usar:
- Pagos clásicos ofrecidos en el sitio que han sido activados y son elegibles ([payment-management.md](payment-management.md)) para todos los productos en el carrito
- Pago de Punto de Venta, que incluye todos los pagos fuera del sistema beBOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

Si "Use multiple payment methods" está activado, la elección del método de pago ya no es necesaria (ver "Detalles de la orden (/order)" a continuación).

Al usar un pago convencional (CB Sum Up, Lightning o Bitcoin on-chain), el código QR de pago se mostrará en el dispositivo del cliente (ver "Pantalla del lado del cliente" a continuación).
Si se usa una transferencia bancaria, la orden quedará suspendida y se validará una vez que la transferencia se haya recibido manualmente (no recomendado para pagos en tienda).

Si usas el método de pago "Point of sale" (pago único), debes ingresar el método de pago manualmente (ver "Detalles de la orden (/order)" a continuación).

### Exención de IVA

Una cuenta POS puede elegir facturar a un cliente sin IVA (por ejemplo, en Francia, un cliente empresarial).
⚖️ Tu legislación local debe autorizar el uso de esta opción, de la cual eres responsable.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

Si la opción está activada, se debe completar una justificación obligatoria, para seguimiento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

La suma (IVA global) se deducirá en la siguiente página (los precios de la página /checkout aún no se actualizan en tiempo real según las opciones POS aplicadas).

### Aplicar un descuento de regalo

Una cuenta POS puede elegir aplicar un descuento a un cliente:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

Si la opción está activada, se debe completar una justificación obligatoria, para seguimiento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

También debes elegir el tipo de reducción:
- En porcentaje (se mostrará un mensaje de error en caso de entrada inválida, o reducción del 100%)
- En monto correspondiente a la moneda principal del be-BOP (ver [currency-management.md](currency-management.md)) (se mostrará un mensaje de error en caso de entrada inválida, o una reducción correspondiente al total de la orden)

⚖️ Tu legislación local debe autorizar el uso de esta opción y sus montos máximos, de lo cual eres responsable (por ejemplo, ley de precio único en Francia).

⚠️ Mientras se espera que los montos se actualicen en tiempo real en la página /checkout, ten cuidado de acumular reducción + exención de IVA + eliminación de costos de envío.
Aunque no es desaconsejable, combinar funciones requiere un mínimo de atención.

### Contacto del cliente opcional

Normalmente, en modo eshop, es necesario dejar al menos una dirección de correo electrónico o un npub de Nostr para recibir notificaciones de tu orden y conservar la URL de acceso.
En modo POS, estos campos son opcionales si un cliente se niega a dejar sus datos de contacto:
- En este caso, sin embargo, informa a los clientes que tendrán que pasar por el sistema de soporte de la tienda para encontrar la URL de su resumen de orden, facturas y archivos descargables.
- Proporciona una impresora para imprimir la factura después de la compra.
- Si el carrito de compras incluye una suscripción, explica que no es una renovación automática, sino que cada vez se hace una solicitud de pago a los datos de contacto dejados (ver [subscription-management.md](subscription-management.md)); y por lo tanto, sin datos de contacto, la suscripción nunca podrá ser renovada, así que mejor eliminarla del carrito de compras.

### Otras casillas de verificación del cliente

Al validar una orden POS, las casillas de verificación obligatorias del recorrido del cliente permanecen para ser validadas:
- Aceptación de los términos y condiciones generales de venta y uso
- (Si la opción ha sido activada - ver [privacy-management.md](privacy-management.md)) aceptación del almacenamiento de IP para carritos de compras sin dirección de entrega
- (Si la orden incluye un artículo pagado a cuenta - ver [payment-on-deposit.md](payment-on-deposit.md)) compromiso de pagar el resto de la orden a tiempo
- (Si la orden incluye una entrega al extranjero al 0% libre de impuestos y declaración aduanera obligatoria después - ver [VAT-configuration.md](VAT-configuration.md)) compromiso de cumplir con las declaraciones aduaneras

Los enlaces en estas opciones llevan a las páginas CMS descritas aquí: [required-CMS-pages.md](required-CMS-pages.md).
Dado que los compradores en tienda obviamente no tendrán tiempo para consultar estos documentos en su totalidad, las alternativas son:
- Tener una versión impresa de cada una de estas páginas disponible en tienda:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- Referir al cliente al sitio para una consulta exhaustiva después
- Hacer al cliente la siguiente pregunta al validar cada opción requerida:
  - ¿Acepta las condiciones generales de venta?
  - ¿Acepta el registro de su dirección IP en nuestras bases de datos con fines contables?
  - "Como está pagando a cuenta, ¿acepta pagar el resto de la orden a tiempo cuando nuestro equipo lo contacte nuevamente?"
  - "Como su orden se entregará en el extranjero, no paga IVA hoy. ¿Está consciente de que tendrá que pagar IVA al momento de la entrega?"

### Optin

Si la opción "Display newsletter + commercial prospection option (disabled by default)" ha sido activada en /admin/config (ver [KYC.md](KYC.md)), este formulario se mostrará en /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Estas opciones solo necesitan ser activadas 1/ si el cliente te proporciona su dirección de correo electrónico o npub de Nostr 2/ le haces la pregunta y obtienes su acuerdo formal, especificando las implicaciones de cada opción.
Activar estas opciones sin obtener el consentimiento explícito del cliente es tu responsabilidad, y la mayoría de las veces es ilegal (además de ser una completa falta de respeto por la recolección de datos personales del cliente para uso comercial sin el consentimiento del cliente).

## Especificaciones de la orden (/order)

### Pago de Punto de Venta

Pendiente la creación de subtipos de pago de Punto de Venta, el pago de Punto de Venta incluye todos los pagos no realizados a través de be-BOP:
- Uso de un terminal POS físico (aún no reconciliamos automáticamente con terminales POS de Sum UP, incluso si la cuenta del sitio y la cuenta del terminal POS son compartidas)
- Efectivo
- Cheque (para países que aún lo usan)
- Twint (por el momento, la integración será posible algún día)
- Lingotes de oro
- etc

La cuenta POS por lo tanto tiene una validación manual (o cancelación) de la orden, con un recibo obligatorio:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

Los detalles se almacenan en el objeto de la orden y deberían facilitar la conciliación contable.

Por ejemplo, puedes indicar:
- "Cash: given €350, returned €43.53".
- Cheque no. XXXXX, receipt stored in B2 folder".
- Twint: transaction XXX
- "Sum Up: transaction XXX"

Para recuperar el número de transacción de Sum Up para un pago con terminal POS físico, puedes encontrarlo aquí en la aplicación vinculada al TPE consultando la transacción:
![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Una vez que el pago ha sido recibido, puedes completar y validar el campo y acceder a la factura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 Si deseas exportar la factura como archivo PDF, puedes seleccionar "Save as PDF" como destino de impresión (beBOP actualmente no soporta nativamente la generación de documentos PDF).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 Si estás imprimiendo la factura y no quieres etiquetas relacionadas con el navegador en la impresión, puedes deshabilitar la opción "Headers and footers" en las opciones de configuración de impresión

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Pago múltiple

Si has elegido esta opción en /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Puedes usar la función "Send a payment request" para dividir la orden en varios pagos.

Imaginemos que en esta orden, €30 se pagan con tarjeta de crédito con un terminal POS, €20 por Lightning, y €6.42 en efectivo:

1/ Cobrar los €30 con tarjeta de crédito a través de tu terminal POS y luego validar el pago

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Luego los €20 en Lightning:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

Y finalmente, una vez que la transacción ha sido validada, el resto en efectivo:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Una vez que se ha alcanzado el monto total, la orden será marcada como "validada".

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Pantalla del lado del cliente

Mientras estás detrás de tu PC de caja, puedes proporcionar una pantalla del lado del cliente para que pueda seguir su orden.
Puedes elegir entre:
- Una pantalla adicional conectada por HDMI: en este caso, abre una pestaña en la URL /pos/session desde la cuenta del cajero, luego muestra la pantalla en modo de página completa (frecuentemente F11) para quitar el encabezado del navegador
- Otro dispositivo con un navegador web, como una tableta o teléfono; en este caso, necesitas:
  - Ir a /admin/login (con URL de admin segura)
  - Iniciar sesión con la misma cuenta POS
  - Mostrar la página /pos/session
  - Deshabilitar el modo de suspensión del dispositivo
  - Ver (dependiendo del dispositivo) cómo cambiar la página web a pantalla completa

Cuando un carrito está vacío y no hay una orden pendiente, se mostrará una pantalla de espera y bienvenida:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Tan pronto como se agrega un artículo al carrito desde la caja, la pantalla se actualiza y muestra el carrito de compras a la persona que está realizando la compra:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Al realizar un pago Lightning

El código QR se muestra para escanear y pagar.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Al realizar un pago Bitcoin on-chain

(No recomendamos el uso de pago on-chain en tienda, a menos que tengas un número bajo de verificaciones, o si tienes tiempo para ocupar a tu cliente durante 15 minutos con un café mientras las validaciones se realizan).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Al realizar un pago con tarjeta de crédito Sum Up fuera de un terminal POS

Si tu terminal POS físico está fuera de servicio, tu cliente puede escanear un código QR con su teléfono para obtener un formulario de CB en su propio dispositivo (lo cual es más conveniente que hacer que escriba su información de CB en tu PC de caja...).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Cuando un pago Lightning / Bitcoin on-chain / CB Sum Up por código QR es validado

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

La pantalla luego regresa a la pantalla de bienvenida/espera, con el mensaje de bienvenida y el logo de be-BOP.

### Cuando se realiza un pago de Punto de Venta

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Una vez que la orden ha sido validada manualmente en la caja:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

Y finalmente, la pantalla de inicio/espera:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### En el caso de pagos múltiples en la caja:

Mientras no se haya realizado ninguna entrada:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Si hago un pago inicial (Point of sale, para efectivo):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

En lugar de la página de confirmación, regresas a la página con el saldo restante actualizado:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

Y continúa con los siguientes pagos (aquí Lightning):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Una vez que la orden ha sido pagada en su totalidad:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

Y finalmente, la pantalla de inicio/espera:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
