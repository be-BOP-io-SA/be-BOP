# Comment traiter et gérer les commandes reçues ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la gestion quotidienne des commandes : consultation, filtrage, suivi, annulation et étiquetage.

## 1. Consulter la liste des commandes [A31]

Rendez-vous sur **Admin** > **Transaction** > **Orders**.

- La liste affiche toutes les commandes triées par date de création (les plus récentes en premier).
- Chaque ligne indique le numéro de commande, le statut, le montant, le moyen de paiement et les labels associés.

### Filtrer les commandes

Utilisez les champs de filtre en haut de la liste pour affiner l'affichage :

- **Order Number** : Recherche par numéro de commande.
- **Product alias** : Recherche par alias d'un produit contenu dans la commande.
- **Payment Mean** : Filtrage par moyen de paiement utilisé.
- **Label** : Filtrage par label attribué à la commande (ex. : "en préparation", "expédié").
- **Email** : Recherche par adresse e-mail du client.
- **Npub** : Recherche par identifiant Nostr (npub) du client.

### Pagination

Par défaut, 50 commandes sont affichées par page. Utilisez les boutons **next** et **previous** pour naviguer entre les pages.

## 2. Consulter les détails d'une commande [A32]

Cliquez sur le **numéro de commande** dans la liste pour accéder à la fiche détaillée.

La fiche affiche :

- **Produits commandés** : Liste des articles, quantités et prix.
- **Informations client** : E-mail, npub, adresse de livraison et de facturation.
- **Statut de la commande** : En attente, payée, annulée, etc.
- **Historique des paiements** : Détail des transactions associées.
- **Adresse de livraison** : Si applicable, les informations complètes d'expédition.

## 3. Annuler une commande [A33]

Depuis la fiche détaillée d'une commande, cliquez sur le bouton d'annulation.

- L'annulation d'une commande **remet automatiquement le stock** des produits concernés.
- Une commande annulée ne peut pas être réactivée ; il faudra en créer une nouvelle si nécessaire.

> Vérifiez toujours le statut du paiement avant d'annuler. Si un paiement a déjà été encaissé, un remboursement pourra être nécessaire en dehors du système.

## 4. Ajouter un paiement manuel à une commande en attente [A34]

Si un client a payé par virement bancaire ou par un autre moyen hors-ligne, vous pouvez confirmer le paiement manuellement.

### Depuis la liste des commandes

- Un bouton de confirmation est disponible directement sur la ligne de la commande en attente de virement.

### Depuis la fiche de la commande

- Accédez à la commande, puis utilisez le formulaire de confirmation de paiement.
- Renseignez le justificatif (ex. : "Virement reçu le 15/03, réf. XXXXX").
- Validez pour passer la commande au statut payé.

## 5. Ajouter des notes à une commande [A35]

Depuis la fiche détaillée d'une commande, cliquez sur le bouton **Voir notes commandes**.

- Ajoutez des notes internes pour le suivi (ex. : "Client contacté par téléphone", "Colis remis en main propre").
- Les notes sont visibles par les administrateurs et les employés.

## 6. Transférer le reçu par e-mail ou Nostr [A36]

Depuis la fiche de commande, vous pouvez renvoyer le reçu de commande au client.

- **Par e-mail** : Le reçu est envoyé à l'adresse e-mail associée à la commande.
- **Par Nostr** : Le reçu est envoyé via le protocole Nostr si le client a fourni son npub.

Cela est utile si le client n'a pas reçu la confirmation initiale ou s'il en demande une copie.

## 7. Attribuer des labels aux commandes [A37]

Les labels permettent d'organiser et de catégoriser les commandes selon votre processus interne.

### Ajouter un label

- Dans la liste des commandes, cliquez sur le bouton **+** sur la ligne de la commande concernée.
- Sélectionnez un ou plusieurs labels parmi ceux disponibles.
- Le label apparaît immédiatement sur la ligne de commande.

### Exemples d'utilisation

- "En préparation", "Expédié", "Remboursé", "À vérifier".
- Combinez avec le filtre **Label** pour retrouver rapidement les commandes par statut.

## 8. Créer et gérer les labels [A50]

Rendez-vous sur **Admin** > **Merch** > **Label** pour créer les labels utilisables sur les commandes et les produits.

- **Nom du label** : Texte descriptif (ex. : "Prioritaire", "Fragile").
- **Couleur** : Choisissez une couleur pour identifier visuellement le label.
- **Icône** : Sélectionnez une icône pour renforcer l'identification.

Les labels créés ici sont ensuite disponibles lors de l'attribution aux commandes (voir section 7).

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Liste des commandes | Consultation et filtrage | A31 |
| Détails commande | Fiche complète | A32 |
| Annulation | Annuler et remettre en stock | A33 |
| Paiement manuel | Confirmer virement bancaire | A34 |
| Notes | Ajouter des notes internes | A35 |
| Transfert reçu | Envoyer par e-mail ou Nostr | A36 |
| Labels commande | Attribuer des labels | A37 |
| Gestion labels | Créer labels avec couleur et icône | A50 |