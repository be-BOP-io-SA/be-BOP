# Introducción

Esta documentación tiene como objetivo ayudar a los propietarios de be-BOP a configurar el envío automático de correos electrónicos de la manera más simple y económica encontrada hasta la fecha.

Proveedores de correo electrónico probados hasta ahora que funcionan:
- Outlook.fr
- (más por venir)

Los que no funcionan (restricción DMARC):
- GMail
- Protonmail
- (más por venir)

No dudes en probar y hacernos saber si tus proveedores de correo electrónico funcionan o no en contact@be-bop.io

# Prefacio

Érase una vez, hubo una era maravillosa donde los propietarios de sitios web interactivos o tiendas en línea podían enviar libremente correos electrónicos automáticos de forma gratuita.
Era la época en que los proveedores de correo electrónico gratuitos permitían fácilmente el uso de una bandeja de entrada por una aplicación de terceros.
Era la época en que el SMTP transaccional estaba permitido y era gratuito.
Era la época en que la gente era feliz.
Era la época.
Pero un día la nación del Paywall decidió atacar...

Hoy en día, el SMTP transaccional, cuando no está estrictamente prohibido, está sujeto a un token SMTP ofrecido solo en un plan de negocio pagado, o depende de un tercero especializado en envío masivo de correos electrónicos, que requiere extensas configuraciones de zona DNS que excluyen a los usuarios regulares, quienes entonces deben recurrir a costosas agencias web para configurar un servicio que es inicialmente gratuito pero rápidamente se vuelve pagado.
Estas personas, que quizás solo necesitan notificar sobre una docena de órdenes en línea cada mes, quedaron entonces desamparadas...
Sus únicas opciones restantes eran:
- Suscribirse a un servicio de correo electrónico pagado
- Suscribirse a ciertos proveedores de dominio específicos que también ofrecen correo electrónico
- Usar terceros complejos que requieren asistencia técnica o un tiempo de aprendizaje significativo
- Abandonar las notificaciones por correo electrónico, y ser rechazados por sus primeros clientes debido a esta carencia

...y entonces llegó el equipo de be-BOP con smtp2go.

# Descripción

smtp2go es una plataforma de entrega de correo electrónico en la nube que permite enviar y rastrear correos electrónicos.
Aunque usar un tercero no es ideal, es el mejor compromiso encontrado hasta la fecha para personas que no tienen una cuenta de correo electrónico que autorice SMTP transaccional.
Al asociar smtp2go con una dirección de correo electrónico existente, y una simple verificación técnica de la cuenta de correo, smtp2go permite que be-BOP envíe correos electrónicos hasta 1,000/mes en su plan gratuito.

# Procedimiento

- Crea (o ten disponible) una dirección de correo electrónico accesible que recibirá los correos enviados por be-BOP a visitantes, clientes y empleados.
- Ve a https://smtp2go.com
- Haz clic en "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Ingresa tu dirección de correo electrónico (la que será usada por be-BOP o la tuya propia — pueden ser diferentes)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Ingresa tu información de identidad y negocio (la contraseña solo se solicita una vez, verifica bien tu entrada)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- Se te pedirá que valides tu dirección de correo electrónico:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Accede a tu bandeja de entrada, abre el mensaje de SMTP2GO y haz clic en el enlace de confirmación en el cuerpo del mensaje
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Tu cuenta ahora estará activada
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Luego verifica el remitente (botón verde "Add a verified sender") y elige la opción correcta "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Ingresa la dirección de correo electrónico que será usada por be-BOP y envía el formulario
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Si tu proveedor de correo electrónico no bloquea la opción, verás esta pantalla:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
También recibirás este mensaje por correo electrónico: necesitarás validarlo haciendo clic en el botón "Verify email@domain.com"
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
Sin embargo, si ves el siguiente mensaje, significa que tu proveedor de correo electrónico rechaza la asociación (probablemente porque ofrece SMTP transaccional como servicio pagado o bajo otras condiciones):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Una vez que el correo electrónico de verificación esté validado, tu remitente debería mostrarse así:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- En el menú de la izquierda, ve a "SMTP Users" y luego haz clic en "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Haz clic en "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO pre-llena el formulario con un usuario SMTP cuyo Username predeterminado es el dominio de tu dirección de correo de envío. Puedes dejarlo como está, o personalizarlo por razones de seguridad (y dado que el identificador debe ser único en SMTP2GO, un identificador demasiado simple ya estará tomado y será rechazado). Luego valida haciendo clic en el botón "Add SMTP User".
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- Luego puedes configurar be-BOP con la siguiente información y reiniciarlo:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=the_username_chosen_on_smtp2go
SMTP_PASSWORD=the_password_chosen_on_smtp2go
```

# Vigila tu configuración

Para evitar problemas de envío de correo electrónico, asegúrate de que la dirección de correo de envío sea la misma que la configurada en el back-office de be-BOP, en Admin > Config > Identity, bajo "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Aviso legal

- Más allá de 1,000 correos electrónicos enviados por mes, el envío de correos dejará de funcionar, y SMTP2GO te enviará una solicitud para actualizar a un plan pagado
- El software be-BOP no está de ninguna manera asociado o afiliado al servicio SMTP2GO
- be-bop.io no está de ninguna manera asociado o afiliado a smtp2go.com
- be-BOP.io SA no está de ninguna manera asociada o afiliada a SMTP2GO
- El equipo de be-BOP no proporciona soporte de SMTP2GO
- El equipo de be-BOP solo proporciona esta documentación para ayudar a sus usuarios y evitar que recurran a servicios pagados o complejos

Abajo los paywalls ✊
