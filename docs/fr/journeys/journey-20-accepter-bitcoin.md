# Comment accepter les paiements Bitcoin et Lightning ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration des différentes passerelles de paiement Bitcoin et Lightning disponibles dans be-BOP.

## 1. Configurer BTCPay Server [A96]

Rendez-vous sur **Admin** > **Payment Settings** > **BTCPay Server**.

- **API Key** : Clé d'API générée depuis votre instance BTCPay Server.
- **Store ID** : Identifiant de votre boutique BTCPay Server.
- **URL** : Adresse de votre instance BTCPay Server (ex. : `https://btcpay.example.com`).

Cliquez sur **Save** pour enregistrer la configuration. BTCPay Server gère les paiements Bitcoin on-chain et Lightning de manière intégrée.

## 2. Configurer PhoenixD [A97]

Rendez-vous sur **Admin** > **Payment Settings** > **PhoenixD**.

- Saisissez l'**URL** de votre serveur PhoenixD (ex. : `http://localhost:9740`).
  - Si be-BOP est dans Docker mais pas PhoenixD, utilisez `http://host.docker.internal:9740`.
- Cliquez sur **Detect PhoenixD Server** pour vérifier la connexion.
- Après détection, renseignez le **HTTP password** (disponible dans le fichier `phoenix.conf` de votre serveur).
- Cliquez sur **Save** pour enregistrer.

Une fois configuré, vous pourrez consulter le noeud, la balance et effectuer des retraits directement depuis l'interface.

> PhoenixD permet d'accepter les paiements Lightning sans nécessiter un noeud LND complet.

Pour plus de détails, consultez [Configuration PhoenixD](../fr/phoenixd-configuration.md).

## 3. Configurer Swiss Bitcoin Pay [A98]

Rendez-vous sur **Admin** > **Payment Settings** > **Swiss Bitcoin Pay**.

- Renseignez les informations de connexion fournies par Swiss Bitcoin Pay.
- Cliquez sur **Save** pour activer ce moyen de paiement.

Swiss Bitcoin Pay permet d'accepter les paiements Bitcoin et Lightning avec conversion automatique si souhaitée.

## 4. Configurer Bitcoin Nodeless [A99]

Rendez-vous sur **Admin** > **Payment Settings** > **Bitcoin nodeless**.

- **BIP Standard** : Sélectionnez le standard BIP utilisé pour la génération d'adresses (actuellement BIP 84).
- **Clé publique (ZPub)** : Saisissez votre clé publique au format `zpub` (mainnet) ou `vpub` (testnet).
  - Chemin de dérivation mainnet : `m/84'/0'/0'`
  - Chemin de dérivation testnet : `m/84'/1'/0'`
- **Indice de dérivation** : Commence à `0` et s'incrémente automatiquement. Ne modifiez pas cette valeur sauf si nécessaire.
- **URL Mempool** : URL de l'API utilisée pour vérifier les fonds entrants (ex. : `https://mempool.space` ou `https://mempool.space/testnet` pour le testnet).

Les prochaines adresses générées sont affichées dans la section **Next addresses** pour vérification.

> Bitcoin Nodeless permet de recevoir des paiements Bitcoin on-chain tout en gardant le contrôle total de vos fonds sur votre propre portefeuille, sans serveur intermédiaire.

Pour plus de détails, consultez [Configuration Bitcoin Nodeless](../fr/configuration-bitcoin-nodeless.md).

## 5. Configurer bitcoind [A100]

Rendez-vous sur **Admin** > **Payment Settings** > **Bitcoin core node**.

- Configurez la connexion RPC vers votre noeud Bitcoin Core :
  - **RPC URL** : Adresse de votre noeud (ex. : `http://localhost:8332`).
  - **RPC Username** : Nom d'utilisateur RPC.
  - **RPC Password** : Mot de passe RPC.
- Cliquez sur **Save** pour enregistrer.

> Cette option nécessite un noeud Bitcoin Core complet en fonctionnement.

## 6. Configurer LND [A101]

Rendez-vous sur **Admin** > **Payment Settings** > **Lightning LND node**.

- Configurez la connexion vers votre noeud Lightning LND :
  - **URL** : Adresse de votre noeud LND.
  - **Macaroon** : Fichier d'authentification LND.
  - **TLS Certificate** : Certificat TLS de votre noeud.
- Cliquez sur **Save** pour enregistrer.

> LND offre un contrôle complet sur les canaux Lightning et les paiements.

## 7. Définir les seuils de confirmation Bitcoin [A76]

Rendez-vous sur **Admin** > **Config**, section paiements.

- Configurez le **nombre de confirmations** requises avant de considérer un paiement Bitcoin on-chain comme validé.
- Un nombre plus élevé de confirmations offre une sécurité accrue mais rallonge le délai de validation.
- Pour les petits montants, 1 confirmation peut suffire. Pour les montants importants, 3 à 6 confirmations sont recommandées.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| BTCPay Server | BTCPay Server configuration | A96 |
| PhoenixD | PhoenixD configuration | A97 |
| Swiss Bitcoin Pay | Swiss Bitcoin Pay | A98 |
| Bitcoin Nodeless | Bitcoin Nodeless configuration | A99 |
| bitcoind | Bitcoin Core node | A100 |
| LND | Lightning LND node | A101 |
| Confirmations | Confirmation thresholds | A76 |

Pour plus de détails, consultez [Configuration Bitcoin Nodeless](../fr/configuration-bitcoin-nodeless.md) et [Configuration PhoenixD](../fr/phoenixd-configuration.md).