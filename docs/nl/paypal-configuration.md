# Configuratie van PayPal

In deze sectie kunt u de betalingsinstellingen via PayPal configureren voor uw be-BOP. De sectie is toegankelijk via **Admin** > **Payment Settings** > **Paypal**

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Configuratievelden

### **1. Client ID**

- **Beschrijving:** Unieke identificatie die aan uw PayPal-account is gekoppeld.
- **Hoe te verkrijgen:**
  - Log in op uw PayPal-account.
  - Ga naar de sectie applicaties en API.
  - Kopieer de bijbehorende `Client ID`.

### **2. Secret**

- **Beschrijving:** Geheime sleutel die wordt gebruikt voor authenticatie met PayPal.
- **Hoe te verkrijgen:**
  - Kopieer in dezelfde ruimte waar de `Client ID` staat het veld `Secret`.

### **3. Sandbox Mode**

- **Beschrijving:** Vink dit vakje aan als de opgegeven inloggegevens voor de testomgeving (sandbox) van PayPal zijn.
- **Mogelijke waarden:**
  - [x] Geactiveerd (Testen in de sandbox-omgeving)
  - [ ] Gedeactiveerd (Productieomgeving)

### **4. Currency**

- **Beschrijving:** Stel de standaardvaluta in die wordt gebruikt voor PayPal-betalingen.
- **Voorbeeld:** `EUR` (Euro's)
- **Beschikbare opties:**

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

## Acties

### **Save**

- Slaat de huidige instellingen op in de applicatie.

### **Reset**

- Zet alle formuliervelden terug naar hun standaardwaarden.

## Betalen met PayPal

Na het configureren van PayPal kunt u betalingen ontvangen met PayPal op uw be-BOP.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
