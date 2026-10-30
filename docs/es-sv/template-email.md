# Configuración de Plantillas de Correo Electrónico

Accesible a través de **Admin** > **Config** > **Templates**, esta sección permite configurar las plantillas para los correos electrónicos enviados por su be-BOP.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Lista de Plantillas

| Template                              | Descripción                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| passwordReset                         | El correo enviado al restablecer la contraseña                                     |
| temporarySessionRequest               | El correo enviado al solicitar una sesión temporal                                 |
| order.payment.expired                 | Correo de notificación de orden expirada                                           |
| order.payment.canceled                | Correo de notificación de orden cancelada                                          |
| order.payment.paid                    | Correo de notificación de orden completamente pagada                               |
| order.payment.pending.{paymentMethod} | Correo de notificación de pago pendiente de una orden a pagar con paymentMethod    |

## Configuración de Plantillas

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Cada plantilla contiene los campos:
- **Subject**: El asunto del correo electrónico.
- **HTML body**: Usando etiquetas HTML, este es el contenido del correo.

Dos botones:
- **Update**: Para cambiar la plantilla y guardar.
- **reset to default**: Para volver a la plantilla predeterminada.

Puede contener las siguientes etiquetas:
- Todas: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` y `{{bic}}`
- Tipos de orden: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
