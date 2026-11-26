# **Documentazione Interfaccia NostR**

Accessibile su **Admin** > **Node Management** > **Nostr**, questa sezione permette di configurare la vostra messaggistica Nostr per inviare notifiche ai vostri clienti e condividere il vostro catalogo affinché i clienti possano ordinare tramite nostr-bot.

## Configurazione

Per configurare la vostra messaggistica Nostr cliccate su **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Copiate la chiave e aggiungetela nel vostro **.env** come segue:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Dopo il salvataggio potrete ora inviare notifiche con Nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Keys**

- **Private Key:** Una chiave privata univoca visualizzata in cima alla sezione. Questa chiave deve essere protetta e mai condivisa.

  - Esempio: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Public Key (NPUB):** Una chiave pubblica utilizzata per identificare il vostro account NostR.
  - Esempio: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Certify Button**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Descrizione:**
  - Un pulsante per certificare o validare le vostre chiavi.

## **3. Send Message Section**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Inserite la chiave pubblica (NPUB) del destinatario a cui il messaggio deve essere inviato.
  - Formato previsto: `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Campo di testo per scrivere il messaggio da inviare.

- **Send Button:**
  - Premete questo pulsante per trasmettere il messaggio al destinatario.

## **4. Get Metadata Section**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Inserite una chiave pubblica (NPUB) per recuperare i metadati associati.

- **Get Metadata Button:**
  - Premete questo pulsante per recuperare e visualizzare le informazioni relative alla chiave pubblica specificata.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Lista dei relay attivi a cui la vostra applicazione è connessa.

  - Esempio:
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Ogni relay ha un'icona 🗑️ per rimuoverlo dalla lista.

### **Aggiungere un Relay**

1. **Campo Relay:**
   - Inserite l'URL del nuovo relay nel formato WebSocket: `wss://new.relay.url`.
2. **Pulsante "Update relay list":**
   - Premete questo pulsante per aggiungere il relay specificato alla lista esistente.

## **6. Intro Message**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Descrizione:**
  - Un messaggio di introduzione automatico inviato dal bot Nostr quando il comando non corrisponde.
- **Opzione "Disable Nostr-bot intro message":**
  - Selezionate questa casella per disabilitare l'invio automatico dei messaggi di introduzione.

## **7. Received Messages**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Descrizione:** Lista dei messaggi ricevuti dai relay connessi.
  - Visualizza le seguenti informazioni:
    - 📅 **Data e Ora**
    - 🆔 **Chiave pubblica (NPUB)** del mittente
    - ✉️ **Contenuto del messaggio**
  - Esempio:
    - **26/11/2024, 10:59:23**
      - Chiave pubblica: `npub1ncecgaxk4l70594uq...`
      - Messaggio: `!Catalog`
    - **04/11/2024, 13:22:21**
      - Chiave pubblica: `npub1qh8fj9wqc7lw5z37g...`
      - Messaggio: `Hello`

## Nostr-bot

Ora avrete la possibilità di interagire con il bot Nostr inviando comandi al vostro indirizzo Nostr.
Per avere la lista dei comandi digitate `!help`

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
