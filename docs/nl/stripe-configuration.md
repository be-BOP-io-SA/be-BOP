# Configuratie van Stripe voor de be-BOP-applicatie

Om Stripe te integreren als betaalmethode in uw **be-BOP**-applicatie, gaat u naar **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Configuratieparameters

### 1. Secret Key

- **Beschrijving**: Uw geheime Stripe-sleutel.
- **Locatie**: In te voeren in het veld **Secret Key** in de configuratie-instellingen.
- **Voorbeeld**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Beschrijving**: Uw publieke Stripe-sleutel.
- **Locatie**: In te voeren in het veld **Public key**.
- **Voorbeeld**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Beschrijving**: Valuta die wordt gebruikt voor Stripe-transacties in uw **be-BOP**-applicatie.
- **Locatie**: In te voeren in het veld **Currency**.
- **Mogelijke waarden**:

  | Symbool | Beschrijving                         |
  | ------- | ------------------------------------ |
  | `BTC`   | Bitcoin                              |
  | `CHF`   | Zwitserse frank                      |
  | `EUR`   | Euro                                 |
  | `USD`   | Amerikaanse dollar                   |
  | `ZAR`   | Zuid-Afrikaanse rand                  |
  | `SAT`   | Satoshi (kleinste eenheid van Bitcoin) |
  | `XOF`   | West-Afrikaanse CFA-frank            |
  | `XAF`   | Centraal-Afrikaanse CFA-frank        |
  | `CDF`   | Congolese frank                      |

- **Voorbeeld**: `EUR`

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Zodra deze stappen zijn voltooid, wordt Stripe toegevoegd als betaalmiddel op uw platform.
