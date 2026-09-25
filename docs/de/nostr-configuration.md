# **NostR-Schnittstellendokumentation**

Zugänglich über **Admin** > **Node Management** > **Nostr**, dieser Bereich ermöglicht es Ihnen, Ihre Nostr-Nachrichten zu konfigurieren, um Benachrichtigungen an Ihre Kunden zu senden und Ihren Katalog zu teilen, damit Ihre Kunden über den Nostr-Bot bestellen können.

## Konfiguration

Um Ihre Nostr-Nachrichten zu konfigurieren, klicken Sie auf **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Kopieren Sie den Schlüssel und fügen Sie ihn wie folgt in Ihre **.env** ein:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Nach dem Speichern können Sie nun Benachrichtigungen mit Nostr senden.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Schlüssel**

- **Privater Schlüssel:** Ein einzigartiger privater Schlüssel, der oben im Bereich angezeigt wird. Dieser Schlüssel muss geschützt und niemals geteilt werden.

  - Beispiel: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Öffentlicher Schlüssel (NPUB):** Ein öffentlicher Schlüssel zur Identifikation Ihres NostR-Kontos.
  - Beispiel: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Zertifizieren-Schaltfläche**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Beschreibung:**
  - Eine Schaltfläche zum Zertifizieren oder Validieren Ihrer Schlüssel.

## **3. Nachricht senden**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Geben Sie den öffentlichen Schlüssel (NPUB) des Empfängers ein, an den die Nachricht gesendet werden soll.
  - Erwartetes Format: `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Textfeld zum Schreiben der zu sendenden Nachricht.

- **Senden-Schaltfläche:**
  - Drücken Sie diese Schaltfläche, um die Nachricht an den Empfänger zu übermitteln.

## **4. Metadaten abrufen**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Geben Sie einen öffentlichen Schlüssel (NPUB) ein, um die zugehörigen Metadaten abzurufen.

- **Get Metadata-Schaltfläche:**
  - Drücken Sie diese Schaltfläche, um Informationen zum angegebenen öffentlichen Schlüssel abzurufen und anzuzeigen.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Liste der aktiven Relays, mit denen Ihre Anwendung verbunden ist.

  - Beispiel:
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Jedes Relay hat ein 🗑️-Symbol zum Entfernen aus der Liste.

### **Ein Relay hinzufügen**

1. **Relay-Feld:**
   - Geben Sie die URL des neuen Relays im WebSocket-Format ein: `wss://new.relay.url`.
2. **"Update relay list"-Schaltfläche:**
   - Drücken Sie diese Schaltfläche, um das angegebene Relay zur bestehenden Liste hinzuzufügen.

## **6. Intro-Nachricht**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Beschreibung:**
  - Eine automatische Einführungsnachricht, die vom Nostr-Bot gesendet wird, wenn der Befehl nicht übereinstimmt.
- **Option "Disable Nostr-bot intro message":**
  - Aktivieren Sie dieses Kontrollkästchen, um das automatische Senden von Einführungsnachrichten zu deaktivieren.

## **7. Empfangene Nachrichten**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Beschreibung:** Liste der von verbundenen Relays empfangenen Nachrichten.
  - Zeigt die folgenden Informationen an:
    - 📅 **Datum und Uhrzeit**
    - 🆔 **Öffentlicher Schlüssel (NPUB)** des Absenders
    - ✉️ **Nachrichteninhalt**
  - Beispiel:
    - **26/11/2024, 10:59:23**
      - Öffentlicher Schlüssel: `npub1ncecgaxk4l70594uq...`
      - Nachricht: `!Catalog`
    - **04/11/2024, 13:22:21**
      - Öffentlicher Schlüssel: `npub1qh8fj9wqc7lw5z37g...`
      - Nachricht: `Hello`

## Nostr-Bot

Sie haben nun die Möglichkeit, mit dem Nostr-Bot zu interagieren, indem Sie Befehle an Ihre Nostr-Adresse senden.
Um die Liste der Befehle zu erhalten, geben Sie `!help` ein.

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
