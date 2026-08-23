# Configuración CLINK

CLINK (Common Lightning Interface for Nostr Keys) es un método de pago Lightning que utiliza el protocolo Nostr como capa de transporte. Permite a los comerciantes recibir pagos Lightning a través de eventos Nostr cifrados de tipo 21001.

## Resumen

Cuando un cliente paga con CLINK:

1. Se crea una **factura bolt11** inmediatamente al realizar el pedido y se muestra como código QR
2. Cualquier billetera Lightning puede escanear y pagar la bolt11 directamente
3. Las billeteras compatibles con CLINK también pueden escanear el **nOffer** del comerciante y recibir la misma bolt11 a través del relay Nostr
4. El pago se confirma cuando Lightning.Pub envía un recibo (segundo evento kind 21001) al comerciante

CLINK es una capa de transporte, no un backend Lightning. La generación de facturas se delega al procesador Lightning configurado (por ejemplo, Blink) o a un endpoint HTTP de Lightning.Pub.

## Prerrequisitos

- Una **clave privada Nostr** configurada en `.env.local` (formato nsec)
- Un procesador Lightning configurado (por ejemplo, Blink) o un endpoint HTTP de Lightning.Pub
- Un relay Nostr para la comunicación CLINK (por ejemplo, `wss://strfry.shock.network`)

## Configuración

### 1. Variables de entorno

Agregar en `.env.local`:

```env
# Clave privada Nostr (formato nsec) — requerida para el cifrado NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configuración de administrador

Navegar a **Admin > Config** y desplazarse a la sección **CLINK**:

- **nOffer**: Su cadena nOffer de Lightning.Pub (por ejemplo, `noffer1...`). Identifica su cuenta de comerciante ante las billeteras CLINK.
- **Relay**: La URL del relay Nostr utilizada para la comunicación CLINK (por ejemplo, `wss://strfry.shock.network`)
- **Endpoint HTTP de Lightning.Pub** (opcional): Si desea usar una instancia específica de Lightning.Pub para la generación de facturas, ingrese su URL HTTP aquí. De lo contrario, se usa el procesador Lightning configurado.

### 3. Activar CLINK como método de pago

En la página **Config**, bajo **Métodos de pago**, activar **Lightning** y establecer el procesador Lightning predeterminado en **CLINK**.

## Cómo funciona

### Flujo de pago

1. **El cliente realiza el pedido** → be-BOP envía una solicitud CLINK (kind 21001) a Lightning.Pub a través del relay del comerciante
2. **Lightning.Pub responde** → Devuelve una factura bolt11 por el monto exacto
3. **Código QR mostrado** → La factura bolt11 se presenta al cliente
4. **El cliente paga** → Escanea el QR con cualquier billetera Lightning y paga
5. **El recibo llega** → Lightning.Pub envía un segundo evento kind 21001 (recibo de pago) al comerciante
6. **Pedido confirmado** → be-BOP recibe el recibo y marca el pedido como pagado

### Protocolo CLINK

El protocolo CLINK utiliza el evento Nostr tipo 21001 con cifrado NIP-44:

- **Solicitud** (cliente → servidor): El cliente envía una solicitud de pago cifrada con el monto
- **Respuesta** (servidor → cliente): El servidor responde con la factura bolt11 cifrada
- **Recibo** (Lightning.Pub → servidor): Después del pago, Lightning.Pub envía un recibo confirmando el settlement
- **Settlement**: El cliente paga la factura bolt11 vía Lightning estándar

### Detección de pago

El pago se detecta exclusivamente a través del **recibo Nostr** (segundo evento kind 21001 de Lightning.Pub). be-BOP **no delega** la detección de pago al procesador Lightning subyacente (Blink, LND, etc.) porque esos procesadores no pueden buscar facturas creadas por Lightning.Pub.

Si el recibo no se recibe (por ejemplo, problemas de relay), el pago expirará después del tiempo de sesión (2 horas). En la práctica, los recibos llegan en segundos después del pago.

### Componentes clave

- **nOffer**: Una cadena de oferta de comerciante codificada en bech32 que contiene la clave pública Nostr del comerciante, la URL del relay y el ID de la oferta
- **Cifrado NIP-44**: Cifrado de extremo a extremo para solicitudes y respuestas de pago
- **Almacenamiento de sesiones**: Las sesiones CLINK activas se almacenan en MongoDB con un índice TTL, sobreviviendo reinicios del servidor. Un caché en memoria proporciona búsquedas rápidas.
- **Escuchador persistente**: Una suscripción Nostr de larga duración en el relay del comerciante que maneja tanto las solicitudes de pago entrantes como los recibos de pago, sobreviviendo reconexiones del relay

### Seguridad

- **Protección SSRF del relay**: Las URLs del relay se validan contra rangos de IP privados/internos antes de conectarse
- **Validación BOLT11**: Las facturas recibidas de Lightning.Pub se validan por coincidencia de red y consistencia del monto
- **Verificación de firmas**: Todos los eventos Nostr entrantes se verifican antes de procesarlos

## Billeteras compatibles

Cualquier billetera Lightning puede pagar el código QR bolt11. Para el flujo Nostr CLINK, use una billetera compatible con CLINK:

- ShockWallet
- ZEUS
- Otras billeteras compatibles con CLINK

## Solución de problemas

### Factura no creada

- Verificar que un procesador Lightning esté configurado y habilitado (por ejemplo, Blink), o que se haya establecido un endpoint HTTP de Lightning.Pub
- Verificar que `NOSTR_PRIVATE_KEY` esté configurado en `.env.local`
- Revisar los logs del servidor para errores relacionados con CLINK

### Código QR no se muestra

- Asegurarse de que el archivo `assets/bebop-b.svg` exista para la superposición del logo del QR
- Revisar la consola del navegador para errores

### La billetera CLINK no puede conectarse

- Verificar que la URL del relay sea correcta y accesible desde el servidor
- Verificar que la lista de relays Nostr en **Admin > Nostr** incluya el relay CLINK
- Asegurarse de que la cadena nOffer sea válida y coincida con la clave Nostr configurada

### Pago no confirmado

- Verificar que el relay sea alcanzable desde el servidor (la protección SSRF puede bloquear URLs internas)
- Verificar que Lightning.Pub envíe recibos al relay correcto
- La sesión expira después de 2 horas — si el recibo se retrasa más allá de ese tiempo, el pago no se confirmará

## Detalles técnicos

- **Tipo de evento Nostr**: 21001
- **Cifrado**: NIP-44 (versión 2)
- **Detección de pago**: Callback de recibo Nostr (segundo evento kind 21001)
- **Almacenamiento de sesiones**: MongoDB con índice TTL (2 horas)
- **Relays predeterminados**: `wss://strfry.shock.network`, `wss://relay.shocknet.app`

## Settlement con nDebit

CLINK es **solo una capa de transporte** — **no requiere nDebit** para el settlement. El settlement de pagos es manejado completamente por el procesador Lightning predeterminado del comerciante (Blink, LND, Phoenixd, etc.) a través de la factura bolt11. El comerciante recibe sats en su backend Lightning existente.

Si un comerciante desea usar nDebit para settlements entre nodos (por ejemplo, con ShockWallet), esto se configura en su billetera, no en be-BOP.
