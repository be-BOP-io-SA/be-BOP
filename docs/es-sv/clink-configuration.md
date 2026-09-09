# Configuracion CLINK

CLINK (Common Lightning Interface for Nostr Keys) es un metodo de pago Lightning que utiliza el protocolo Nostr como capa de transporte. Permite a los comerciantes recibir pagos Lightning a traves de eventos Nostr cifrados de tipo 21001.

## Resumen

Cuando un cliente paga con CLINK:

1. Se crea una **factura bolt11** inmediatamente al realizar el pedido y se muestra como codigo QR
2. Cualquier billetera Lightning puede escanear y pagar la bolt11 directamente
3. Las billeteras compatibles con CLINK tambien pueden escanear el **nOffer** del comerciante y recibir la misma bolt11 a traves del relay Nostr
4. El settlement se detecta consultando al backend configurado del comerciante — su procesador Lightning de be-BOP o su nodo Lightning.Pub — por la factura

CLINK es **solo una capa de transporte**, no un backend Lightning. El backend que genera y liquida las facturas bolt11 se elige en **Admin > CLINK**:

- **Procesador Lightning de be-BOP** (predeterminado): la generacion de facturas y el settlement se delegan al procesador Lightning propio configurado de be-BOP (LND, Blink, PhoenixD, etc.) — el mismo nodo que respaldaria cualquier otro pago Lightning.
- **Nodo Lightning.Pub**: las facturas las genera su propio nodo Lightning.Pub a traves de su API HTTP (`POST /api/user/invoice/new`), y el settlement se consulta desde ese mismo nodo (`POST /api/user/payment/state`).

Ambas opciones producen un hash de pago real y un `checkPayment()` respaldado por el nodo, que concilia contra el backend que realmente recibio los sats.

## Prerrequisitos

- Una **clave privada Nostr** configurada en `.env.local` (formato nsec)
- Un procesador Lightning configurado y habilitado (por ejemplo, Blink, LND, PhoenixD) — requerido cuando se selecciona el backend **procesador de be-BOP**
- **O** un **endpoint y token** de Lightning.Pub para su propio nodo Lightning.Pub — requerido cuando se selecciona el backend **Lightning.Pub**
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
- **Backend Lightning**: Elegir **Procesador Lightning de be-BOP** (LND, Blink, PhoenixD…) o **Nodo Lightning.Pub** — este ultimo tambien requiere su endpoint y token de API a continuacion.
- Hacer clic en **Save**, luego en **Test connection** para verificar que el relay y el nOffer funcionan correctamente

### 3. Activar CLINK como metodo de pago

En la pagina **Config**, bajo **Metodos de pago**, activar **Lightning** y establecer el procesador Lightning predeterminado en **CLINK**. El backend seleccionado tambien debe estar configurado y habilitado: un procesador Lightning para el backend de procesador de be-BOP, o su endpoint + token de Lightning.Pub para el backend de Lightning.Pub.

## Como funciona

### Flujo de pago

1. **El cliente realiza el pedido** -> be-BOP genera una bolt11 (con un hash de pago real) en el backend seleccionado — su procesador Lightning configurado o el nodo Lightning.Pub
2. **Codigo QR mostrado** -> La factura bolt11 se presenta al cliente
3. **Flujo de billetera CLINK** -> Las billeteras compatibles con CLINK solicitan la factura via Nostr (kind 21001); la bolt11 se devuelve cifrada (NIP-44)
4. **El cliente paga** -> Escanea el QR (o usa su billetera CLINK) con cualquier billetera Lightning y paga
5. **Pedido confirmado** -> El poller de pedidos de be-BOP llama a `checkPayment()`, que consulta el backend seleccionado por la factura usando su hash de pago real (el nodo Lightning.Pub via `POST /api/user/payment/state`); el pedido se marca como pagado

### Protocolo CLINK

El protocolo CLINK utiliza el evento Nostr tipo 21001 con cifrado NIP-44:

- **Solicitud** (cliente -> servidor): El cliente envia una solicitud de pago cifrada con el monto
- **Respuesta** (servidor -> cliente): El servidor responde con la factura bolt11 cifrada
- **Settlement**: El cliente paga la factura bolt11 via Lightning estandar; el nodo Lightning del comerciante detecta el pago

### Deteccion de pago

La deteccion de pago esta respaldada por el nodo. `checkPayment()` redirige al backend registrado por pago (`meta.backend`):

- **Procesador de be-BOP**: el `checkPayment` del procesador backend de la factura consulta ese nodo por la factura usando el hash de pago.
- **Lightning.Pub**: el nodo Lightning.Pub del comerciante se consulta via `POST /api/user/payment/state` (usando la bolt11 registrada); reporta el monto realmente recibido y la marca de tiempo del settlement — nunca un eco del monto esperado.

**No hay dependencia de recibos Nostr**: el settlement se verifica contra el nodo que realmente recibio los sats, por lo que el flujo es stateless y seguro en multiples procesos.

Un boton **Verificar estado del pago** esta disponible en los pedidos CLINK pendientes; solo vuelve a ejecutar esta verificacion respaldada por el nodo (el settlement lo aplica el poller de pedidos bajo el bloqueo del pedido).

### Componentes clave

- **nOffer**: Una cadena de oferta de comerciante codificada en bech32 que contiene la clave publica Nostr del comerciante, la URL del relay y el ID de la oferta
- **Cifrado NIP-44**: Cifrado de extremo a extremo para solicitudes y respuestas de pago
- **Creacion de facturas**: Generada en el backend seleccionado (el procesador Lightning de be-BOP o la API HTTP del nodo Lightning.Pub) — una factura real + hash de pago, sin ir y venir por Nostr
- **Escuchador persistente**: Una suscripcion Nostr de larga duracion en el relay del comerciante que entrega bolt11 a las billeteras CLINK, sobreviviendo reconexiones del relay. El escuchador se inicia automaticamente al arrancar el servidor.

### Seguridad

- **Proteccion SSRF del relay**: Las URLs del relay se validan contra rangos de IP privados/internos antes de conectarse
- **Proteccion SSRF del endpoint de Lightning.Pub**: El endpoint de la API de Lightning.Pub se valida contra rangos de IP privados/internos antes de cada llamada de generacion y settlement
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

- Verificar que el backend seleccionado este configurado y habilitado: un procesador Lightning para el backend de procesador de be-BOP, o endpoint + token de Lightning.Pub para el backend de Lightning.Pub
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
- **Backend de facturas**: Seleccionable — el procesador Lightning de be-BOP (LND, Blink, PhoenixD…) o el nodo Lightning.Pub del comerciante via su API HTTP
- **Deteccion de pago**: Busqueda respaldada por el nodo usando el hash de pago real — via el procesador de la factura, o via `POST /api/user/payment/state` en el nodo Lightning.Pub
- **URL del relay CLINK**: `wss://strfry.shock.network` (configurable en Admin > CLINK)

## Settlement con nDebit

CLINK es **solo una capa de transporte** - **no requiere nDebit** para el settlement. El settlement de pagos es manejado completamente por el backend seleccionado (el procesador Lightning de be-BOP o el nodo Lightning.Pub) a traves de la factura bolt11. El comerciante recibe sats en su backend Lightning existente.

Si un comerciante desea usar nDebit para settlements entre nodos (por ejemplo, con ShockWallet), esto se configura en su billetera, no en be-BOP.
