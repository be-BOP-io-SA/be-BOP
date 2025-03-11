# Configuration de SumUp pour l'application be-bop

Pour intégrer SumUp comme méthode de paiement dans votre application **be-bop** accedez à **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Paramètres de Configuration

### 1. API Key

- **Description** : Clé API fournie par SumUp pour authentifier les transactions.
- **Emplacement** : À entrer dans le champ **API Key** dans les paramètres de configuration.
- **Exemple** : `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Description** : Code unique d'identification du marchand fourni par SumUp.
- **Emplacement** : À entrer dans le champ **Merchant Code**.
- **Exemple** : `YOUR_MERCHANT_CODE`

### 3. Currency

- **Description** : Devise utilisée pour les transactions SumUp dans votre application **be-bop**.
- **Emplacement** : À entrer dans le champ **Currency**.
- **Valeurs possibles** :

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

- **Exemple** : `EUR`

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Payer ave cart bancaire

Aprés avoir configuré vous pouvez maintenant recevoir des paiements avec Carte Bancaire.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
