# Configuration de Taler pour l'application be-bop

Pour intégrer Taler comme méthode de paiement dans votre application **be-bop** accedez à **Admin** > **Payment Settings** > **Taler**.

![image](https://github.com/user-attachments/assets/787589ec-6745-4fb7-975b-b95dd41c4f42)

## Paramètres de Configuration

### 1. Backend URL

- **Description** : Adresse de votre compte dans le merchant backend de Taler.
- **Emplacement** : À entrer dans le champ **Backend URL**.
- **Exemple** : `https://backend.demo.taler.net/instances/sandbox`

### 2. Backend API Key

- **Description** : Clé API fournie par Taler pour authentifier les transactions (il faut préfixer la valeur par `secret-token:` !)
- **Emplacement** : À entrer dans le champ **API Key** dans les paramètres de configuration.
- **Exemple** : `secret-token:sandbox`

### 3. Currency

- **Description** : Devise utilisée pour les transactions Taler dans votre application **be-bop**.
- **Emplacement** : À entrer dans le champ **Currency**.
- **Valeurs possibles** : Seules les devises supportées par votre backend Taler sont supportées. Si la valeur du champ Backend URL commence par `https://backend.demo.taler.net/`, alors les paiements seront automatiquement faits en `KUDOS`, la devise de test de Taler.

## Payer avec Taler

Aprés avoir configuré vous pouvez maintenant recevoir des paiements avec Taler.

![image](https://github.com/user-attachments/assets/55c03be1-8ef7-4696-a163-e775229ca8c2)
