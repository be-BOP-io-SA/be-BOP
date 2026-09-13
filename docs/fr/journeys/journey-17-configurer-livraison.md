# Comment configurer les frais de livraison ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration des frais d'envoi et des options de livraison pour votre boutique be-BOP.

## 1. Configurer les frais de livraison globaux [A62]

Rendez-vous sur **Admin** > **Config** > **Delivery** (/admin/config/delivery).

### Mode de calcul des frais

Choisissez l'un des deux modes principaux :

- **Flat fees** (participation forfaitaire aux frais de port) :
  - Chaque commande est facturée un montant fixe dans une devise définie.
  - Option : **Apply flat fee for each item instead of once for the whole order** pour appliquer le forfait à chaque ligne article plutôt qu'à l'ensemble du panier.

- **Fees depending on product** (frais dépendant du produit) :
  - Chaque produit possède ses propres frais de port, cumulés au panier.
  - Option : **For orders with multiple products, only apply the delivery fee of the product with the highest delivery fee** pour appliquer uniquement les frais les plus élevés.

### Zones d'envoi

- Définissez des frais de port par pays en ajoutant les pays concernés.
- Utilisez **Other countries** pour fixer un tarif par défaut applicable à tous les pays non configurés individuellement.
- Si aucune zone n'est définie, les frais d'envoi ne seront pas calculés.

> Les frais d'envoi ne s'appliquent qu'aux produits pour lesquels l'option de livraison physique est activée (voir section 3).

## 2. Autoriser la livraison gratuite pour le point de vente [A63]

Rendez-vous sur **Admin** > **Config** > **Delivery**.

- Activez la case permettant la livraison gratuite pour les commandes passées via le point de vente (POS).
- Lorsque cette option est cochée, les commandes créées depuis le POS ne se voient pas appliquer de frais de livraison, même si des frais sont configurés pour les commandes en ligne.

> Cette option est utile lorsque le client récupère sa commande directement en magasin.

## 3. Configurer les paramètres de livraison par produit [A27]

Rendez-vous sur **Admin** > **Merch** > **Products**, puis éditez un produit (/admin/product/{id}).

- Activez l'option **The product has a physical component that will be shipped to the customer's address** si le produit nécessite une livraison physique.
- Seuls les produits avec cette option activée déclencheront le calcul des frais de port.
- Les produits téléchargeables, dons ou abonnements n'ont pas besoin de cette option.

### Article Standalone

- Activez l'option **This is a standalone product** pour les articles volumineux ou fragiles nécessitant un envoi séparé.
- Chaque ajout au panier créera une ligne article distincte au lieu de simplement incrémenter la quantité.
- En mode **Flat fees par article**, chaque ligne compte séparément dans le calcul des frais.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Frais de livraison globaux | Delivery fees configuration | A62 |
| Livraison gratuite POS | Free delivery for POS | A63 |
| Livraison par produit | Product delivery settings | A27 |

Pour plus de détails, consultez [Gestion des frais d'envoi](../fr/delivery-management.md).