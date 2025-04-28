# Documentación paso a paso de be-BOP ES 🇸🇻 (El Salvador)

# 1. Instalación y Acceso Inicial

**1.1. Instalación de be-BOP**

- **Prerrequisitos:**

    1. **Infraestructura Técnica:**

        - **Almacenamiento Compatible con S3:** Un servicio o solución (ej. MinIO, AWS S3, Scaleway, etc.) con configuración de bucket (S3_BUCKET, S3_ENDPOINT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_REGION).

        - **Base de Datos MongoDB en ReplicaSet:** Una instancia local configurada como ReplicaSet o el uso de un servicio como MongoDB Atlas (variables MONGODB_URL y MONGODB_DB).

        - **Entorno Node.js:** Node versión 18 o superior, con Corepack habilitado (`corepack enable`).

        - **Git LFS Instalado:** Para gestionar archivos grandes (comando `git lfs install`).

    2. **Configuración de Comunicaciones:**

        - **SMTP:** Credenciales SMTP válidas (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) para enviar correos electrónicos y notificaciones.

    3. **Seguridad y Notificaciones (al menos uno de los siguientes):**

        - **Correo Electrónico:** Una cuenta de correo que permita la configuración SMTP para enviar notificaciones.

        - **Clave Nostr (nsec):** Una clave NSEC (puede generarse mediante la interfaz Nostr de be-BOP).

    4. **Métodos de Pago Soportados:**

        - Al menos un método de pago soportado por be-BOP, como:

            - **Bitcoin (moneda de curso legal en El Salvador):** Priorizado debido a la adopción nacional.

            - Lightning Network (popular para transacciones rápidas en El Salvador).

            - PayPal.

            - SumUp.

            - Stripe.

            - Las transferencias bancarias y pagos en efectivo requieren validación manual.

    5. **Conocimiento del Régimen de IVA:**

        - Es crucial conocer el régimen de Impuesto al Valor Agregado (IVA) aplicable a tu negocio en El Salvador (13% estándar, exenciones para ciertos bienes o servicios, o ventas al exterior). Configura correctamente las opciones de facturación y cálculo del IVA en be-BOP.

    6. **Configuración de Monedas:**

        - Define claramente la moneda principal (Bitcoin o USD, ambas de curso legal en El Salvador), la moneda secundaria (si aplica) y, para una tienda 100% en BTC, la moneda de referencia para la contabilidad (generalmente USD para reportes).

    7. **Otros Prerrequisitos Empresariales:**

        - Tener una visión clara de los procesos de pedidos, gestión de inventario, políticas de costos de envío y métodos de pago y cobro, tanto en línea como en tienda física.

        - Conocer las obligaciones legales en El Salvador (aviso legal, términos de uso, política de privacidad) para configurar las páginas CMS obligatorias. En El Salvador, también asegúrate de cumplir con la Ley de Protección al Consumidor.

- **Instalación:** Implementa la aplicación utilizando el script de instalación oficial en tu servidor y verifica que todas las dependencias estén correctamente instaladas.

**1.2. Creación de la Cuenta de Superadministrador**

- Dirígete a **/admin/login**.

- Crea tu cuenta de superadministrador eligiendo un nombre de usuario y una contraseña seguros. Prefiere una frase de contraseña de tres o más palabras.

- Esta cuenta otorgará acceso a todas las funcionalidades del back-office.

---

# 2. Seguridad y Configuración del Back-Office

**2.1. Seguridad del Acceso**

- **Configuración del Hash de Acceso:**

    - Navega a **/admin/config** a través de la interfaz de administración.

    - En la sección dedicada a la seguridad (ej. “Admin hash”), establece una cadena única (hash).

    - Una vez guardado, la URL del back-office cambiará (ej. **/admin-tu-hash/login**) para restringir el acceso a usuarios autorizados.

**2.2. Habilitación del Modo de Mantenimiento (si es necesario)**

- En **/admin/config** (Config > Config a través de la interfaz gráfica), marca la opción **Habilitar modo de mantenimiento** al final de la página.

- Opcionalmente, especifica una lista de direcciones IPv4 autorizadas (separadas por comas) para permitir el acceso al front-office durante el mantenimiento.

- El back-office permanece accesible para los administradores.

**2.3. Configuración de Accesos de Recuperación vía Correo Electrónico o Nostr**

- En **/admin/config**, a través del módulo ARM, asegúrate de que la cuenta de superadministrador incluya una dirección de correo electrónico de recuperación o un npub para facilitar la recuperación de contraseñas.

**2.4. Configuración de Idioma o Configuraciones Multilingües**

- En **Admin > Config > Languages**, habilita o deshabilita el selector de idioma dependiendo de si tu sitio es multilingüe o monolingüe (desactívalo para un sitio en un solo idioma, probablemente español en El Salvador).

**2.5. Configuración de Diseño, Logotipos y Favicon**

- En **Admin > Merch > Layout**, configura la barra superior, la barra de navegación y el pie de página.

    - Asegúrate de habilitar la opción “Mostrar powered by be-BOP” en el pie de página.

    - Configura los logotipos para los temas claro y oscuro, así como el favicon, a través de **Admin > Merch > Pictures**.

---

# 3. Configuración de la Identidad del Vendedor

**3.1. Configuración de la Identidad**

- Dirígete a **/admin/identity** (Config > Identity a través de la interfaz gráfica) para ingresar toda la información relacionada con tu negocio:

    - **Nombre de la empresa**, **dirección postal**, **correo electrónico de contacto** utilizado para enviar facturas y comunicaciones oficiales.

    - **Información de facturación** (opcional) que aparecerá en la esquina superior derecha de las facturas.

- **Cuenta Bancaria:**

    - Para habilitar pagos por transferencia bancaria, proporciona tu IBAN y BIC (en El Salvador, las transferencias en USD o BTC son comunes).

**3.2. (Para Tiendas Físicas) Visualización de la Dirección de la Tienda**

- Para aquellos con una tienda física en El Salvador, duplica la configuración anterior en **/admin/identity** (o en una sección dedicada) agregando la dirección completa de la tienda para mostrarla en documentos oficiales y en el pie de página, si aplica.

---

# 4. Configuración de Monedas

**4.1. Definición de Monedas en /admin/config**

- **Moneda Principal:**

    - Esta moneda se muestra en el front-office y en las facturas (en El Salvador, suele ser BTC o USD).

- **Moneda Secundaria (opcional):**

    - Puede usarse para visualización o como alternativa (ej. USD si BTC es la principal).

- **Moneda de Referencia para Precios:**

    - Permite establecer precios en una moneda “estable” (generalmente USD en El Salvador).

    - Nota: Hacer clic en el botón de confirmación recalculará los precios de todos los productos sin alterar los montos ingresados.

- **Moneda de Contabilidad:**

    - Usada para rastrear tasas de cambio en un be-BOP completamente basado en Bitcoin, relevante en El Salvador debido a la adopción de BTC como moneda legal.

---

# 5. Configuración de Métodos de Pago

Puedes establecer la duración de un pago pendiente en el panel **Admin > Config**.

**5.1. Pagos con Bitcoin y Lightning**

- **Bitcoin Nodeless (Onchain):**

    - En **Admin > Payment Settings > Bitcoin nodeless**, configura el módulo seleccionando el estándar BIP (actualmente solo BIP84).

    - Ingresa la clave pública (en formato **zpub**) generada con una billetera compatible (ej. Sparrow Wallet, común en El Salvador).

    - No modifiques el índice de derivación, que comienza en 0 y se incrementa automáticamente.

    - Configura la URL de un explorador de bloques para verificar transacciones (ej. `https://mempool.space`).

- **PhoenixD para Lightning:**

    - Instala PhoenixD en tu servidor siguiendo las instrucciones en [https://phoenix.acinq.co/server/get-started](https://phoenix.acinq.co/server/get-started).

    - En **Admin > Payment Settings > PhoenixD**, proporciona la URL de tu instancia (si usas Docker, considera las especificidades de la red) y agrega la contraseña HTTP de PhoenixD. Si PhoenixD está instalado en el mismo servidor que be-BOP, haz clic en el botón **Detectar Servidor PhoenixD**.

**Para Usuarios Avanzados**

Es posible usar un nodo completo de Bitcoin y LND a través del archivo `.env` utilizando credenciales RPC (+TOR recomendado) para un nodo remoto. Alternativamente, puedes instalar Bitcoin Core y LND en la misma red local que tu be-BOP, una práctica común entre negocios en El Salvador que adoptan Bitcoin.

- **Bitcoin Core:**

    - En **Admin > Payment Settings > Bitcoin core node**.

- **Lightning LND:**

    - En **Admin > Payment Settings > Lightning LND node**.

**5.2. Pago con PayPal**

- En **Admin > Payment Settings > PayPal**, ingresa tu Client ID y Secret obtenidos desde tu cuenta de desarrollador de PayPal en [https://developer.paypal.com/api/rest/](https://developer.paypal.com/api/rest/).

- Marca **Estas credenciales son para el entorno sandbox** si deseas usar el modo Sandbox (para pruebas) o déjalo desmarcado para el modo de producción.

**5.3. Pago con SumUp**

- En **Admin > Payment Settings > SumUp**, ingresa tu API Key y Merchant Code en [https://developer.sumup.com/api](https://developer.sumup.com/api).

- La moneda utilizada corresponde a la moneda de tu cuenta SumUp (generalmente USD o BTC en El Salvador).

**5.4. Pago con Stripe**

- En **Admin > Payment Settings > Stripe**, ingresa tu Secret Key y Public Key en [https://docs.stripe.com/api](https://docs.stripe.com/api).

- La moneda utilizada corresponde a la moneda de tu cuenta Stripe (generalmente USD en El Salvador).

---

# 6. Gestión de Productos

**6.1. Creación de un Nuevo Producto**

- Dirígete a **Admin > Merch > Products** para agregar o editar un producto.

- **Información Básica:**

    - Ingresa el **Nombre del producto**, el **slug** (identificador único para la URL) y, si es necesario, un **alias** para simplificar la adición a través del campo dedicado en el carrito. Para productos vendidos en línea (no en Punto de Venta), no se requiere un alias.

- **Precios:**

    - Establece el precio en **Price Amount** y selecciona la moneda en **Price Currency**. También puedes crear productos gratuitos o de pago libre marcando las opciones **Este es un producto gratuito** y **Este es un producto de pago libre**, respectivamente.

    - **Opciones del Producto:**

        - Indica si el producto es independiente (adición única por pedido) o tiene variaciones (ej. una camiseta en S, M, L, XL no es independiente).

        - Para productos con variaciones, habilita la opción **El producto tiene variaciones ligeras (sin diferencia de inventario)** y agrega las variaciones (nombre, valor y diferencia de precio).

**6.2. Gestión de Inventario**

- Para productos con inventario limitado, marca **El producto tiene un inventario limitado** e ingresa la cantidad disponible.

- El sistema también muestra el inventario reservado (en pedidos pendientes) y el inventario vendido.

- Puedes ajustar la duración (en minutos) durante la cual un producto se considera reservado en un carrito pendiente en **Admin > Config**.

---

# 7. Creación y Personalización de Páginas CMS y Widgets

**7.1. Páginas CMS Obligatorias**

- Crea páginas esenciales en **Admin > Merch > CMS**, como:

    - `/home` (página de inicio),

    - `/error` (página de error),

    - `/maintenance` (página de mantenimiento),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (páginas legales e informativas obligatorias).

- Estas páginas proporcionan a los visitantes información legal, detalles de contacto y explicaciones sobre el funcionamiento de tu tienda. En El Salvador, incluye información sobre la aceptación de Bitcoin conforme a la ley.

- Puedes agregar tantas páginas adicionales como necesites.

**7.2. Diseño y Elementos Gráficos**

- Dirígete a **Admin > Merch > Layout** para personalizar la barra superior, la barra de navegación y el pie de página.

- Modifica los enlaces, logotipos (a través de **Admin > Merch > Pictures**) y la descripción de tu sitio.

**7.3. Integración de Widgets en Páginas CMS**

- Crea varios widgets en **Admin > Widgets**, como Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries y Leaderboards.

- Usa etiquetas específicas para integrar elementos dinámicos, por ejemplo:

    - Para mostrar un producto: `[Product=slug?display=img-1]`

    - Para mostrar una imagen: `[Picture=slug width=100 height=100 fit=contain]`

    - Para integrar un slider: `[Slider=slug?autoplay=3000]`

    - Para agregar un desafío, cuenta regresiva, formulario, etc., usa `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`, respectivamente.

---

# 8. Gestión de Pedidos y Reportes

**8.1. Seguimiento de Pedidos**

- En **Admin > Transaction > Orders**, visualiza la lista de pedidos.

- Usa los filtros disponibles (Número de Pedido, Alias de Producto, Método de Pago, Correo Electrónico, etc.) para refinar tu búsqueda.

- Puedes ver los detalles de un pedido (productos pedidos, información del cliente, dirección de envío) y gestionar el estado del pedido (confirmar, cancelar, agregar etiquetas, ver notas del pedido).

**8.2. Reportes y Exportación**

- Dirígete a **Admin > Config > Reporting** para ver estadísticas mensuales y anuales de pedidos, productos y pagos.

- Cada sección (Detalle de Pedido, Detalle de Producto, Detalle de Pago) incluye un botón **Exportar CSV** para descargar los datos.

---

# 9. Configuración de Mensajería Nostr (Opcional)

**9.1. Configuración de la Clave Nostr**

- En **Admin > Node Management > Nostr**, haz clic en **Crear una nsec** si aún no tienes una.  
    **NOTA:** Si ya generaste y configuraste tu nsec a través de un cliente Nostr y la agregaste a tu archivo `.env`, omite este paso.

- Copia la clave NSEC generada por ti o por be-BOP y agrégala a tu archivo **.env.local** bajo la variable `NOSTR_PRIVATE_KEY`.

**9.2. Funcionalidades Asociadas**

- Esta configuración permite enviar notificaciones a través de Nostr, activar el cliente administrativo ligero y ofrecer inicios de sesión sin contraseña mediante enlaces temporales.

---

# 10. Personalización de Diseño y Temas

- En **Admin > Merch > Theme**, crea un tema definiendo colores, fuentes y estilos para el encabezado, cuerpo, pie de página, etc.

- Una vez creado, aplícalo como el tema activo para tu tienda.

---

# 11. Configuración de Plantillas de Correo Electrónico

- Dirígete a **Admin > Config > Templates** para configurar las plantillas de correo electrónico (ej. para restablecer contraseñas, notificaciones de pedidos, etc.).

- Para cada plantilla, proporciona el **Asunto** y el **Cuerpo HTML**.

- Las plantillas admiten variables como `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}`, etc.

---

# Para Usuarios Avanzados...

# 12. Configuración de Etiquetas y Widgets Específicos

**12.1. Gestión de Etiquetas**

- En **Admin > Widgets > Tag**, crea etiquetas para organizar productos o enriquecer páginas CMS.

- Proporciona el **Nombre de la etiqueta**, el **slug**, selecciona la **Familia de Etiquetas** (Creators, Retailers, Temporal, Events) y completa los campos opcionales (título, subtítulo, contenido breve y completo, CTAs).

**12.2. Integración a través de CMS**

- Para integrar una etiqueta en una página, usa la sintaxis:  
    `[Tag=slug?display=var-1]`

# 13. Configuración de Archivos Descargables

**Agregar un Archivo**

- En **Admin > Merch > Files**, haz clic en **Nuevo archivo**.

- Proporciona el **nombre del archivo** (ej. “Manual del producto”) y carga el archivo a través del botón **Examinar…**.

- Una vez agregado, se genera un enlace permanente que puede usarse en páginas CMS para compartir el archivo.

# 14. Nostr-Bot

En la sección **Node Management > Nostr**, puedes configurar tu interfaz Nostr para enviar notificaciones e interactuar con clientes. Las opciones disponibles incluyen:

- Gestionar la lista de relés utilizados por tu bot Nostr.

- Habilitar o deshabilitar el mensaje de presentación automático enviado por el bot.

- Certificar tu npub asociándolo con un logotipo, nombre y dominio (alias Lightning BOLT12 para Zaps).

# 15. Sobreescritura de Etiquetas de Traducción

Aunque be-BOP está disponible en varios idiomas (inglés, francés, español, etc.), puedes personalizar las traducciones para adaptarlas a tus necesidades. Dirígete a **Config > Languages** para cargar y editar los archivos JSON de traducción. Estos archivos para cada idioma están disponibles en nuestro repositorio oficial en:  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations)

---

# PARTE 2: Trabajo en Equipo y POS

# 1. Gestión de Usuarios y Derechos de Acceso

**1.1. Creación de Roles**

- En **Admin > Config > ARM**, haz clic en **Crear un rol** para definir roles (ej. Superadministrador, Punto de Venta, Verificador de Boletos).

- Para cada rol, especifica:

    - Rutas para **acceso de escritura** y **acceso de lectura**.

    - Rutas restringidas a través de **Acceso prohibido**.

**1.2. Gestión de Usuarios**

- En **Admin > Users**, crea o edita usuarios proporcionando:

    - El **inicio de sesión**, **alias**, **correo electrónico de recuperación** y, si aplica, el **Recovery npub**.

    - Asigna el rol apropiado a cada usuario.

- Los usuarios con acceso de solo lectura verán los menús en cursiva y no podrán realizar cambios.

# 2. Configuración del Punto de Venta (POS) para Ventas en Tienda

**2.1. Asignación y Acceso al POS**

- Asigna el rol **Punto de Venta (POS)** a través de **Admin > Config > ARM** al usuario que gestiona la caja.

- Los usuarios de POS inician sesión a través de la página de identificación segura y son redirigidos a la interfaz dedicada (ej. **/pos** o **/pos/touch**).

**2.2. Funcionalidades Específicas del POS**

- **Adición Rápida mediante Alias:** En **/cart**, el campo de alias permite escanear un código de barras (ISBN, EAN13) para agregar el producto directamente.

- **Opciones de Pago del POS:**

    - Soporte para pagos multimodo (efectivo, tarjeta, Lightning, etc.), con énfasis en Bitcoin y Lightning en El Salvador.

    - Opciones para exención de IVA o descuentos de regalo con justificación gerencial obligatoria.

- **Visualización del Lado del Cliente:**

    - En una pantalla dedicada (ej. tableta o monitor externo a través de HDMI), muestra la página **/pos/session** para que los clientes sigan el progreso de su pedido.