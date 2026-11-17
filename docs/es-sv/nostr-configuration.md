# **Documentación de la Interfaz NostR**

Accesible a través de **Admin** > **Node Management** > **Nostr**, esta sección permite configurar la mensajería Nostr para enviar notificaciones a sus clientes y compartir su catálogo para que los clientes puedan realizar pedidos a través del bot Nostr.

## Configuración

Para configurar la mensajería Nostr, haga clic en **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Copie la clave y agréguela a su **.env** de la siguiente manera:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Después de guardar, podrá enviar notificaciones con Nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Keys**

- **Private Key:** Una clave privada única mostrada en la parte superior de la sección. Esta clave debe ser protegida y nunca compartida.
  - Ejemplo: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Public Key (NPUB):** Una clave pública utilizada para identificar su cuenta NostR.
  - Ejemplo: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Certify Button**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Descripción:** Un botón para certificar o validar sus claves.

## **3. Send Message Section**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:** Ingrese la clave pública (NPUB) del destinatario. Formato esperado: `npubXXXXXXXXXXXXXXXXXXXXXXX`.
- **Message:** Campo de texto para escribir el mensaje a enviar.
- **Send Button:** Presione este botón para transmitir el mensaje al destinatario.

## **4. Get Metadata Section**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:** Ingrese una clave pública (NPUB) para recuperar sus metadatos asociados.
- **Get Metadata Button:** Presione este botón para recuperar y mostrar la información relacionada con la clave pública especificada.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Lista de relays activos a los que su aplicación está conectada.
  - Ejemplo: `wss://nostr.wine`, `wss://nostr.lu.ke`, `wss://nos.lol`, `wss://relay.snort.social`
- Cada relay tiene un ícono 🗑️ para eliminarlo de la lista.

### **Agregar un Relay**

1. **Campo Relay:** Ingrese la URL del nuevo relay en formato WebSocket: `wss://new.relay.url`.
2. **Botón "Update relay list":** Presione este botón para agregar el relay especificado a la lista existente.

## **6. Intro Message**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Descripción:** Un mensaje de introducción automático enviado por el bot Nostr cuando el comando no coincide.
- **Opción "Disable Nostr-bot intro message":** Marque esta casilla para desactivar el envío automático de mensajes de introducción.

## **7. Received Messages**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Descripción:** Lista de mensajes recibidos desde los relays conectados.
  - Muestra: 📅 **Fecha y Hora**, 🆔 **Clave pública (NPUB)** del remitente, ✉️ **Contenido del mensaje**

## Nostr-bot

Ahora tiene la capacidad de interactuar con el bot Nostr enviando comandos a su dirección Nostr. Para obtener la lista de comandos, escriba `!help`.

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
