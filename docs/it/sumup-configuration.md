# Configurazione SumUp per l'Applicazione be-BOP

Per integrare SumUp come metodo di pagamento nella vostra applicazione **be-BOP**, andare su **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Impostazioni di Configurazione

### 1. API Key

- **Descrizione**: Chiave API fornita da SumUp per autenticare le transazioni.
- **Posizione**: Inserirla nel campo **API Key** nelle impostazioni di configurazione.
- **Esempio**: `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Descrizione**: Codice univoco di identificazione del commerciante fornito da SumUp.
- **Posizione**: Inserirlo nel campo **Merchant Code**.
- **Esempio**: `YOUR_MERCHANT_CODE`

### 3. Currency

- **Descrizione**: Valuta utilizzata per le transazioni SumUp nella vostra applicazione **be-BOP**.
- **Posizione**: Inserirla nel campo **Currency**.
- **Valori possibili**:

  | Simbolo | Descrizione                             |
  | ------- | --------------------------------------- |
  | `BTC`   | Bitcoin                                 |
  | `CHF`   | Franco svizzero                         |
  | `EUR`   | Euro                                    |
  | `USD`   | Dollaro americano                       |
  | `ZAR`   | Rand sudafricano                        |
  | `SAT`   | Satoshi (unità più piccola di Bitcoin)  |
  | `XOF`   | Franco CFA dell'Africa Occidentale      |
  | `XAF`   | Franco CFA dell'Africa Centrale         |
  | `CDF`   | Franco congolese                        |

- **Esempio**: `EUR`

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Pagamento con Carta

Dopo la configurazione, potrete ora ricevere pagamenti con carta.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
