# Configuracion CLINK

CLINK (Common Lightning Interface for Nostr Keys) es un metodo de pago Lightning que utiliza el protocolo Nostr como capa de transporte. Permite a los comerciantes recibir pagos Lightning a traves de eventos Nostr cifrados de tipo 21001.

## Resumen

Cuando un cliente paga con CLINK:

1. Se crea una **factura bolt11** inmediatamente al realizar el pedido y se muestra como codigo QR
2. Cualquier billetera Lightning puede escanear y pagar la bolt11 directamente
3. Las billeteras compatibles con CLINK tambien pueden escanear el **nOffer** del comerciante y recibir la misma bolt11 a traves del relay Nostr
4. El pago se confirma consultando al nodo Lightning del procesador backend configurado por la factura (por hash de pago)

CLINK es **solo una capa de transporte**, no un backend Lightning. La generacion de facturas y el settlement se delegan al procesador Lightning propio de be-BOP (LND, Blink, PhoenixD, etc.): el mismo nodo que respaldaria cualquier otro pago Lightning. Esto produce un hash de pago real y un `checkPayment()` autoritativo respaldado por el nodo, que concilia contra el backend que realmente recibio los sats.

## Prerrequisitos

- Una **clave privada Nostr** configurada en `.env.local` (formato nsec)
- Un procesador Lightning configurado y habilitado (por ejemplo, Blink, LND, PhoenixD) utilizado para la generacion de facturas
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

- **nOffer**: Su cadena nOffer de Lightning.Pub (por ejemplo, `noffer1...`). Identifica su cuenta de comerciante ante las billeteras CLINK.
- **URL del relay Nostr**: El relay Nostr utilizado para la comunicacion CLINK (por defecto: `wss://strfry.shock.network`)
- Hacer clic en **Save**, luego en **Test connection** para verificar que el relay y el nOffer funcionan correctamente

### 3. Activar CLINK como metodo de pago

En la pagina **Config**, bajo **Metodos de pago**, activar **Lightning** y establecer el procesador Lightning predeterminado en **CLINK**. El backend Lightning subyacente (LND, Blink, PhoenixD…) tambien debe estar configurado y habilitado.

## Como funciona

### Flujo de pago

1. **El cliente realiza el pedido** -> be-BOP delega la creacion de la factura a su procesador Lightning configurado, que emite una bolt11 con un hash de pago real
2. **Codigo QR mostrado** -> La factura bolt11 se presenta al cliente
3. **Flujo de billetera CLINK** -> Las billeteras compatibles con CLINK solicitan la factura via Nostr (kind 21001); la bolt11 se devuelve cifrada (NIP-44)
4. **El cliente paga** -> Escanea el QR (o usa su billetera CLINK) con cualquier billetera Lightning y paga
5. **Pedido confirmado** -> El poller de pedidos de be-BOP llama a `checkPayment()`, que delega al procesador Lightning backend y consulta el nodo por la factura usando su hash de pago real; el pedido se marca como pagado

### Protocolo CLINK

El protocolo CLINK utiliza el evento Nostr tipo 21001 con cifrado NIP-44:

- **Solicitud** (cliente -> servidor): El cliente envia una solicitud de pago cifrada con el monto
- **Respuesta** (servidor -> cliente): El servidor responde con la factura bolt11 cifrada
- **Settlement**: El cliente paga la factura bolt11 via Lightning estandar; el nodo Lightning del comerciante detecta el pago

### Deteccion de pago

El pago es detectado por el propio procesador Lightning backend: `checkPayment()` redirige al procesador que creo la factura (registrado por pago como `meta.backend`) y consulta ese nodo por la factura usando el hash de pago. **No hay dependencia de recibos Nostr**: el settlement se verifica contra el nodo que realmente recibio los sats, por lo que el flujo es stateless y seguro en multiples procesos.

Un boton **Verificar estado del pago** esta disponible en los pedidos CLINK pendientes; solo vuelve a ejecutar esta verificacion respaldada por el nodo (el settlement lo aplica el poller de pedidos bajo el bloqueo del pedido).

### Componentes clave

- **nOffer**: Una cadena de oferta de comerciante codificada en bech32 que contiene la clave publica Nostr del comerciante, la URL del relay y el ID de la oferta
- **Cifrado NIP-44**: Cifrado de extremo a extremo para solicitudes y respuestas de pago
- **Creacion de facturas**: Delegada al procesador Lightning configurado de be-BOP; crea una factura real + hash de pago, sin ir y venir por Nostr
- **Escuchador persistente**: Una suscripcion Nostr de larga duracion en el relay del comerciante que entrega bolt11 a las billeteras CLINK, sobreviviendo reconexiones del relay. El escuchador se inicia automaticamente al arrancar el servidor.

### Seguridad

- **Proteccion SSRF del relay**: Las URLs del relay se validan contra rangos de IP privados/internos antes de conectarse
- **Validacion BOLT11**: Las facturas deben llevar exactamente el monto esperado (sin tolerancia) y la red coincidente
- **Verificacion de firmas**: Todos los eventos Nostr entrantes se verifican antes de procesarlos
- **Filtro por clave publica del comerciante**: Los filtros de suscripcion Nostr usan la clave publica propia del comerciante (derivada de `NOSTR_PRIVATE_KEY`), no la clave de Lightning.Pub

## Billeteras compatibles

Cualquier billetera Lightning puede pagar el codigo QR bolt11. Para el flujo Nostr CLINK, use una billetera compatible con CLINK:

- ShockWallet
- ZEUS
- Otras billeteras compatibles con CLINK

## Solucion de problemas

### Factura no creada

- Verificar que un procesador Lightning este configurado y habilitado (por ejemplo, Blink, LND, PhoenixD)
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

- Verificar que el nodo Lightning backend sea alcanzable y que la factura se haya creado en el
- Usar el boton **Verificar estado del pago** en la pagina del pedido para activar manualmente una consulta al nodo
- El poller de pedidos vuelve a verificar cada 2 segundos; el settlement se aplica bajo el bloqueo del pedido

## Detalles tecnicos

- **Tipo de evento Nostr**: 21001
- **Cifrado**: NIP-44 (version 2)
- **Backend de facturas**: El procesador Lightning configurado de be-BOP (LND, Blink, PhoenixD…)
- **Deteccion de pago**: Busqueda respaldada por el nodo usando el hash de pago real, delegada al procesador backend de la factura
- **URL del relay CLINK**: `wss://strfry.shock.network` (configurable en Admin > CLINK)

## Settlement con nDebit

CLINK es **solo una capa de transporte** - **no requiere nDebit** para el settlement. El settlement de pagos es manejado completamente por el procesador Lightning predeterminado del comerciante (Blink, LND, Phoenixd, etc.) a traves de la factura bolt11. El comerciante recibe sats en su backend Lightning existente.

Si un comerciante desea usar nDebit para settlements entre nodos (por ejemplo, con ShockWallet), esto se configura en su billetera, no en be-BOP.
