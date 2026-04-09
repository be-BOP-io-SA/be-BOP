# Comment créer et vendre des produits ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la création, la configuration et la mise en vente de produits sur votre boutique be-BOP.

## 1. Créer un produit [A01]

Rendez-vous sur **Admin** > **Merch** > **Product** et cliquez sur **Add a product**.

### Informations de base

- **Product name** : Le nom du produit.
- **Slug** : Identifiant unique pour l'URL du produit (ex. : `mon-produit` donnera `/product/mon-produit`).
- **Alias** : Identifiant alternatif pour le produit. L'alias permet d'ajouter rapidement un produit au panier via le champ de saisie alias sur `/cart`. Vous pouvez également effectuer un changement d'alias en masse depuis **Admin** > **Merch** > **Product** via le bulk change.
- **Type** : Sélectionnez le type de produit (Resource, Subscription, etc.).

## 2. Éditer les détails du produit [A02]

### Descriptions

- **Short description** : Résumé bref du produit.
- [ ] **Display the short description on product page** : Affiche la courte description sur la page produit.
- **Description** : Description détaillée du produit (supporte le formatage).

### Paramètres additionnels

- **Product Tags** : Mots-clés pour faciliter la recherche et la catégorisation.
- **Available date** : Date de disponibilité du produit. Laissez vide si disponible immédiatement.
  - [ ] **Enable preorders before available date** : Autorisez les précommandes.
  - [ ] **Display custom text instead of date for preorder** : Afficher un texte personnalisé à la place de la date.
- **Max quantity per order** : Limite le nombre d'unités par commande.

## 3. Définir le prix du produit [A03]

### Tarification

- **Price Amount** : Montant du prix du produit.
- **Price Currency** : Devise du prix (ex. : EUR, SAT, CHF).

### Options de tarification

- [ ] **This is a free product** : Marque le produit comme gratuit.
- [ ] **This is a pay-what-you-want product** : Permet aux clients de définir leur propre prix.
- [ ] **This is a standalone product** : Produit à ajout unique au panier (quantité maximale de 1).
- [ ] **Allow partial deposit** : Permet aux clients de payer un montant partiel à l'avance.
- [ ] **Restrict payment methods** : Limite les options de paiement disponibles pour ce produit.

## 4. Créer des variations de produit [A07]

Cochez **Product has light variations (no stock difference)** pour activer les variations légères.

Pour chaque variation, renseignez :

- **Name** : Nom de la variation (ex. : Couleur, Taille).
- **Value** : Valeur de l'option (ex. : Rouge, L).
- **Price difference** : Différence de prix par rapport au prix de base (positif ou négatif).

Les variations légères ne modifient pas le stock : toutes les variantes partagent le même inventaire.

## 5. Gérer les images du produit [A08]

Rendez-vous dans la section **Picture** du formulaire produit.

- Téléchargez une ou plusieurs images pour le produit.
- Réorganisez l'ordre des images par glisser-déposer.
- Les images sont affichées dans l'ordre défini sur la page produit.

Pour plus de détails, consultez [Options d'image](../fr/picture-option.md).

## 6. Définir l'image par défaut [A09]

- L'image placée en première position dans la liste sera utilisée comme image par défaut du produit.
- Cette image apparaît dans le catalogue, les résultats de recherche et les aperçus du panier.

## 7. Gérer le stock du produit [A05]

Dans la section **Stock** du formulaire produit :

- [ ] **The product has a limited stock** : Cochez pour indiquer que ce produit a un stock limité. Si décoché, le produit aura un stock illimité.
- **Stock** : Saisissez la quantité disponible dans le champ de stock.
- **Amount in pending orders / carts** : Affiche la quantité de ce produit actuellement dans des paniers ou en attente de paiement.
- **Amount sold** : Affiche la quantité vendue. En cliquant dessus, vous êtes redirigé vers la liste des commandes payées pour ce produit.

### Produit en rupture de stock

Lorsqu'un produit est en rupture de stock :

- Le produit reste visible mais les boutons "Ajouter au panier" et "Commander" sont désactivés.
- Un indicateur de rupture de stock est affiché.

## 8. Configurer la livraison du produit [A27]

Dans la section **Delivery** du formulaire produit :

- [ ] **The product has a physical component that will be shipped to the customer's address** : Cochez si le produit nécessite une expédition physique.

Lorsque cette option est activée, le client devra fournir une adresse de livraison lors du checkout.

## 9. Assigner un profil de TVA [A12]

Dans le formulaire produit, section TVA :

- Sélectionnez le profil de TVA applicable au produit.
- Le taux de TVA sera automatiquement appliqué au prix du produit.
- Assurez-vous d'avoir configuré vos profils de TVA au préalable.

Pour plus de détails, consultez [Configuration TVA](../fr/VAT-configuration.md).

## 10. Définir la visibilité par canal [A23]

Dans la section **Action settings** du formulaire produit, configurez la visibilité et la disponibilité par canal :

| Action                      | Eshop (anyone) | Retail (POS logged seat) | Google Shopping | Nostr-bot |
| --------------------------- | -------------- | ------------------------ | --------------- | --------- |
| Produit visible             | ✅ / ❌        | ✅ / ❌                  | ✅ / ❌         | ✅ / ❌   |
| Produit ajoutable au panier | ✅ / ❌        | ✅ / ❌                  | ✅ / ❌         | ✅ / ❌   |

- **Eshop** : Boutique en ligne accessible à tous.
- **Retail** : Point de vente physique (session POS connectée).
- **Google Shopping** : Flux produit pour Google Shopping.
- **Nostr-bot** : Vente via le bot Nostr.

## 11. Gérer les traductions du produit [A28]

- Chaque champ textuel du produit (nom, descriptions, tags) peut être traduit dans les langues activées sur votre boutique.
- Rendez-vous dans la section traduction du formulaire produit pour saisir les versions traduites.
- Les clients verront automatiquement la version dans leur langue si elle est disponible.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Créer un produit | Product creation | A01 |
| Éditer les détails | Product details | A02 |
| Définir le prix | Product pricing | A03 |
| Créer des variations | Light variations | A07 |
| Gérer les images | Product pictures | A08 |
| Image par défaut | Default picture | A09 |
| Gérer le stock | Stock management | A05 |
| Configurer la livraison | Delivery | A27 |
| Profil de TVA | VAT profile | A12 |
| Visibilité par canal | Channel visibility | A23 |
| Traductions | Product translations | A28 |