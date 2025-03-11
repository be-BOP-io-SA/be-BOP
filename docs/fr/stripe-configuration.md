# Configuration de Stripe pour l'application be-bop

Pour intégrer Stripe comme méthode de paiement dans votre application **be-bop** accedez à **Admin** > **Payment Settings** > **Stripe**.

![Capture d’écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Paramètres de Configuration

### 1. Secret Key

- **Description** : Votre clé secrète Stripe.
- **Emplacement** : À entrer dans le champ **Secret Key** dans les paramètres de configuration.
- **Exemple** : `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Description** : Votre clé publique Stripe.
- **Emplacement** : À entrer dans le champ **Public key**.
- **Exemple** : `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Description** : Devise utilisée pour les transactions Stripe dans votre application **be-bop**.
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

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Une fois ces étapes complétées, Stripe sera ajouté comme moyen de paiement sur votre plateforme.
