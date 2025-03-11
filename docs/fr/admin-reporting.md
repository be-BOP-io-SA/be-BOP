# Documentation de l'Interface de Reporting

Cette page permet de consulter et d'exporter des détails sur les commandes, les produits, et les paiements. Elle est accessible via l'onglet **Admin** > **Config** > **Reporting**.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

Elle affiche le reporting du mois et de l'année en cours.

---

## Fonctionnalités

### 1. Filtres de Reporting

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Options de Filtrage** : Permet de filtrer les commandes selon leur statut :
  - `Include pending orders` : Inclure les commandes en attente.
  - `Include expired orders` : Inclure les commandes expirées.
  - `Include canceled orders` : Inclure les commandes annulées.
  - `Include partially paid orders` : Inclure les commandes partiellement payées.
- **Utilisation** : Cochez les cases correspondantes pour inclure ces types de commandes dans le reporting.
  Par défaut seul les commandes payés sont listés.

### 2. Order Detail (Détail de Commande)

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Export CSV** : Permet d'exporter les détails des commandes en format CSV.
- **Tableau des Détails de Commande** :
  - Affiche les informations concernant les commandes. Chaque ligne represente une commande.
  - `Order ID` : Identifiant unique de la commande (cliquer dessus pour voir plus de détails).
  - `Order URL` : Lien direct vers la commande.
  - `Order Date` : Date de la commande.
  - `Order Status` : Statut de la commande (ex. : paid, pending).
  - `Currency` : Devise de la transaction.
  - `Amount` : Montant total de la commande.
  - `Billing Country` : Pays de facturation (s’il est disponible).
  - `Billing Info` : Les informations pour l'addresse de facturation.
  - `Shipping Country` : Pays de livraison (s’il est disponible).
  - `Shipping Info` : Les informations pour l'addresse de livraison.
  - `Cart` : les articles dans le panier de la commande

### 3. Product Detail (Détail de Produit)

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Export CSV** : Permet d'exporter les informations des produits associés aux commandes en format CSV.
- **Tableau des Détails de Produit** :
  - Affiche les informations concernant les produits associés aux commandes. Chaque ligne correspond à un produit ajouté pour une commande spécifique.
  - `Product URL` : Lien direct vers le produit.
  - `Product Name` : Nom du produit.
  - `Quantity` : Quantité commandée.
  - `Deposit` : Montant du dépôt pour le produit (si applicable).
  - `Order ID` : Référence de la commande associée.
  - `Order Date` : Date de la commande associée.
  - `Currency` : Devise de la transaction.
  - `Amount` : Montant total pour ce produit.
  - `Vat Rate` : Taux de TVA appliqué.

### 4. Payment Detail (Détail de Paiement)

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Export CSV** : Permet d'exporter les détails de paiement en format CSV.
- **Tableau des Détails de Paiement** :
  - Affiche les informations concernant les paiements associés aux commandes. Chaque ligne correspond à un paiement effectué pour une commande spécifique.
  - `Order ID` : Référence de la commande associée.
  - `Invoice ID` : Référence de la facture.
  - `Payment Date` : Date de paiement.
  - `Order Status` : Statut de la commande.
  - `Payment mean` : Moyen de Paiement
  - `Payment Status` : Statut du paiement.
  - `Payment Info` : Les information du paiement.
  - `Order Status` : Statut de la commande.
  - `Invoice` : Numéro de la facture.
  - `Currency` : Devise utilisée par la boutique.
  - `Amount` : Le montant du paiement converti avec la devise.
  - `Cashed Currency` : Devise de paiement.
  - `Cashed Amount` : Le montant du paiement converti avec la devise de paiement.
  - `Billing Country` : Pays de facturation

### 5. Filtre du reporting

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Utilisé pour filtrer le reporting par le mois et année choisis.

### 6. Order synthesis (Syntése des commandes)

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Export CSV** : Permet d'exporter la syntése des commandes en format CSV.
- **Tableau des Détails de Paiement** :
  - Affiche un résumé des statistiques de commande pour une période donnée.
  - `Period` : Indique le mois et l'année de la période concernée.
  - `Order Quantity` : Nombre total de commandes passées durant cette période.
  - `Order Total` : Montant cumulé de toutes les commandes pour la période indiquée.
  - `Average Cart` : Montant moyen des commandes pour cette période.
  - `Currency` : Devise dans laquelle les commandes ont été passées (par exemple, BTC pour Bitcoin).

### 7. Product synthesis (Syntése des produits)

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Export CSV** : Permet d'exporter la syntése des produits en format CSV.
- **Tableau des Détails de Paiement** :
  - Affiche un résumé des statistiques de produits pour une période donnée.
  - `Period` : Indique le mois et l'année de la période concernée.
  - `Product ID` : ID du produit.
  - `Product Name` : Nom du produit.
  - `Order Quantity` : Quantity commandée.
  - `Currency` : Devise dans laquelle les commandes ont été passées (par exemple, BTC pour Bitcoin).
  - `Total Price` : Total de la commande (par exemple, BTC pour Bitcoin).

### 8. Payment synthesis (Syntése des payments)

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Export CSV** : Permet d'exporter la syntése des paiements en format CSV.
- **Tableau des Détails de Paiement** :
  - Affiche un résumé des statistiques de payment pour une période donnée.
  - `Period` : Indique le mois et l'année de la période concernée.
  - `Payment Mean` : Le moyen de paiement utilisé.
  - `Payment Quantity` : La quantité payée.
  - `Total Price` : Le prix total payé.
  - `Currency` : Devise dans laquelle les commandes ont été passées (par exemple, BTC pour Bitcoin).
  - `Currency` : Devise dans laquelle les commandes ont été passées (par exemple, BTC pour Bitcoin).
  - `Average` : Montant moyen payé.

---

## Exportation des Données

Chaque section (Order Detail, Product Detail, Payment Detail) dispose d'un bouton `Export CSV` permettant de télécharger les données affichées sous forme de fichier CSV.

Un exemple:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
