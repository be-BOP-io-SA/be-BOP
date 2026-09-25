# Comment suivre mes commandes et télécharger mes achats ?

> **Parcours client** — Ce guide est destiné aux clients de la boutique.

Ce guide décrit comment consulter vos commandes, télécharger vos achats numériques, accéder à vos factures et gérer vos billets d'événements.

## 1. Consulter la liste de vos commandes [C34]

Rendez-vous sur `/orders` pour afficher la liste de toutes vos commandes.

- Les commandes sont listées avec leur numéro, date, statut et montant total.
- Filtrez par statut (payée, en attente, annulée) pour retrouver facilement une commande.

## 2. Consulter le détail d'une commande [C35]

Rendez-vous sur `/order/[id]` pour afficher le détail d'une commande spécifique.

Les informations affichées comprennent :

- **Numéro de commande** : Identifiant unique.
- **Date de commande** : Date et heure de la commande.
- **Statut** : État actuel de la commande (en attente, payée, expédiée, etc.).
- **Articles commandés** : Liste des produits avec quantité, prix unitaire et sous-total.
- **Adresse de livraison** : Si applicable.
- **Détail du paiement** : Méthode de paiement utilisée et montant.
- **Détail TVA** : Décomposition de la TVA.

## 3. Consulter et télécharger la facture [C36]

Rendez-vous sur `/order/[id]/payment/[paymentId]/receipt` pour accéder à la facture ou au reçu de paiement.

- La facture contient les informations du vendeur, du client, le détail des articles et la TVA.
- Cliquez sur le bouton d'impression ou de téléchargement pour obtenir un PDF.
- Chaque paiement d'une commande dispose de sa propre facture.

## 4. Payer une commande en attente [C38]

Rendez-vous sur `/order/[id]/payment/[paymentId]/pay` pour effectuer le paiement d'une commande en attente.

- Si le paiement initial n'a pas été complété ou a expiré, vous pouvez relancer le paiement depuis cette page.
- Sélectionnez le moyen de paiement et procédez au règlement.
- Le statut de la commande sera mis à jour automatiquement après le paiement.

## 5. Télécharger des fichiers numériques [C39]

Rendez-vous sur `/digital-file/raw/[id]` pour télécharger les fichiers associés à vos achats numériques.

- Les fichiers sont accessibles uniquement après paiement validé de la commande.
- Cliquez sur le lien de téléchargement depuis le détail de la commande pour accéder au fichier.
- Les fichiers restent disponibles tant que votre commande est active.

## 6. Consulter et imprimer des billets d'événement [C40]

Rendez-vous sur `/order/[id]/tickets` pour accéder à vos billets.

- Les billets sont disponibles pour les produits de type "ticket" (événements).
- Chaque billet contient un code unique (QR code) pour la validation à l'entrée.
- Vous pouvez imprimer les billets ou les conserver sur votre appareil mobile.

## 7. Ajouter des notes à une commande [C42]

Sur la page de détail de la commande `/order/[id]` :

- Utilisez le champ de notes pour communiquer avec le vendeur.
- Les notes peuvent contenir des instructions de livraison, des demandes spéciales ou des questions.
- Le vendeur sera notifié de l'ajout d'une note.

## 8. Recevoir des notifications Nostr [C62]

Si vous êtes connecté via un npub Nostr :

- Les notifications de commande (confirmation, expédition, mise à jour) peuvent être envoyées via le protocole Nostr.
- Ces notifications complètent ou remplacent les notifications par e-mail.
- Assurez-vous que votre npub est bien associé à votre compte pour recevoir les notifications.

## Récapitulatif

| Action | URL | Identifiant |
| ------ | --- | ----------- |
| Liste des commandes | `/orders` | C34 |
| Détail de commande | `/order/[id]` | C35 |
| Facture / reçu | `/order/[id]/payment/[paymentId]/receipt` | C36 |
| Payer une commande en attente | `/order/[id]/payment/[paymentId]/pay` | C38 |
| Télécharger un fichier numérique | `/digital-file/raw/[id]` | C39 |
| Billets d'événement | `/order/[id]/tickets` | C40 |
| Notes de commande | `/order/[id]` | C42 |
| Notifications Nostr | - | C62 |