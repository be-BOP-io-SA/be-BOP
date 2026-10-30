# **Documentatie Nostr-interface**

Toegankelijk via **Admin** > **Node Management** > **Nostr**, in deze sectie kunt u uw Nostr-berichtensysteem configureren om meldingen naar uw klanten te sturen en uw catalogus te delen zodat uw klanten via een Nostr-bot kunnen bestellen.

## Configuratie

Om uw Nostr-berichtensysteem te configureren, klikt u op **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Kopieer de sleutel en voeg deze toe aan uw **.env** als volgt:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Na opslaan kunt u nu meldingen versturen met Nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Keys**

- **Private Key:** Een unieke privesleutel die bovenaan de sectie wordt weergegeven. Deze sleutel moet worden beschermd en nooit worden gedeeld.

  - Voorbeeld: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Public Key (NPUB):** Een publieke sleutel die wordt gebruikt om uw Nostr-account te identificeren.
  - Voorbeeld: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Certify Button**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Beschrijving:**
  - Een knop om uw sleutels te certificeren of te valideren.

## **3. Bericht verzenden**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Voer de publieke sleutel (NPUB) in van de ontvanger aan wie het bericht moet worden verzonden.
  - Verwacht formaat: `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Tekstveld om het te verzenden bericht te schrijven.

- **Send Button:**
  - Druk op deze knop om het bericht naar de ontvanger te verzenden.

## **4. Metadata ophalen**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Voer een publieke sleutel (NPUB) in om de bijbehorende metadata op te halen.

- **Get Metadata Button:**
  - Druk op deze knop om de informatie die aan de opgegeven publieke sleutel is gekoppeld op te halen en weer te geven.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Lijst van actieve relays waarmee uw applicatie is verbonden.

  - Voorbeeld:
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Elk relay heeft een pictogram om dit relay uit de lijst te verwijderen.

### **Een relay toevoegen**

1. **Relay-veld:**
   - Voer de URL van het nieuwe relay in WebSocket-formaat in: `wss://new.relay.url`.
2. **Knop "Update relay list":**
   - Druk op deze knop om het opgegeven relay aan de bestaande lijst toe te voegen.

## **6. Intro Message**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Beschrijving:**
  - Een automatisch introductiebericht dat door de Nostr-bot wordt verzonden wanneer de bestelling niet overeenkomt.
- **Optie "Disable Nostr-bot intro message":**
  - Vink dit vakje aan om het automatisch verzenden van introductieberichten uit te schakelen.

## **7. Ontvangen berichten**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Beschrijving:** Lijst van ontvangen berichten van de verbonden relays.
  - Toont de volgende informatie:
    - Datum en tijd
    - Publieke sleutel (NPUB) van de afzender
    - Berichtinhoud
  - Voorbeeld:
    - **26/11/2024, 10:59:23**
      - Publieke sleutel: `npub1ncecgaxk4l70594uq...`
      - Bericht: `!Catalog`
    - **04/11/2024, 13:22:21**
      - Publieke sleutel: `npub1qh8fj9wqc7lw5z37g...`
      - Bericht: `Hello`

## Nostr-bot

U heeft nu de mogelijkheid om met de Nostr-bot te communiceren door commando's naar uw Nostr-adres te sturen.
Typ `!help` voor de lijst met commando's.

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
