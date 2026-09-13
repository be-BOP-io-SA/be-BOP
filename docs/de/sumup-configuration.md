# SumUp-Konfiguration für die be-BOP-Anwendung

Um SumUp als Zahlungsmethode in Ihrer **be-BOP**-Anwendung zu integrieren, gehen Sie zu **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Konfigurationseinstellungen

### 1. API Key

- **Beschreibung**: Von SumUp bereitgestellter API-Schlüssel zur Authentifizierung von Transaktionen.
- **Ort**: Geben Sie ihn im Feld **API Key** in den Konfigurationseinstellungen ein.
- **Beispiel**: `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Beschreibung**: Eindeutiger Händler-Identifikationscode, bereitgestellt von SumUp.
- **Ort**: Geben Sie ihn im Feld **Merchant Code** ein.
- **Beispiel**: `YOUR_MERCHANT_CODE`

### 3. Currency

- **Beschreibung**: Währung für SumUp-Transaktionen in Ihrer **be-BOP**-Anwendung.
- **Ort**: Geben Sie sie im Feld **Currency** ein.
- **Mögliche Werte**:

  | Symbol | Beschreibung                          |
  | ------ | ------------------------------------- |
  | `BTC`  | Bitcoin                               |
  | `CHF`  | Schweizer Franken                     |
  | `EUR`  | Euro                                  |
  | `USD`  | US-Dollar                             |
  | `ZAR`  | Südafrikanischer Rand                 |
  | `SAT`  | Satoshi (kleinste Einheit von Bitcoin)|
  | `XOF`  | Westafrikanischer CFA-Franc           |
  | `XAF`  | Zentralafrikanischer CFA-Franc        |
  | `CDF`  | Kongolesischer Franc                  |

- **Beispiel**: `EUR`

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Kartenzahlung

Nach der Konfiguration können Sie nun Kartenzahlungen empfangen.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
