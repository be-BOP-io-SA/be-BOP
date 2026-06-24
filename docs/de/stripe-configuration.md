# Stripe-Konfiguration für die be-BOP-Anwendung

Um Stripe als Zahlungsmethode in Ihrer **be-BOP**-Anwendung zu integrieren, gehen Sie zu **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Konfigurationseinstellungen

### 1. Secret Key

- **Beschreibung**: Ihr geheimer Stripe-Schlüssel.
- **Ort**: Geben Sie ihn im Feld **Secret Key** in den Konfigurationseinstellungen ein.
- **Beispiel**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Beschreibung**: Ihr öffentlicher Stripe-Schlüssel.
- **Ort**: Geben Sie ihn im Feld **Public key** ein.
- **Beispiel**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Beschreibung**: Währung für Stripe-Transaktionen in Ihrer **be-BOP**-Anwendung.
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

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Sobald diese Schritte abgeschlossen sind, wird Stripe als Zahlungsmethode auf Ihrer Plattform hinzugefügt.
