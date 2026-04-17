# Configuratie van SumUp voor de be-BOP-applicatie

Om SumUp te integreren als betaalmethode in uw **be-BOP**-applicatie, gaat u naar **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Configuratieparameters

### 1. API Key

- **Beschrijving**: API-sleutel verstrekt door SumUp om transacties te authenticeren.
- **Locatie**: In te voeren in het veld **API Key** in de configuratie-instellingen.
- **Voorbeeld**: `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Beschrijving**: Unieke identificatiecode van de handelaar verstrekt door SumUp.
- **Locatie**: In te voeren in het veld **Merchant Code**.
- **Voorbeeld**: `YOUR_MERCHANT_CODE`

### 3. Currency

- **Beschrijving**: Valuta die wordt gebruikt voor SumUp-transacties in uw **be-BOP**-applicatie.
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

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Betalen met bankkaart

Na configuratie kunt u nu betalingen ontvangen met bankkaart.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
