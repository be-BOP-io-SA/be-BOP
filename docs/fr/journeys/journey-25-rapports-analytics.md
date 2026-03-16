# Comment consulter les rapports et statistiques de ventes ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans l'utilisation de l'interface de reporting de be-BOP pour consulter vos statistiques de ventes, analyser vos commandes, produits et paiements, et exporter vos donnees.

## 1. Acceder aux rapports [A106]

Rendez-vous sur **Admin** > **Config** > **Reporting**.

L'interface de reporting affiche par defaut les statistiques du mois et de l'annee en cours.

### Filtres de reporting

- Par defaut, seules les commandes payees sont affichees.
- Options de filtrage disponibles :
  - **Include pending orders** : Inclure les commandes en attente.
  - **Include expired orders** : Inclure les commandes expirees.
  - **Include canceled orders** : Inclure les commandes annulees.
  - **Include partially paid orders** : Inclure les commandes partiellement payees.
- Utilisez le selecteur de mois et d'annee pour filtrer le reporting sur une periode specifique.

## 2. Detail des commandes (Order Detail)

Cette section affiche le detail de chaque commande sur la periode selectionnee.

- **Order ID** : Identifiant unique de la commande (cliquable pour plus de details).
- **Order URL** : Lien direct vers la commande.
- **Order Date** : Date de la commande.
- **Order Status** : Statut de la commande (paid, pending, etc.).
- **Currency** : Devise de la transaction.
- **Amount** : Montant total de la commande.
- **Billing Country / Billing Info** : Pays et adresse de facturation.
- **Shipping Country / Shipping Info** : Pays et adresse de livraison.
- **Cart** : Articles presents dans le panier de la commande.

### Synthese des commandes (Order Synthesis)

- Affiche un resume par periode : nombre de commandes, montant total, panier moyen et devise.

## 3. Detail des produits (Product Detail)

Cette section affiche les ventes par produit sur la periode selectionnee.

- **Product URL** : Lien direct vers le produit.
- **Product Name** : Nom du produit.
- **Quantity** : Quantite commandee.
- **Deposit** : Montant de l'acompte (si applicable).
- **Order ID** : Reference de la commande associee.
- **Order Date** : Date de la commande associee.
- **Currency** : Devise de la transaction.
- **Amount** : Montant total pour ce produit.
- **Vat Rate** : Taux de TVA applique.

### Synthese des produits (Product Synthesis)

- Affiche un resume par produit et par periode : quantite commandee, prix total et devise.

## 4. Detail des paiements (Payment Detail)

Cette section affiche le detail de chaque paiement sur la periode selectionnee.

- **Order ID** : Reference de la commande associee.
- **Invoice ID** : Reference de la facture.
- **Payment Date** : Date du paiement.
- **Payment Mean** : Moyen de paiement utilise.
- **Payment Status** : Statut du paiement.
- **Payment Info** : Informations complementaires sur le paiement.
- **Currency / Amount** : Devise de la boutique et montant converti.
- **Cashed Currency / Cashed Amount** : Devise et montant effectivement encaisse.
- **Billing Country** : Pays de facturation.

### Synthese des paiements (Payment Synthesis)

- Affiche un resume par moyen de paiement et par periode : quantite de paiements, prix total, devise et montant moyen.

## 5. Exporter en CSV

Chaque section (commandes, produits, paiements) et chaque synthese dispose d'un bouton **Export CSV** permettant de telecharger les donnees affichees sous forme de fichier CSV.

- Cliquez sur le bouton **Export CSV** de la section souhaitee.
- Le fichier CSV est telecharge automatiquement et peut etre ouvert dans un tableur (Excel, LibreOffice Calc, etc.).

Pour plus de details, consultez [Interface de Reporting](../fr/admin-reporting.md).

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Rapports et statistiques | Reporting | A106 |