# Configurazione Stripe per l'Applicazione be-BOP

Per integrare Stripe come metodo di pagamento nella vostra applicazione **be-BOP**, andare su **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Impostazioni di Configurazione

### 1. Secret Key

- **Descrizione**: La vostra chiave segreta Stripe.
- **Posizione**: Inserirla nel campo **Secret Key** nelle impostazioni di configurazione.
- **Esempio**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Descrizione**: La vostra chiave pubblica Stripe.
- **Posizione**: Inserirla nel campo **Public key**.
- **Esempio**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Descrizione**: Valuta utilizzata per le transazioni Stripe nella vostra applicazione **be-BOP**.
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

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Una volta completati questi passaggi, Stripe sarà aggiunto come metodo di pagamento sulla vostra piattaforma.
