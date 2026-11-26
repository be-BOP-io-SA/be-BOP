# **NostR Interface Documentation**

Accessible via **Admin** > **Node Management** > **Nostr**, this section allows you to configure your Nostr messaging to send notifications to your customers and share your catalog so your customers can order via the Nostr bot.

## Configuration

To configure your Nostr messaging, click on **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Copy the key and add it to your **.env** as follows:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

After saving, you will now be able to send notifications with Nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Keys**

- **Private Key:** A unique private key displayed at the top of the section. This key must be protected and never shared.

  - Example: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Public Key (NPUB):** A public key used to identify your NostR account.
  - Example: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Certify Button**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Description:**
  - A button to certify or validate your keys.

## **3. Send Message Section**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Enter the public key (NPUB) of the recipient to whom the message should be sent.
  - Expected format: `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Text field to write the message to send.

- **Send Button:**
  - Press this button to transmit the message to the recipient.

## **4. Get Metadata Section**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Enter a public key (NPUB) to retrieve its associated metadata.

- **Get Metadata Button:**
  - Press this button to retrieve and display information related to the specified public key.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- List of active relays to which your application is connected.

  - Example:
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Each relay has a 🗑️ icon to remove it from the list.

### **Adding a Relay**

1. **Relay field:**
   - Enter the URL of the new relay in WebSocket format: `wss://new.relay.url`.
2. **"Update relay list" button:**
   - Press this button to add the specified relay to the existing list.

## **6. Intro Message**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Description:**
  - An automatic introduction message sent by the Nostr bot when the command doesn't match.
- **Option "Disable Nostr-bot intro message":**
  - Check this box to disable the automatic sending of introduction messages.

## **7. Received Messages**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Description:** List of messages received from connected relays.
  - Displays the following information:
    - 📅 **Date and Time**
    - 🆔 **Public key (NPUB)** of the sender
    - ✉️ **Message content**
  - Example:
    - **26/11/2024, 10:59:23**
      - Public key: `npub1ncecgaxk4l70594uq...`
      - Message: `!Catalog`
    - **04/11/2024, 13:22:21**
      - Public key: `npub1qh8fj9wqc7lw5z37g...`
      - Message: `Hello`

## Nostr-bot

You now have the ability to interact with the Nostr bot by sending commands to your Nostr address.
To get the list of commands, type `!help`.

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
