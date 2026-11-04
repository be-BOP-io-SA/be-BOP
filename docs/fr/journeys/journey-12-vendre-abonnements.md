# Comment vendre des produits par abonnement ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la création et la gestion de produits par abonnement (subscription), de la configuration du produit jusqu'au suivi des souscriptions.

## 1. Configurer un produit comme abonnement [A15]

Rendez-vous sur **Admin** > **Merch** > **Product**.

Créez un nouveau produit ou éditez un produit existant, puis définissez son type comme **Subscription**.

### Paramètres spécifiques

- **Type** : Sélectionnez "Subscription" dans le champ type du produit.
- **Prix** : Définissez le montant de l'abonnement (mensuel, annuel, ou selon votre modèle).
- **Canaux de vente** : Configurez les canaux sur lesquels l'abonnement est disponible (e-shop, POS, etc.) via le canal selector.

> Un produit de type abonnement a une quantité fixée à 1 par commande. Un client ne peut pas ajouter deux fois le même abonnement dans son panier.

## 2. Configurer la durée et les rappels d'abonnement [A54]

Rendez-vous sur **Admin** > **Config**, section abonnements.

- **Durée de l'abonnement** : Définissez la période de validité de l'abonnement (ex. : 30 jours, 90 jours, 365 jours).
- **Rappels** : Configurez les notifications de rappel envoyées aux abonnés avant l'expiration de leur abonnement.
- Les rappels sont envoyés par e-mail ou via Nostr selon les coordonnées fournies par le client.

> Sans adresse e-mail ou npub, l'abonnement ne pourra pas être renouvelé car aucun appel à paiement ne pourra être envoyé au client.

## 3. Créer des remises pour les abonnés [A44]

Rendez-vous sur **Admin** > **Merch** > **Discount**.

- Créez une remise (pourcentage ou produit offert) réservée aux abonnés.
- Définissez le type et la valeur de la remise.

Pour plus de détails sur la création de remises, consultez [Promotions et remises](../fr/journey-11-promotions-remises.md).

## 4. Associer la remise à l'abonnement [A45]

Depuis la fiche de la remise :

- Sélectionnez le produit abonnement auquel la remise est liée.
- Les clients disposant d'un abonnement actif bénéficieront automatiquement de la remise sur les produits éligibles.

### Exemple

- Produit abonnement : "Carte de fidélité annuelle" a 50 EUR/an.
- Remise associée : -10 % sur tout le catalogue.
- Résultat : Tout client ayant souscrit à la carte bénéficie de 10 % de réduction sur ses achats.

## 5. Suivre les souscriptions

### Onglet souscriptions sur la page produit

Lorsqu'un produit est de type Subscription, un onglet supplémentaire **Souscriptions** apparaît sur sa fiche d'administration.

- Cet onglet liste toutes les souscriptions actives pour ce produit.
- Vous pouvez consulter le statut de chaque souscription (active, expirée, en attente de renouvellement).

### Exporter les souscriptions

- Cliquez sur le bouton d'export pour télécharger la liste des souscriptions au format **Excel**.
- L'export contient les informations client, les dates de début et de fin, et le statut de chaque souscription.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Produit abonnement | Définir le type Subscription | A15 |
| Durée et rappels | Configuration des périodes | A54 |
| Remises abonnés | Créer des réductions | A44 |
| Lier remise | Associer à l'abonnement | A45 |
| Suivi | Onglet souscriptions et export Excel | -- |