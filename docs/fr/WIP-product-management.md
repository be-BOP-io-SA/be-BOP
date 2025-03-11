# Interface de gestion des produits

Accessible via **Admin** > **Merch** > **Product**, cette section vous permet d'ajouter des produits à votre be-bop.

## Ajouter ou editer un nouveau produit

### Informations de Base

- **Product name** : Le nom du produit.
- **Slug** : Identifiant unique pour l'URL du produit.
- **Alias** : Identifiant alternatif pour le produit.

  ![image](https://github.com/user-attachments/assets/c8d62c9d-f927-4220-a1c5-0910cde13301)

- **Type** : Sélectionnez le type de produit (Resource).

  ![image](https://github.com/user-attachments/assets/2f8d8c4b-2492-466a-9b6d-f713205ac29e)

### Tarification

- **Price Amount** : Définissez le montant du prix.
- **Price Currency** : Sélectionnez la devise pour le prix (ex. : SAT).

  ![image](https://github.com/user-attachments/assets/2ff71ca7-5931-408e-ada1-4bd5d438b570)

### Options de Produit

- [ ] **This is a pay-what-you-want product** : Permet aux clients de définir leur propre prix.
- [x] **This is a standalone product** : Indique que le produit est à ajout unique au panier ne peut pas etre ajouté en quantité > 1.
- [ ] **This is a free product** : Marque le produit comme gratuit.
- [ ] **Allow partial deposit** : Permet aux clients de payer un montant partiel à l'avance.
- [ ] **Restrict payment methods** : Limite les options de paiement disponibles pour ce produit.
- [x] **Product has light variations (no stock difference)** : Ajoute des variations sans affecter le stock.

  - Ajoutez des variations de produit avec :

    - **Name** : Spécifiez le nom de la variation (ex. : Couleur).
    - **Value** : Définissez l'option de variation (ex. : Rouge).
    - **Price difference** : Définissez la différence de prix pour chaque variation.

- [x] **Sell with disclaimer** : Ajouter une prévention à la vente.

  - **Disclaimer title** : Titre de la prévention.
  - **Disclaimer description** : Description de la prévention

    ![image](https://github.com/user-attachments/assets/86c000a2-7950-4fba-96b3-3378a2669a07)

### Descriptions du Produit

- **Short description** : Résumé bref du produit.
- [ ] **Display the short description on product page** : Affiche la courte description sur la page produit.
- **Description** : Description détaillée du produit.

### Paramètres Additionnels

- **Product Tags** : Mots-clés pour faciliter la recherche et la catégorisation.
- **Available date** : Spécifiez la date de disponibilité. Laissez vide si disponible immédiatement.
  - [ ] **Enable preorders before available date** : Autorisez les précommandes.
  - [ ] **Display custom text instead of date for preorder** : Afficher un autre text à la place de la date de disponibilité.
- **Max quantity per order** : Limite le nombre d’unités par commande.

  ![image](https://github.com/user-attachments/assets/146c241f-292f-4ef2-87a4-0a852cffbb58)

## Fonctions Avancées du Produit

![image](https://github.com/user-attachments/assets/67521a23-a4d0-491c-9c8c-a3a77e828b61)

### Ticket

- [ ] **The product is a ticket (e.g. for an event)** : Si le produits est un ticket pour les evénements

### Stock

- [ ] **The product has a limited stock** : Cochez si le stock est limité.

### Delivery

- [ ] **The product has a physical component that will be shipped to the customer's address** : Indique si le produit nécessite une expédition.

### Action settings

Personnalisez la visibilité et la disponibilité du produit par canal :

| Action                      | Eshop (anyone) | Retail (POS logged seat) | Google Shopping | Nostr-bot |
| --------------------------- | -------------- | ------------------------ | --------------- | --------- |
| Produit visible             | ✅             | ✅                       | ✅              | ✅        |
| Produit ajoutable au panier | ✅             | ✅                       | ✅              | ✅        |

![image](https://github.com/user-attachments/assets/528b0cf0-8bcb-494b-8673-efceba003a15)

### Add custom CTA

Ajoutez des boutons personnalisés :

- **Text** : Texte du CTA (ex. : "En savoir plus")
- **URL** : Lien vers lequel redirige le CTA.
- [ ] Afficher seulement si le bouton "Ajouter au panier" ou "Commander" n'est pas disponible

## Picture

- **picture** : Téléchargez une image pour le produit.

  ![image](https://github.com/user-attachments/assets/dcb9755e-7bb8-4859-818b-5d3137fada17)
