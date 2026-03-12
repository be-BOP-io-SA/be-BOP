# Documentación del widget de formulario de contacto

Accesible a través de **Admin** > **Widgets** > **Form**, los widgets de formulario pueden usarse en tu be-BOP para integrar formularios de contacto en zonas o páginas CMS.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Agregar un formulario de contacto

Para agregar un formulario de contacto, haz clic en **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Información básica

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: El nombre del formulario de contacto.
- **Slug**: Identificador único para el formulario de contacto.

### Información del formulario de contacto

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Permite al propietario de la tienda establecer una dirección de correo electrónico o npub de destino para las notificaciones de contacto; si no se completa, el valor predeterminado será el correo electrónico de contacto de la identidad.
- **Display from: field**: Cuando está marcado, muestra el campo del remitente (From:) en el formulario de contacto. Se acompaña de una casilla **Prefill with session information** que, cuando está marcada, pre-llena el campo "from" con la información de la sesión.
- **Add a warning to the form with mandatory agreement**: Agrega una casilla de verificación obligatoria para mostrar un mensaje de acuerdo antes de enviar el formulario de contacto.
  - **Disclaimer label**: Un título para el mensaje de acuerdo.
  - **Disclaimer Content**: El texto del mensaje de acuerdo.
  - **Disclaimer checkbox label**: El texto para la casilla del mensaje de acuerdo.
- **Subject**: El asunto del formulario de contacto.
- **Content**: El contenido del formulario de contacto.

Para asuntos y contenidos, puedes usar las siguientes etiquetas en el texto:

`{{productLink}}` y `{{productName}}` cuando se usa en una página de producto.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` y `{{pageName}}` cuando se usa en cualquier otro lugar.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## Integración CMS

Para integrar tu formulario de contacto en una zona o página CMS, agrégalo de la siguiente manera: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

Y tu formulario de contacto se mostrará a tus usuarios de la siguiente manera.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
