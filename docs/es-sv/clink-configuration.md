# Configuracion CLINK

CLINK (Common Lightning Interface for Nostr Keys) es un metodo de pago Lightning que utiliza el protocolo Nostr como capa de transporte. Permite a los comerciantes recibir pagos Lightning a traves de eventos Nostr cifrados de tipo 21001.

## Resumen

Cuando un cliente paga con CLINK:

1. Se crea una **factura bolt11** inmediatamente al realizar el pedido y se muestra como codigo QR
2. Cualquier billetera Lightning puede escanear y pagar la bolt11 directamente
3. Las billeteras compatibles con CLINK tambien pueden escanear el **nOffer** del comerciante y recibir la misma bolt11 a traves del relay Nostr
4. El pago se confirma cuando Lightning.Pub envia un recibo (segundo evento kind 21001) al comerciante

CLINK es una capa de transporte, no un backend Lightning. La generacion de facturas se delega al procesador Lightning configurado (por ejemplo, Blink) o a un endpoint HTTP de Lightning.Pub.

## Prerrequisitos

- Una **clave privada Nostr** configurada en `.env.local` (formato nsec)
- Un procesador Lightning configurado (por ejemplo, Blink) o un endpoint HTTP de Lightning.Pub
- Un relay Nostr para la comunicacion CLINK (por defecto: `wss://strfry.shock.network`)

## Configuracion

### 1. Variables de entorno

Agregar en `.env.local`:

```
# Clave privada Nostr (formato nsec) - requerida para el cifrado NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configuracion de administrador

Navegar a **Admin > CLINK**:

- Activar **Enable CLINK payments** para habilitar CLINK
- **nOffer**: Su cadena nOffer de Lightning.Pub (por ejemplo, `noffer1...`). Identifica su cuenta de comerciante ante las billeteras CLINK.
- **URL del relay Nostr**: El relay Nostr utilizado para la comunicacion CLINK (por defecto: `wss://strfry.shock.network`)
- **URL del endpoint HTTP de Lightning.Pub** (opcional): Si desea usar una instancia especifica de Lightning.Pub para la generacion de facturas, ingrese su URL HTTP aqui. De lo contrario, se usa el procesador Lightning configurado.
- Hacer clic en **Save**, luego en **Test connection** para verificar que el relay y el nOffer funcionan correctamente

### 3. Activar CLINK como metodo de pago

En la pagina **Config**, bajo **Metodos de pago**, activar **Lightning** y establecer el procesador Lightning predeterminado en **CLINK**.

## Como funciona

### Flujo de pago

1. **El cliente realiza el pedido** -> be-BOP envia una solicitud CLINK (kind 21001) a Lightning.Pub a traves del relay del comerciante
2. **Lightning.Pub responde** -> Devuelve una factura bolt11 por el monto exacto
3. **Codigo QR mostrado** -> La factura bolt11 se presenta al cliente
4. **El cliente paga** -> Escanea el QR con cualquier billetera Lightning y paga
5. **El recibo llega** -> Lightning.Pub envia un segundo evento kind 21001 (recibo de pago) al comerciante
6. **Pedido confirmado** -> be-BOP recibe el recibo y marca el pedido como pagado

### Protocolo CLINK

El protocolo CLINK utiliza el evento Nostr tipo 21001 con cifrado NIP-44:

- **Solicitud** (cliente -> servidor): El cliente envia una solicitud de pago cifrada con el monto
- **Respuesta** (servidor -> cliente): El servidor responde con la factura bolt11 cifrada
- **Recibo** (Lightning.Pub -> servidor): Despues del pago, Lightning.Pub envia un recibo confirmando el settlement
- **Settlement**: El cliente paga la factura bolt11 via Lightning estandar

### Deteccion de pago

El pago se detecta exclusivamente a traves del **recibo Nostr** (segundo evento kind 21001 de Lightning.Pub). be-BOP **no delega** la deteccion de pago al procesador Lightning subyacente (Blink, LND, etc.) porque esos procesadores no pueden buscar facturas creadas por Lightning.Pub.

Si el recibo no se recibe (por ejemplo, problemas de relay), el pago expirara despues del tiempo de sesion (2 horas). En la practica, los recibos llegan en segundos despues del pago.

Un boton **Verificar estado del pago** esta disponible en los pedidos CLINK pendientes, permitiendo a los clientes activar manualmente la verificacion del pago.

### Repeticion al iniciar

Al iniciar el servidor, be-BOP reproduce el historial reciente del relay para capturar recibos que llegaron mientras el servidor estaba apagado. Consulta eventos desde la creacion de la sesion pendiente mas antigua (con un buffer de 5 minutos) y permanece abierto durante aproximadamente 30 segundos para recoger recibos perdidos.

### Componentes clave

- **nOffer**: Una cadena de oferta de comerciante codificada en bech32 que contiene la clave publica Nostr del comerciante, la URL del relay y el ID de la oferta
- **Cifrado NIP-44**: Cifrado de extremo a extremo para solicitudes y respuestas de pago
- **Almacenamiento de sesiones**: Las sesiones CLINK activas se almacenan en MongoDB con un indice TTL, sobreviviendo reinicios del servidor. Un cache en memoria proporciona busquedas rapidas.
- **Escuchador persistente**: Una suscripcion Nostr de larga duracion en el relay del comerciante que maneja tanto las solicitudes de pago entrantes como los recibos de pago, sobreviviendo reconexiones del relay. El escuchador se inicia automaticamente al arrancar el servidor.
- **Descifrado dual**: Los recibos de Lightning.Pub se cifran con la clave de Lightning.Pub como remitente. be-BOP intenta un descifrado dual - primero asumiendo el autor del evento como remitente (solicitudes de pago del cliente), luego usando la clave de Lightning.Pub (recibos).

### Seguridad

- **Proteccion SSRF del relay**: Las URLs del relay se validan contra rangos de IP privados/internos antes de conectarse
- **Validacion BOLT11**: Las facturas recibidas de Lightning.Pub se validan por coincidencia de red y consistencia del monto
- **Verificacion de firmas**: Todos los eventos Nostr entrantes se verifican antes de procesarlos
- **Filtro por clave publica del comerciante**: Los filtros de suscripcion Nostr usan la clave publica propia del comerciante (derivada de `NOSTR_PRIVATE_KEY`), no la clave de Lightning.Pub

## Billeteras compatibles

Cualquier billetera Lightning puede pagar el codigo QR bolt11. Para el flujo Nostr CLINK, use una billetera compatible con CLINK:

- ShockWallet
- ZEUS
- Otras billeteras compatibles con CLINK

## Solucion de problemas

### Factura no creada

- Verificar que un procesador Lightning este configurado y habilitado (por ejemplo, Blink), o que se haya establecido un endpoint HTTP de Lightning.Pub
- Verificar que `NOSTR_PRIVATE_KEY` este configurado en `.env.local`
- Revisar los logs del servidor para errores relacionados con CLINK

### Codigo QR no se muestra

- Asegurarse de que el archivo `assets/bebop-b.svg` exista para la superposicion del logo del QR
- Revisar la consola del navegador para errores

### La billetera CLINK no puede conectarse

- Verificar que la URL del relay sea correcta y accesible desde el servidor
- Verificar que la lista de relays Nostr en **Admin > Nostr** incluya el relay CLINK
- Asegurarse de que la cadena nOffer sea valida y coincida con la clave Nostr configurada

### Pago no confirmado

- Verificar que el relay sea alcanzable desde el servidor (la proteccion SSRF puede bloquear URLs internas)
- Verificar que Lightning.Pub envie recibos al relay correcto
- Usar el boton **Verificar estado del pago** en la pagina del pedido para activar manualmente la verificacion
- La sesion expira despues de 2 horas - si el recibo se retrasa mas alla de ese tiempo, el pago no se confirmara
- Al reiniciar el servidor, el mecanismo de repeticion al iniciar capturara automaticamente los recibos perdidos recientes

## Detalles tecnicos

- **Tipo de evento Nostr**: 21001
- **Cifrado**: NIP-44 (version 2)
- **Deteccion de pago**: Callback de recibo Nostr (segundo evento kind 21001)
- **Almacenamiento de sesiones**: MongoDB con indice TTL (2 horas)
- **URL del relay CLINK**: `wss://strfry.shock.network` (configurable en Admin > CLINK)

## Settlement con nDebit

CLINK es **solo una capa de transporte** - **no requiere nDebit** para el settlement. El settlement de pagos es manejado completamente por el procesador Lightning predeterminado del comerciante (Blink, LND, Phoenixd, etc.) a traves de la factura bolt11. El comerciante recibe sats en su backend Lightning existente.

Si un comerciante desea usar nDebit para settlements entre nodos (por ejemplo, con ShockWallet), esto se configura en su billetera, no en be-BOP.
