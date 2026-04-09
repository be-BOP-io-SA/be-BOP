# Comment utiliser Nostr pour les notifications et le commerce ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration de Nostr pour envoyer des notifications, permettre la connexion via npub et activer le commerce conversationnel via le bot Nostr de be-BOP.

## 1. Configurer Nostr [A105]

Rendez-vous sur **Admin** > **Node Management** > **Nostr**.

### Générer la clé privée

- Cliquez sur **Create NostR private key** pour générer une nouvelle paire de clés.
- Copiez la clé privée (nsec) affichée.
- Ajoutez-la dans votre fichier **.env** :

```
NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

- Redémarrez be-BOP pour activer la connexion Nostr.

### Configurer les relais

- Dans la section **Relays**, consultez la liste des relais actifs (ex. : `wss://nostr.wine`, `wss://nos.lol`).
- Pour ajouter un relais, saisissez l'URL au format WebSocket (`wss://new.relay.url`) dans le champ **Relay** puis cliquez sur **Update relay list**.
- Supprimez un relais en cliquant sur l'icone de suppression correspondante.

### Certifier la clé publique

- La clé publique (npub) de votre be-BOP est affichée dans la section **Keys**.
- Cliquez sur le bouton **Certify** pour valider vos clés.

### Configurer le bot

- Dans la section **Intro Message**, personnalisez le message d'introduction envoyé automatiquement par le bot Nostr.
- Cochez **Disable Nostr-bot intro message** pour désactiver l'envoi automatique du message d'introduction.

Pour plus de détails, consultez [Configuration Nostr](../fr/nostr-configuration.md).

## 2. Se connecter via Nostr npub (client) [C44]

Depuis la page **/login** de votre boutique :

- Le client saisit sa clé publique Nostr (npub) dans le champ dédié.
- Le système vérifie la clé et authentifie le client.
- Le client accède à son espace personnel sans nécessiter d'email ni de mot de passe.

> La connexion via npub nécessite que Nostr soit configuré sur votre be-BOP (voir section 1).

## 3. Recevoir des notifications via Nostr [C62]

Une fois Nostr configuré et le client connecté avec son npub :

- Les mises à jour de statut de commande sont envoyées automatiquement par message direct (DM) Nostr au client.
- Le client reçoit les notifications directement dans son application Nostr compatible (ex. : Damus, Amethyst, Primal).
- Les notifications couvrent les changements de statut : paiement reçu, commande en cours, commande expédiée, etc.

## 4. Faire ses achats via Nostr (client) [C64]

Le client peut interagir avec le bot Nostr de votre be-BOP par message direct :

- Envoyer `!help` pour afficher la liste des commandes disponibles.
- Envoyer `!catalog` pour consulter le catalogue de produits.
- Ajouter ou retirer des articles du panier via les commandes du bot.
- Le bot répond dans la conversation Nostr avec les confirmations et le contenu du panier.

> Le commerce via Nostr permet aux clients d'acheter sans jamais visiter votre site web.

## 5. Créer une commande via Nostr (client) [C65]

En poursuivant l'interaction avec le bot Nostr :

- Le client finalise sa commande directement dans la conversation DM.
- Le bot fournit un lien de paiement ou un QR code pour compléter la transaction.
- Une fois le paiement effectué, le client reçoit une confirmation de commande via Nostr DM.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Configuration Nostr | Nostr setup | A105 |
| Connexion npub | Nostr login | C44 |
| Notifications Nostr | Nostr DM notifications | C62 |
| Achats via Nostr | Nostr shopping | C64 |
| Commande via Nostr | Nostr order creation | C65 |

Pour plus de détails, consultez [Configuration Nostr](../fr/nostr-configuration.md).