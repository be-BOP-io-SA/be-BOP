# Comment configurer la TVA pour mon activité ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration du régime de TVA et des taux personnalisés pour votre boutique be-BOP.

## 1. Configurer le régime de TVA [A58]

Rendez-vous sur **Admin** > **Config**, section TVA.

be-BOP propose trois grands régimes de TVA :

- **Exemption de TVA** : Activez l'option **Disable VAT for my be-BOP** pour appliquer une TVA de 0% sur l'ensemble des commandes. Adapté aux entreprises bénéficiant d'une exemption légale.
- **TVA du pays du vendeur** : Activez l'option **Use VAT rate from seller's country** puis sélectionnez votre pays dans **Seller's country for VAT purposes**. Le taux de TVA de votre pays sera appliqué à toutes les commandes.
- **TVA du pays de l'acheteur** : Sans activer d'option de régime spécifique, la TVA appliquée sera celle du pays du client, déterminée par sa géolocalisation IP puis confirmée par son adresse de livraison.

> Le régime de TVA dépend du statut de votre entreprise, de votre type d'activité et de votre chiffre d'affaires annuel. Consultez votre comptable pour déterminer le régime adapté.

## 2. Créer des taux de TVA personnalisés par pays [A59]

Rendez-vous sur **Admin** > **Config** > **Custom VAT Rates** (accessible via le lien dans la page /admin/config ou directement sur /admin/config/vat).

- Cliquez sur **Create** pour ajouter un nouveau profil de TVA.
- Donnez un nom au profil (ex. : "Livres", "Produits culturels").
- Renseignez un taux de TVA personnalisé par pays.
  - Sans précision pour un pays donné, le taux de TVA par défaut du pays sera appliqué.
- Enregistrez le profil.

Ensuite, dans **Admin** > **Merch** > **Products** > édition d'un produit, sélectionnez le profil de TVA personnalisé dans le champ dédié. "No custom VAT profile" appliquera la TVA générale de votre be-BOP.

La TVA de chaque article sera détaillée dans le panier et sur la facture.

## 3. Définir le motif d'exemption de TVA [A60]

Rendez-vous sur **Admin** > **Config**, section TVA.

Lorsque l'option **Disable VAT for my be-BOP** est activée :

- Le champ **VAT exemption reason (appears on the invoice)** devient disponible.
- Saisissez le texte légal justifiant l'absence de TVA.
- Ce motif sera imprimé sur chacune de vos factures.

Exemples de motifs courants en France :
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*

## 4. Appliquer une TVA à 0% pour les livraisons à l'étranger [A61]

Rendez-vous sur **Admin** > **Config**, section TVA.

Si vous utilisez le régime **TVA du pays du vendeur** :

- Activez l'option **Make VAT = 0% for deliveries outside seller's country**.
- Pour les clients se faisant livrer dans votre pays, la TVA de votre pays reste appliquée.
- Pour les clients se faisant livrer à l'étranger, la TVA sera de 0%.
- Les articles téléchargeables, dons et abonnements conservent la TVA du pays du vendeur.

> Lorsque cette option est activée, le client devra valider la mention **I understand that I will have to pay VAT upon delivery** dans le tunnel de commande (/checkout). Pensez à créer la page CMS /why-vat-customs pour expliquer cette obligation.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Régime de TVA | VAT regime | A58 |
| Taux personnalisés | Custom VAT rates | A59 |
| Motif d'exemption | VAT exemption reason | A60 |
| TVA 0% export | Zero-rating international | A61 |

Pour plus de détails, consultez [Gestion des régimes et taux de TVA](../fr/VAT-configuration.md).