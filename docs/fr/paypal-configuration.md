# Configuration de PayPal

Cette section permet de configurer les paramètres de paiement via PayPal pour votre be-bop. Elle est accessible via **Admin** > **Payment Settings** > **Paypal**

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Champs de configuration

### **1. Client ID**

- **Description :** Identifiant unique associé à votre compte PayPal.
- **Comment l'obtenir :**
  - Connectez-vous à votre compte PayPal.
  - Allez dans la section des applications et API.
  - Copiez le `Client ID` correspondant.

### **2. Secret**

- **Description :** Clé secrète utilisée pour l'authentification avec PayPal.
- **Comment l'obtenir :**
  - Dans le même espace où se trouve le `Client ID`, copiez le champ `Secret`.

### **3. Sandbox Mode**

- **Description :** Cochez cette case si les identifiants fournis sont pour l'environnement de test (sandbox) de PayPal.
- **Valeurs possibles :**
  - [x] Activé (Test dans l'environnement sandbox)
  - [ ] Désactivé (Environnement de production)

### **4. Currency**

- **Description :** Définissez la devise par défaut utilisée pour les paiements PayPal.
- **Exemple :** `EUR` (Euros)
- **Options disponibles :**

  | Symbole | Description                            |
  | ------- | -------------------------------------- |
  | `BTC`   | Bitcoin                                |
  | `CHF`   | Franc suisse                           |
  | `EUR`   | Euro                                   |
  | `USD`   | Dollar américain                       |
  | `ZAR`   | Rand sud-africain                      |
  | `SAT`   | Satoshi (plus petite unité de Bitcoin) |
  | `XOF`   | Franc CFA Ouest-Africain               |
  | `XAF`   | Franc CFA Afrique Centrale             |
  | `CDF`   | Franc congolais                        |

## Actions

### **Save**

- Enregistre les paramètres actuels dans l'application.

### **Reset**

- Réinitialise tous les champs du formulaire à leurs valeurs par défaut.

## Payer avec paypal

Apres avoir configurer paypal vous pouvez recevoir des paiements avec paypal sur votre be-bop.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
