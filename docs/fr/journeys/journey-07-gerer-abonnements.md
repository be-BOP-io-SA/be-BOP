# Comment gérer mes abonnements ?

> **Parcours client** — Ce guide est destiné aux clients de la boutique.

Ce guide décrit comment consulter, renouveler et profiter des avantages de vos abonnements sur be-BOP.

## 1. Consulter les détails d'un abonnement [C49]

Rendez-vous sur `/subscription/[id]` pour afficher le détail d'un abonnement.

Les informations affichées comprennent :

- **Statut** : État actuel de l'abonnement (actif, expiré, en attente de renouvellement).
- **Date d'expiration** : Date à laquelle l'abonnement prendra fin ou devra être renouvelé.
- **Produit lié** : Le produit de type souscription associé à cet abonnement.
- **Historique des paiements** : Liste des paiements effectués pour cet abonnement.

## 2. Renouveler un abonnement [C50]

Sur la page `/subscription/[id]` :

1. Cliquez sur le bouton **Renouveler** (disponible lorsque l'abonnement est proche de son expiration ou déjà expiré).
2. Vous êtes redirigé vers la page de paiement pour effectuer le règlement du renouvellement.
3. Sélectionnez votre moyen de paiement et procédez au paiement.
4. Une fois le paiement validé, l'abonnement est prolongé et son statut est mis à jour.

> Pensez à renouveler votre abonnement avant sa date d'expiration pour conserver un accès ininterrompu aux avantages associés.

## 3. Bénéficier des réductions abonnement [C66]

Les abonnements actifs peuvent donner droit à des réductions automatiques :

- Les réductions sont appliquées automatiquement dans le panier et au moment du checkout.
- Le montant ou le pourcentage de réduction dépend de la configuration définie par le vendeur pour votre type d'abonnement.
- La réduction est visible dans le détail du panier avec une ligne dédiée indiquant le montant déduit.
- Si votre abonnement expire, les réductions ne sont plus appliquées lors de vos prochains achats.

## 4. Bénéficier des réductions limitées dans le temps [C67]

En complément des réductions liées aux abonnements, des réductions promotionnelles temporaires peuvent être proposées :

- Ces réductions ont une **date de début** et une **date de fin** définies par le vendeur.
- Elles sont appliquées automatiquement dans le panier si la date actuelle se situe dans la période de validité.
- Le montant ou pourcentage de réduction est affiché dans le détail du panier.
- Une fois la date de fin passée, la réduction n'est plus applicable.

> Consultez régulièrement les offres promotionnelles de la boutique pour ne pas manquer les réductions temporaires.

## Récapitulatif

| Action | URL | Identifiant |
| ------ | --- | ----------- |
| Détail d'un abonnement | `/subscription/[id]` | C49 |
| Renouveler un abonnement | `/subscription/[id]` | C50 |
| Réductions abonnement | Automatique (panier/checkout) | C66 |
| Réductions temporaires | Automatique (panier/checkout) | C67 |