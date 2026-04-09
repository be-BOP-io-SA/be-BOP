# Configurazione di Bitcoin Nodeless

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Questa pagina permette di configurare il modulo "Bitcoin nodeless" per generare indirizzi e monitorare i pagamenti Bitcoin mantenendo il controllo totale dei fondi sul proprio portafoglio.
È accessibile su **Admin** > **Payment Settings** > **Bitcoin nodeless**

---

## **Configurazione**

### **1. BIP Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Descrizione**: Standard BIP utilizzato per generare gli indirizzi Bitcoin.
- **Opzioni disponibili**:
  - `BIP 84` (attualmente, è l'unica opzione supportata).
- **Istruzioni**:
  - Se utilizzate un portafoglio compatibile, scegliete `BIP 84`.

---

### **2. Chiave pubblica (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Descrizione**: Una chiave pubblica nel formato `zpub` per le transazioni Bitcoin.
- **Istruzioni**:
  - Utilizzate un portafoglio come **Sparrow Wallet** per generare una chiave `zpub` o `vpub` (per testnet).
  - Assicuratevi che il percorso di derivazione sia:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Inserite la chiave nel campo.

---

### **3. Indice di derivazione**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Descrizione**: L'indice dell'indirizzo da generare.
- **Istruzioni**:
  - Per impostazione predefinita, inizia da `0` e si incrementa di `1` per ogni nuovo indirizzo generato.
  - **Non modificate questo valore** a meno che non sappiate cosa state facendo, potrebbe causare il riutilizzo di indirizzi o creare indirizzi che non verranno rilevati dal vostro wallet

---

### **4. URL di Mempool**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Descrizione**: URL dell'API Mempool per verificare i fondi in entrata sugli indirizzi generati.
- **Esempio predefinito**:
  - Testnet: `https://mempool.space/testnet`
- **Istruzioni**:
  - Se ospitate la vostra istanza Mempool, potete sostituire questo URL.
  - Per il testnet, aggiungete il suffisso `/testnet`.

---

## **Prossimi indirizzi generati**

I prossimi indirizzi generati a partire da questa configurazione sono visualizzati nella sezione **"Next addresses"**. Questi indirizzi sono basati sulla chiave pubblica e sull'indice di derivazione.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
