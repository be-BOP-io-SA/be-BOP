# PayPal-Konfiguration

Dieser Bereich ermöglicht es Ihnen, die PayPal-Zahlungseinstellungen für Ihren be-BOP zu konfigurieren. Er ist zugänglich über **Admin** > **Payment Settings** > **Paypal**.

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Konfigurationsfelder

### **1. Client ID**

- **Beschreibung:** Eindeutiger Bezeichner, der mit Ihrem PayPal-Konto verknüpft ist.
- **So erhalten Sie ihn:**
  - Melden Sie sich bei Ihrem PayPal-Konto an.
  - Gehen Sie zum Bereich Anwendungen und API.
  - Kopieren Sie die entsprechende `Client ID`.

### **2. Secret**

- **Beschreibung:** Geheimer Schlüssel zur Authentifizierung bei PayPal.
- **So erhalten Sie ihn:**
  - Im gleichen Bereich, in dem sich die `Client ID` befindet, kopieren Sie das Feld `Secret`.

### **3. Sandbox Mode**

- **Beschreibung:** Aktivieren Sie dieses Kontrollkästchen, wenn die bereitgestellten Anmeldedaten für die PayPal-Testumgebung (Sandbox) bestimmt sind.
- **Mögliche Werte:**
  - [x] Aktiviert (Test in Sandbox-Umgebung)
  - [ ] Deaktiviert (Produktionsumgebung)

### **4. Currency**

- **Beschreibung:** Legen Sie die Standardwährung für PayPal-Zahlungen fest.
- **Beispiel:** `EUR` (Euro)
- **Verfügbare Optionen:**

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

## Aktionen

### **Speichern**

- Speichert die aktuellen Einstellungen in der Anwendung.

### **Zurücksetzen**

- Setzt alle Formularfelder auf ihre Standardwerte zurück.

## Zahlung mit PayPal

Nach der Konfiguration von PayPal können Sie PayPal-Zahlungen in Ihrem be-BOP empfangen.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
