# Configurazione di PayPal

Questa sezione permette di configurare i parametri di pagamento tramite PayPal per il vostro be-BOP. È accessibile tramite **Admin** > **Payment Settings** > **Paypal**

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Campi di configurazione

### **1. Client ID**

- **Descrizione:** Identificativo univoco associato al vostro account PayPal.
- **Come ottenerlo:**
  - Accedete al vostro account PayPal.
  - Andate nella sezione delle applicazioni e API.
  - Copiate il `Client ID` corrispondente.

### **2. Secret**

- **Descrizione:** Chiave segreta utilizzata per l'autenticazione con PayPal.
- **Come ottenerla:**
  - Nello stesso spazio dove si trova il `Client ID`, copiate il campo `Secret`.

### **3. Sandbox Mode**

- **Descrizione:** Selezionate questa casella se le credenziali fornite sono per l'ambiente di test (sandbox) di PayPal.
- **Valori possibili:**
  - [x] Attivato (Test nell'ambiente sandbox)
  - [ ] Disattivato (Ambiente di produzione)

### **4. Currency**

- **Descrizione:** Definite la valuta predefinita utilizzata per i pagamenti PayPal.
- **Esempio:** `EUR` (Euro)
- **Opzioni disponibili:**

  | Simbolo | Descrizione                              |
  | ------- | ---------------------------------------- |
  | `BTC`   | Bitcoin                                  |
  | `CHF`   | Franco svizzero                          |
  | `EUR`   | Euro                                     |
  | `USD`   | Dollaro americano                        |
  | `ZAR`   | Rand sudafricano                         |
  | `SAT`   | Satoshi (unità più piccola di Bitcoin)   |
  | `XOF`   | Franco CFA dell'Africa Occidentale       |
  | `XAF`   | Franco CFA dell'Africa Centrale          |
  | `CDF`   | Franco congolese                         |

## Azioni

### **Save**

- Salva i parametri attuali nell'applicazione.

### **Reset**

- Reimposta tutti i campi del modulo ai valori predefiniti.

## Pagare con PayPal

Dopo aver configurato PayPal potete ricevere pagamenti con PayPal sul vostro be-BOP.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
