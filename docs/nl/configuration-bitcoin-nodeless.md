# Configuratie van Bitcoin Nodeless

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Deze pagina stelt u in staat om de module "Bitcoin nodeless" te configureren voor het genereren van adressen en het volgen van Bitcoin-betalingen terwijl u de volledige controle over de fondsen op uw eigen wallet behoudt.
De pagina is toegankelijk via **Admin** > **Payment Settings** > **Bitcoin nodeless**

---

## **Configuratie**

### **1. BIP Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Beschrijving**: BIP-standaard die wordt gebruikt om Bitcoin-adressen te genereren.
- **Beschikbare opties**:
  - `BIP 84` (momenteel is dit de enige ondersteunde optie).
- **Instructies**:
  - Als u een compatibele wallet gebruikt, kies dan `BIP 84`.

---

### **2. Publieke sleutel (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Beschrijving**: Een publieke sleutel in `zpub`-formaat voor Bitcoin-transacties.
- **Instructies**:
  - Gebruik een wallet zoals **Sparrow Wallet** om een `zpub`- of `vpub`-sleutel (voor testnet) te genereren.
  - Zorg ervoor dat het afleidingspad is:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Voer de sleutel in het veld in.

---

### **3. Afleidingsindex**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Beschrijving**: De index van het te genereren adres.
- **Instructies**:
  - Begint standaard op `0` en wordt met `1` verhoogd voor elk nieuw gegenereerd adres.
  - **Wijzig deze waarde niet** tenzij u weet wat u doet; dit kan leiden tot hergebruik van adressen of het creeren van adressen die niet door uw wallet worden gedetecteerd.

---

### **4. Mempool URL**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Beschrijving**: URL van de Mempool API om inkomende fondsen op gegenereerde adressen te controleren.
- **Standaardvoorbeeld**:
  - Testnet: `https://mempool.space/testnet`
- **Instructies**:
  - Als u uw eigen Mempool-instantie host, kunt u deze URL vervangen.
  - Voeg voor testnet het achtervoegsel `/testnet` toe.

---

## **Volgende gegenereerde adressen**

De volgende adressen die op basis van deze configuratie worden gegenereerd, worden weergegeven in de sectie **"Next addresses"**. Deze adressen zijn gebaseerd op de publieke sleutel en de afleidingsindex.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
