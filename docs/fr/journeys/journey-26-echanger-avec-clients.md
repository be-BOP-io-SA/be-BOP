# Comment échanger avec mes clients ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide couvre l'ensemble des canaux d'interaction avec vos clients dans be-BOP : formulaires de contact, emails, messages Nostr, notes de commande et commerce conversationnel via le bot Nostr.

## 1. Formulaires de contact [A112, C60]

Les formulaires permettent à vos visiteurs de vous contacter directement depuis votre boutique.

### Créer un formulaire

Rendez-vous sur **Admin** > **Widgets** > **Form**.

- Cliquez sur **Add contact form** pour créer un nouveau formulaire.

**Champs de configuration :**

- **Title** : Nom du formulaire.
- **Slug** : Identifiant unique (utilisé pour l'intégration CMS).
- **Target** : Adresse email ou npub qui recevra les messages. Si vide, l'email de contact de l'identité du vendeur est utilisé par défaut.
- **Display from: field** : Affiche le champ expéditeur sur le formulaire.
  - **Prefill with session information** : Pré-remplit avec les données de session du visiteur.
- **Add a warning to the form with mandatory agreement** : Ajoute une case d'accord obligatoire.
  - **Disclaimer label** / **Disclaimer Content** / **Disclaimer checkbox label** : Textes de l'accord.
- **Subject** / **Content** : Sujet et contenu pré-rempli du formulaire.

**Balises dynamiques disponibles :**

- Sur une page produit : `{{productLink}}`, `{{productName}}`
- Partout : `{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}`, `{{pageName}}`

### Intégrer dans une page CMS

```
[Form=slug]
```

Le formulaire est également accessible directement à l'adresse `/form/[id]`.

Pour plus de détails, consultez [Form Widget](../form-widget.md).

## 2. Notifications par email [A103, A87, A88, A104, A69, C61]

Les emails sont le canal principal pour informer vos clients du statut de leurs commandes.

### Configurer le serveur SMTP [A103]

Rendez-vous sur **Admin** > **Config** > **SMTP** et renseignez : **Host**, **Port**, **Username**, **Password**, **From email**, **From name**.

Pour plus de détails, consultez [Configuration SMTP2GO](../configuration_smtp2go.md).

### Personnaliser les templates d'emails [A87]

Rendez-vous sur **Admin** > **Config** > **Templates**.

Les templates couvrent les événements clés :

| Template | Événement |
| -------- | --------- |
| `order.payment.paid` | Commande payée |
| `order.payment.pending.{method}` | Paiement en attente |
| `order.payment.expired` | Commande expirée |
| `order.payment.canceled` | Commande annulée |
| `passwordReset` | Réinitialisation de mot de passe |
| `temporarySessionRequest` | Magic link de connexion |

Pour chaque template, configurez le **Subject** et le **HTML body** avec les variables : `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{websiteLink}}`, `{{brandName}}`, etc.

### Réinitialiser un template [A88]

Cliquez sur **Reset to default** pour restaurer le contenu original.

### Envoyer un email de test [A104]

Rendez-vous sur **Admin** > **Config** > **Email** pour vérifier que la connexion SMTP fonctionne.

### Recevoir une copie des emails de commande [A69]

Dans **Admin** > **Config**, activez l'option d'envoi de copie à l'administrateur pour chaque notification de commande.

Pour plus de détails, consultez [Templates d'emails](../template-email.md).

## 3. Transférer un reçu de commande [A36]

Depuis la page de détail d'une commande (**Admin** > **Transaction** > **Orders** > cliquez sur une commande) :

- Cliquez sur le bouton pour transférer le reçu.
- Choisissez le canal d'envoi : **email** ou **Nostr DM**.
- Le reçu est envoyé au client avec le détail de la commande et le lien vers la facture.

> Cette fonctionnalité est utile pour renvoyer un reçu perdu ou transmettre une confirmation manuellement.

## 4. Notes de commande [A35, C42]

Les notes permettent un échange contextuel directement sur une commande.

### Côté administrateur [A35]

Depuis **Admin** > **Transaction** > **Orders** > cliquez sur une commande :

- Cliquez sur le bouton **Voir notes commandes**.
- Ajoutez une note textuelle visible par le client et/ou l'équipe interne.
- Les notes sont horodatées et listées chronologiquement.

### Côté client [C42]

Le client peut ajouter des notes à sa commande depuis `/order/[id]/notes` :

- Saisir un message (ex. : instructions de livraison, demande de modification).
- Le message est visible par l'équipe dans le back-office.

> Les notes sont un canal asynchrone pratique pour les précisions post-commande.

## 5. Notifications et échanges via Nostr [A105, C62, C64, C65]

Nostr offre un canal décentralisé pour notifier, échanger et même vendre.

### Configurer Nostr [A105]

Rendez-vous sur **Admin** > **Node Management** > **Nostr** :

- Générez ou importez votre clé privée (nsec) et ajoutez-la au fichier **.env**.
- Configurez vos **relais** (liste d'URLs `wss://...`).
- Personnalisez le **message d'introduction** du bot.
- **Certifiez** votre clé publique (npub) avec votre nom, logo et domaine.

Pour plus de détails, consultez [Configuration Nostr](../nostr-configuration.md).

### Notifications de commande via Nostr DM [C62]

Lorsqu'un client est connecté avec son npub :

- Les mises à jour de statut de commande sont envoyées automatiquement par **message direct (DM)** Nostr.
- Le client reçoit les notifications dans son application Nostr (Damus, Amethyst, Primal, etc.).
- Couverture : paiement reçu, commande en cours, commande expédiée, etc.

### Commerce conversationnel via le bot Nostr [C64, C65]

Le bot Nostr de votre be-BOP permet aux clients d'acheter sans visiter votre site :

- `!help` : Afficher les commandes disponibles.
- `!catalog` : Consulter le catalogue de produits.
- Ajouter/retirer des articles du panier via les commandes du bot.
- Finaliser une commande directement dans la conversation DM.
- Le bot fournit un lien de paiement ou un QR code pour compléter la transaction.

> Le commerce via Nostr est particulièrement adapté aux communautés Bitcoin-native et aux marchands souhaitant offrir une expérience d'achat sans navigateur.

## 6. Labels de commande pour le suivi interne [A37, A50]

Les labels permettent à votre équipe de catégoriser et suivre les commandes visuellement.

### Créer des labels [A50]

Rendez-vous sur **Admin** > **Merch** > **Label** :

- Définissez un **nom**, une **couleur** et une **icône** pour chaque label.
- Exemples : "En préparation", "Expédié", "Retour demandé", "VIP".

### Assigner des labels aux commandes [A37]

Depuis la liste des commandes (**Admin** > **Transaction** > **Orders**) :

- Cliquez sur le bouton **+** sur la ligne de commande.
- Sélectionnez un ou plusieurs labels à assigner.
- Les labels sont visibles dans la liste pour un filtrage rapide.

## Récapitulatif

| Canal | Fonctionnalités | Identifiants |
| ----- | --------------- | ------------ |
| Formulaires de contact | Création, intégration CMS, soumission | A112, C60 |
| Email | SMTP, templates, test, copie admin, notifications client | A103, A87, A88, A104, A69, C61 |
| Transfert de reçu | Envoi manuel par email ou Nostr | A36 |
| Notes de commande | Échanges contextuels admin/client | A35, C42 |
| Nostr | Configuration, notifications DM, bot conversationnel | A105, C62, C64, C65 |
| Labels | Suivi interne des commandes | A37, A50 |

Pour plus de détails, consultez :
- [Form Widget](../form-widget.md)
- [Configuration SMTP2GO](../configuration_smtp2go.md)
- [Templates d'emails](../template-email.md)
- [Configuration Nostr](../nostr-configuration.md)