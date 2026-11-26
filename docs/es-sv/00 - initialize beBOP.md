# Inicializar tu be-BOP

Resumen rápido antes de una documentación más detallada

Una vez que tu be-BOP esté funcionando (no olvides el readme.md):

## Cuenta de super-administrador

- Ve a tu-sitio/admin/login
- Crea tu cuenta y contraseña de superadmin

## /admin/config (a través de Admin / Config)

### Proteger el acceso a tu back-office

Ve a /admin/config, dirígete a "Admin hash", define un hash y guarda.
Ahora, la dirección del back-office será /admin-tuhash

### Poner tu be-BOP en modo de mantenimiento

Ve a /admin/config, marca "Enable maintenance mode".
Puedes agregar cualquier IPv4 separada por comas para permitir el acceso al front-office.
El back-office siempre estará abierto.

### Definir tus monedas
Ve a /admin/config:
- La moneda principal se usa para mostrar en el front y en las facturas
- La segunda moneda es opcional y se usa para mostrar en el front
- La moneda de referencia de precios es la moneda predeterminada con la que crearás tus precios, pero podrás cambiarla producto por producto
  - Al hacer clic en el botón rojo y confirmar, las monedas de tus productos se sobrescribirán con la selección elegida, pero el precio no se actualizará
- La moneda contable permite que un be-BOP con moneda totalmente en BTC guarde el tipo de cambio de Bitcoin al momento de la orden.

### Temporización

La duración de suscripción se usa para productos de suscripción; puedes elegir mes, semana o día.
El recordatorio de suscripción es el plazo entre el envío de la nueva propuesta de factura y el fin de la suscripción.

### Bloques de confirmación

Para pagos Bitcoin on-chain, puedes definir un número estándar de verificaciones para la transacción.
Pero con "Manage confirmation thresholds", podrás hacerlo dependiendo del precio, por ejemplo:
- < 100€: 0 confirmaciones
- 100€ a 1000€: 1 confirmación
- 1000€ a 9999999999999€: 2 confirmaciones
etc

### Expiración de la orden

"Set desired timeout for payment (in minute)" permite cancelar una orden en el sistema be-BOP si la transacción no fue pagada o verificada suficientemente.
Esto aplica solo para Bitcoin on-chain, Lightning y tarjeta de crédito por Sum Up.
Un tiempo demasiado corto te obligará a tener un objetivo de bloques de confirmación on-chain bajo o nulo.
Un tiempo demasiado largo bloqueará el inventario de tus productos mientras la orden está pendiente.

### Reserva de inventario
Para evitar el acaparamiento de inventario, puedes configurar "How much time a cart reserves the stock (in minutes)".
Cuando agrego un producto a mi carrito, si es el último, nadie más podrá hacerlo.
Pero si no proceso mi orden y espero más del tiempo definido, el producto estará disponible nuevamente, y será removido de mi carrito si alguien más lo compra.

### Por definir

## /admin/identity (a través de Config / Identity)

Aquí, toda la información sobre tu empresa se usará para facturas y recibos.

"Invoice Information" es opcional y se agregará en la parte superior derecha del recibo.

Para permitir el método de pago por "transferencia bancaria", necesitas completar tu IBAN y BIC en "Bank account".

El correo electrónico de información de contacto se usará como "enviado por" para correos electrónicos y se mostrará en el pie de página.

## /admin/nostr (a través de Node management / Nostr)

Ve a /admin/nostr (a través de Node management / Nostr) y haz clic en "Create nsec" si aún no tienes una.
Luego, puedes agregarla en el .env.local antes (ver readme.md)

## /admin/sumup (a través de Payment partner / Sum Up)

Una vez que tengas tu cuenta de Sum Up, usa su interfaz de desarrollo y copia la API key aquí.
El código de comerciante se puede encontrar en tu panel de control, o en los recibos de transacciones anteriores.
La moneda es la moneda de tu cuenta de Sum Up (generalmente, del país donde está tu empresa).

# El resto

Por ahora, y para cosas fuera del back-office, no olvides el readme.md.

El gráfico de gobernanza se publicará pronto, pero en resumen, cada pull request será revisado por:
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
Y si estamos de acuerdo, haremos merge.

Rechazaremos necesidades ultra-específicas y optaremos por funcionalidades genéricas que puedan ser utilizadas por el mayor número de personas.
