# Comment parcourir et acheter un produit ?

> **Parcours client** — Ce guide est destiné aux clients de la boutique.

Ce guide décrit le parcours d'achat du point de vue du client, de la navigation dans le catalogue jusqu'à la confirmation de commande.

## 1. Parcourir le catalogue [C02]

Rendez-vous sur `/catalog` pour afficher la liste de tous les produits disponibles.

- Les produits sont présentés sous forme de grille avec leur image, leur nom et leur prix.
- Utilisez la barre de recherche pour trouver un produit spécifique.

## 2. Parcourir par catégorie ou tag [C51]

Rendez-vous sur `/tag/[slug]` pour afficher les produits associés à un tag ou une catégorie spécifique.

- Chaque tag possède sa propre page avec les produits correspondants.
- Les tags sont accessibles depuis le menu de navigation ou directement via leur URL.

## 3. Consulter les détails d'un produit [C03]

Rendez-vous sur `/product/[slug]` pour afficher la page détaillée d'un produit.

Les informations affichées comprennent :

- **Nom du produit** : Titre principal.
- **Description** : Description courte et/ou détaillée du produit.
- **Images** : Galerie d'images du produit.
- **Prix** : Prix affiché dans la devise principale (et éventuellement la devise secondaire).
- **Disponibilité** : Indication de stock (disponible, rupture de stock, précommande).

## 4. Zoomer et parcourir les images [C04]

Sur la page produit :

- Cliquez sur une image pour l'agrandir et la voir en plein écran.
- Naviguez entre les images avec les flèches gauche/droite ou en cliquant sur les miniatures.

## 5. Sélectionner une variation [C05]

Si le produit propose des variations (couleur, taille, etc.) :

- Sélectionnez la variation souhaitée parmi les options disponibles.
- Le prix est automatiquement ajusté en fonction de la différence de prix de la variation choisie.

## 6. Sélectionner la quantité [C06]

- Utilisez le sélecteur de quantité pour définir le nombre d'unités souhaitées.
- La quantité maximale est limitée par le stock disponible et/ou la limite par commande définie par le vendeur.

## 7. Ajouter au panier [C12]

- Cliquez sur le bouton **Ajouter au panier** sur la page produit.
- Une confirmation visuelle s'affiche et l'aperçu du panier est mis à jour.
- Si le produit est en rupture de stock, le bouton est désactivé.

## 8. Consulter le panier [C13]

Rendez-vous sur `/cart` pour afficher le contenu de votre panier.

Le panier affiche :

- **Liste des articles** : Nom, variation, quantité et prix de chaque article.
- **Détail TVA** : Décomposition de la TVA par taux applicable.
- **Sous-total** : Total hors taxes.
- **Total** : Montant total TTC à payer.

## 9. Modifier les quantités dans le panier [C14]

Sur la page `/cart` :

- Utilisez les boutons **+** et **-** pour augmenter ou diminuer la quantité de chaque article.
- Pour retirer un article, diminuez la quantité jusqu'à zéro ou cliquez sur le bouton de suppression.
- Le total est recalculé automatiquement à chaque modification.

## 10. Renseigner l'adresse de livraison [C19]

Rendez-vous sur `/checkout` pour compléter vos informations de livraison.

Si votre commande contient des produits physiques, renseignez :

- **Nom complet** : Nom et prénom du destinataire.
- **Adresse** : Adresse de livraison complète.
- **Ville** : Ville de destination.
- **Code postal** : Code postal.
- **Pays** : Pays de destination.

## 11. Choisir le moyen de paiement [C22]

Sur la page de checkout :

- Sélectionnez votre moyen de paiement parmi ceux proposés (Stripe, PayPal, SumUp, Bitcoin, Lightning, virement bancaire, etc.).
- Les moyens de paiement disponibles dépendent de la configuration de la boutique.
- Les moyens sont affichés dans l'ordre défini par le vendeur.

## 12. Accepter les conditions générales de vente [C32]

Avant de valider votre commande :

- Cochez la case d'acceptation des conditions générales de vente (CGV).
- La validation de la commande est impossible sans acceptation des CGV.
- Un lien vers les CGV complètes est disponible à côté de la case à cocher.

## 13. Recevoir la confirmation par e-mail [C61]

Après le paiement :

- Un e-mail de confirmation est envoyé à l'adresse associée à votre compte.
- Cet e-mail contient un récapitulatif de la commande, le numéro de commande et un lien vers le détail de la commande.
- Si le paiement est en attente (ex. : paiement Bitcoin non confirmé), un e-mail de mise à jour sera envoyé lorsque le paiement sera validé.

## Récapitulatif du parcours

| Étape | Action | URL | Identifiant |
| ----- | ------ | --- | ----------- |
| Catalogue | Parcourir les produits | `/catalog` | C02 |
| Catégorie | Parcourir par tag | `/tag/[slug]` | C51 |
| Détail produit | Consulter un produit | `/product/[slug]` | C03 |
| Images | Zoomer/parcourir | `/product/[slug]` | C04 |
| Variation | Sélectionner une option | `/product/[slug]` | C05 |
| Quantité | Choisir la quantité | `/product/[slug]` | C06 |
| Panier | Ajouter au panier | `/product/[slug]` | C12 |
| Panier | Consulter le panier | `/cart` | C13 |
| Panier | Modifier les quantités | `/cart` | C14 |
| Checkout | Adresse de livraison | `/checkout` | C19 |
| Checkout | Moyen de paiement | `/checkout` | C22 |
| Checkout | Accepter les CGV | `/checkout` | C32 |
| Confirmation | E-mail de confirmation | - | C61 |