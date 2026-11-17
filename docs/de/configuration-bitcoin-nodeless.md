# Bitcoin Nodeless-Konfiguration

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Diese Seite ermöglicht es Ihnen, das Modul "Bitcoin nodeless" zu konfigurieren, um Adressen zu generieren und Bitcoin-Zahlungen zu verfolgen, während Sie die volle Kontrolle über die Gelder in Ihrer eigenen Wallet behalten.
Sie ist zugänglich über **Admin** > **Payment Settings** > **Bitcoin nodeless**.

---

## **Konfiguration**

### **1. BIP-Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Beschreibung**: BIP-Standard zur Generierung von Bitcoin-Adressen.
- **Verfügbare Optionen**:
  - `BIP 84` (derzeit die einzige unterstützte Option).
- **Anweisungen**:
  - Wenn Sie eine kompatible Wallet verwenden, wählen Sie `BIP 84`.

---

### **2. Öffentlicher Schlüssel (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Beschreibung**: Ein öffentlicher Schlüssel im `zpub`-Format für Bitcoin-Transaktionen.
- **Anweisungen**:
  - Verwenden Sie eine Wallet wie **Sparrow Wallet**, um einen `zpub`- oder `vpub`-Schlüssel (für Testnet) zu generieren.
  - Stellen Sie sicher, dass der Ableitungspfad wie folgt lautet:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Geben Sie den Schlüssel in das Feld ein.

---

### **3. Ableitungsindex**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Beschreibung**: Der Index der zu generierenden Adresse.
- **Anweisungen**:
  - Beginnt standardmäßig bei `0` und wird für jede neue generierte Adresse um `1` erhöht.
  - **Ändern Sie diesen Wert nicht**, es sei denn, Sie wissen, was Sie tun - dies könnte zu Adresswiederverwendung führen oder Adressen erstellen, die von Ihrer Wallet nicht erkannt werden.

---

### **4. Mempool URL**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Beschreibung**: Mempool API URL zur Überprüfung eingehender Gelder auf generierten Adressen.
- **Standardbeispiel**:
  - Testnet: `https://mempool.space/testnet`
- **Anweisungen**:
  - Wenn Sie Ihre eigene Mempool-Instanz hosten, können Sie diese URL ersetzen.
  - Für Testnet fügen Sie das Suffix `/testnet` hinzu.

---

## **Nächste generierte Adressen**

Die nächsten Adressen, die aus dieser Konfiguration generiert werden, werden im Abschnitt **"Next addresses"** angezeigt. Diese Adressen basieren auf dem öffentlichen Schlüssel und dem Ableitungsindex.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
