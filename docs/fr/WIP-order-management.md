# Documentation de l'interface gestion des commandes

## Introduction

La section de gestion des commandes vous permet de visualiser, filtrer, et mettre à jour les commandes reçues dans votre boutique.

## Accès à la Liste des Commandes

Pour accéder à la liste des commandes, allez sur **Admin** > **Transaction** > **Orders**.

![image](https://github.com/user-attachments/assets/de9d05f5-323c-4e40-9754-60e55ba8e605)

## Fonctionnalités de la Liste des Commandes

### Filtrer les Commandes

![image](https://github.com/user-attachments/assets/2c67be84-b339-4c91-863e-9e8e609ecd59)

- Vous pouvez filtrer les commandes par :
  - `Order Number` : Numero de la commande.
  - `Product alias` : Alias d'un produit contenu dans la commande.
  - `Payment Mean` : Le moyen de payment utilisé lors de la commande.
  - `Label` : Le label de la commande (par exemple, "partially sent", "en préparation" etc).
  - `Email` : Le mail de l'utilisateur.
  - `Npub` : Le npub de l'utilisateur.

Utilisez les filtres pour afficher uniquement les commandes qui vous intéressent.

### Pagination des commandes

Par defaut les commandes sont triés par date de creation et on affiche les 50 premiers commandes. Deux boutons `next` et `previous ` permettent de paginer la liste et d'afficher les autres commandes.

![image](https://github.com/user-attachments/assets/8bfa47dc-05fb-48a6-be9b-cbdee257d32c)

## Gestion des Commandes Individuelles

### Voir les Détails d'une Commande

Cliquez sur le numéro d'une commande pour voir les détails complets, y compris les produits commandés, les informations du client, l'adresse de livraison, et le statut.

![image](https://github.com/user-attachments/assets/54804c80-3707-456f-95b1-0d77c5e02a19)

### Management d'une commande

Sur **Order/id** en tant que admin on a des paramètres supplémentaires pour gérer les commandes.
Parmi ces parametres on a :

- **Confirmer un payment par virement bancaire**

  - Soit directement sur la liste des commandes

    [image](https://github.com/user-attachments/assets/4ced2775-394b-4dd2-ac0b-4a0c59a7996b)

  - Soit au click sur la commandes

    ![image](https://github.com/user-attachments/assets/79a087e4-bd3c-4bac-8490-dab6dd782b7f)

- **Annuler une commande**
  Un admin peut annuler une commande

- **Ajouter un label**
  Au click du button + sur une ligne de commande l'admin ou l'employé peut ajouter des labels

  ![image](https://github.com/user-attachments/assets/1dc2a0c6-de46-4105-bdde-80b38f6d6c8d)

  ![image](https://github.com/user-attachments/assets/866e5db9-b681-411a-bb0f-df7ab14bc82e)

- **Voir notes commande**
  Au click du bouton `Voir notes commandes` l'admin ou l'employé peut voir les notes sur la commande

  ![image](https://github.com/user-attachments/assets/492eab1a-1c9e-4e55-b74f-611a0043b4ee)

  ![image](https://github.com/user-attachments/assets/98e7f394-3ccf-4ed4-9ab2-8c5b1199924d)
