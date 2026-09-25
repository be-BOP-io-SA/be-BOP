# Comment accepter des paiements sur ma boutique ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration des moyens de paiement disponibles sur be-BOP, des solutions fiat classiques aux paiements Bitcoin.

## Paiements fiat

### 1. Configurer Stripe [A93]

Rendez-vous sur **Admin** > **Payment Settings** > **Stripe**.

- **Secret Key** : Votre clé secrète Stripe (ex. : `sk_live_...`).
- **Public key** : Votre clé publique Stripe (ex. : `pk_live_...`).
- **Currency** : Devise utilisée pour les transactions Stripe (ex. : EUR, CHF, USD).

Une fois ces champs remplis et enregistrés, Stripe sera ajouté comme moyen de paiement sur votre plateforme.

Pour plus de détails, consultez [Configuration Stripe](../fr/stripe-configuration.md).

### 2. Configurer PayPal [A94]

Rendez-vous sur **Admin** > **Payment Settings** > **PayPal**.

- **Client ID** : Identifiant client PayPal.
- **Client Secret** : Clé secrète PayPal.
- **Currency** : Devise utilisée pour les transactions PayPal.
- **Sandbox mode** : Activez pour les tests, désactivez pour la production.

Pour plus de détails, consultez [Configuration PayPal](../fr/paypal-configuration.md).

### 3. Configurer SumUp [A95]

Rendez-vous sur **Admin** > **Payment Settings** > **SumUp**.

- **API Key** : Clé API SumUp.
- **Merchant Code** : Code marchand SumUp.
- **Currency** : Devise des transactions.

SumUp est particulièrement adapté aux paiements en point de vente physique.

Pour plus de détails, consultez [Configuration SumUp](../fr/sumup-configuration.md).

## Paiements Bitcoin

### 4. Configurer BTCPay Server [A96]

Rendez-vous sur **Admin** > **Payment Settings** > **BTCPay Server**.

- **URL** : Adresse de votre instance BTCPay Server.
- **API Key** : Clé API générée depuis BTCPay Server.
- **Store ID** : Identifiant de la boutique dans BTCPay Server.

BTCPay Server est une solution auto-hébergée de traitement des paiements Bitcoin.

### 5. Configurer PhoenixD [A97]

Rendez-vous sur **Admin** > **Payment Settings** > **PhoenixD**.

- **URL** : Adresse de votre instance PhoenixD.
- **API Key** : Clé API PhoenixD.

PhoenixD permet de recevoir des paiements via le Lightning Network.

Pour plus de détails, consultez [Configuration PhoenixD](../fr/phoenixd-configuration.md).

### 6. Configurer Swiss Bitcoin Pay [A98]

Rendez-vous sur **Admin** > **Payment Settings** > **Swiss Bitcoin Pay**.

- **API Key** : Clé API Swiss Bitcoin Pay.

Swiss Bitcoin Pay propose une solution de paiement Bitcoin adaptée au marché suisse et européen.

### 7. Configurer Bitcoin Nodeless [A99]

Rendez-vous sur **Admin** > **Payment Settings** > **Nodeless**.

- **API Key** : Clé API Nodeless.
- **Store ID** : Identifiant de la boutique Nodeless.

Nodeless permet d'accepter des paiements Bitcoin sans gérer de noeud.

Pour plus de détails, consultez [Configuration Bitcoin Nodeless](../fr/configuration-bitcoin-nodeless.md).

### 8. Configurer bitcoind [A100]

Rendez-vous sur **Admin** > **Payment Settings** > **bitcoind**.

- **URL** : Adresse de votre noeud Bitcoin (bitcoind).
- **RPC User** : Nom d'utilisateur RPC.
- **RPC Password** : Mot de passe RPC.

Cette option est destinée aux utilisateurs avancés qui exploitent leur propre noeud Bitcoin.

### 9. Configurer LND [A101]

Rendez-vous sur **Admin** > **Payment Settings** > **LND**.

- **URL** : Adresse de votre noeud LND.
- **Macaroon** : Macaroon d'authentification LND (en hexadécimal).

LND permet de recevoir des paiements Lightning Network via votre propre noeud.

## Paramètres généraux de paiement

### 10. Ordonner les moyens de paiement [A75]

Rendez-vous sur **Admin** > **Config**, section moyens de paiement.

- Réorganisez l'ordre d'affichage des moyens de paiement présentés aux clients lors du checkout.
- Glissez-déposez les méthodes de paiement pour définir l'ordre souhaité.
- Les méthodes en haut de la liste seront proposées en premier.

### 11. Définir le seuil de confirmation Bitcoin [A76]

Rendez-vous sur **Admin** > **Config**, section Bitcoin.

- **Confirmation threshold** : Nombre de confirmations Bitcoin requises avant de considérer un paiement comme validé.
- Un seuil plus élevé offre plus de sécurité mais augmente le temps d'attente.
- Pour les petits montants, 1 confirmation peut suffire. Pour les montants importants, 3 à 6 confirmations sont recommandées.

### 12. Définir le délai d'expiration des paiements [A55]

Rendez-vous sur **Admin** > **Config**, section paiement.

- **Payment timeout** : Durée en minutes pendant laquelle un paiement reste valide avant expiration.
- Passé ce délai, la commande sera annulée si le paiement n'a pas été effectué.
- Ce paramètre est particulièrement important pour les paiements Bitcoin, dont le cours peut fluctuer.

## Récapitulatif

| Méthode | Type | Identifiant |
| ------- | ---- | ----------- |
| Stripe | Fiat | A93 |
| PayPal | Fiat | A94 |
| SumUp | Fiat | A95 |
| BTCPay Server | Bitcoin | A96 |
| PhoenixD | Lightning | A97 |
| Swiss Bitcoin Pay | Bitcoin | A98 |
| Bitcoin Nodeless | Bitcoin | A99 |
| bitcoind | Bitcoin | A100 |
| LND | Lightning | A101 |
| Ordre des paiements | Config | A75 |
| Seuil de confirmation | Config | A76 |
| Délai d'expiration | Config | A55 |