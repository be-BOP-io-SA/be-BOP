# Comment vendre en point de vente avec l'écran tactile ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration et l'utilisation du point de vente (POS) be-BOP, de l'ouverture de session jusqu'à la clôture de caisse.

## 1. Configurer les paramètres POS [A89]

Rendez-vous sur **Admin** > **Config** > **POS**.

- Configurez les tags qui serviront de menus de navigation sur l'écran tactile `/pos/touch`.
- Créez un tag nommé `pos-favorite` pour afficher des articles en favoris par défaut sur l'interface tactile.
- Définissez les options spécifiques au comportement de la caisse (exemption de TVA, remise cadeau, offrir les frais de port, etc.).

## 2. Configurer les moyens de paiement POS [A102]

Rendez-vous sur **Admin** > **Config**, section paiements.

- Activez les moyens de paiement disponibles en caisse : Lightning, Bitcoin on-chain, carte bancaire (SumUp), virement bancaire.
- Le mode de paiement **Point of Sale** permet de gérer les encaissements hors-système (espèces, chèque, TPE physique, etc.).
- Vous pouvez activer le **paiement multiple** pour scinder une commande sur plusieurs moyens de paiement.

## 3. Ouvrir et fermer une session POS [A120]

Rendez-vous sur `/pos` après vous être connecté avec un compte ayant le rôle POS.

- **Ouvrir une session** : Cliquez sur le bouton d'ouverture pour démarrer la session de caisse. La session enregistre toutes les transactions effectuées.
- **Fermer une session** : En fin de journée ou de service, fermez la session depuis `/pos`. Cela déclenche la génération du ticket Z (voir section 11).
- L'affichage des dernières transactions est disponible pour le suivi et le SAV.

> Pour un usage en magasin, choisissez un temps de maintien de connexion de "1 day" afin d'éviter les déconnexions en pleine session de vente.

## 4. Parcourir et rechercher des produits [A121]

Rendez-vous sur `/pos/touch` pour accéder à l'interface tactile.

L'interface est divisée en plusieurs zones :

- **Favoris** : Articles marqués comme favoris (via le tag `pos-favorite`) pour un accès rapide.
- **Tags Articles** : Menus de navigation par catégorie, configurés depuis **Admin** > **Config** > **POS**.
- **Tous les Articles** : Liste complète des articles disponibles avec images et noms.
- **Recherche** : Utilisez le champ de recherche pour trouver rapidement un article par nom ou alias.

## 5. Créer des onglets de commande [A122]

Sur `/pos/touch`, utilisez la fonction **Tickets** pour gérer plusieurs commandes en parallèle.

- Chaque onglet représente une commande distincte (ex. : table 1, table 2, client A).
- Basculez d'un onglet à l'autre pour ajouter des articles à différentes commandes.
- Utilisez le bouton **Sauver** pour enregistrer l'état du panier en cours.

## 6. Ajouter des articles, modifier les quantités, ajouter des notes [A123]

### Ajouter un article

- Cliquez sur un article dans la zone produits pour l'ajouter au panier (bloc ticket à gauche).
- L'article apparaît immédiatement dans le panier avec sa quantité et son prix.

### Modifier la quantité

- Cliquez sur l'article dans le panier pour ajuster la quantité.
- Utilisez le bouton **X** pour supprimer la dernière ligne du panier ou la corbeille pour vider le panier.

### Ajouter une note

- Cliquez sur le **nom de l'article** dans le panier pour ouvrir le champ de note.
- Saisissez la note (ex. : "sans gluten", "cuisson à point") et validez.
- La note sera visible sur le ticket de commande.

## 7. Diviser une commande entre onglets [A124]

Utilisez la fonction **Pool** pour scinder une commande.

- Sélectionnez les articles à déplacer vers un autre onglet.
- Cette fonctionnalité permet de gérer les additions séparées ou de répartir les articles entre plusieurs clients.

## 8. Procéder au paiement [A125]

Cliquez sur le bouton **Payer** pour finaliser la vente.

- Vous êtes redirigé vers la page `/checkout` avec le récapitulatif du panier.
- Sélectionnez le moyen de paiement et finalisez la transaction.
- En cas de paiement Lightning ou Bitcoin, le QR code est affiché sur l'écran client (`/pos/session`).
- En cas de paiement **Point of Sale** (espèces, TPE), renseignez le justificatif et validez manuellement.

### Paiement multiple

- Activez l'option "Utiliser plusieurs modes de paiement" au `/checkout`.
- Encaissez chaque partie séparément (ex. : 30 EUR en CB, 20 EUR en Lightning, le reste en espèces).
- La commande est validée une fois le montant total atteint.

## 9. Imprimer un ticket de cuisine [A126]

Depuis `/pos/touch`, après ajout des articles au panier :

- Cliquez sur le bouton d'impression du ticket de cuisine.
- Le ticket liste les articles et les notes associées, destiné à la préparation en cuisine.
- Nécessite une imprimante connectée au poste de caisse.

## 10. Générer un ticket X (rapport intra-journée) [A127]

Rendez-vous sur `/pos/x-ticket`.

- Le ticket X fournit un récapitulatif des transactions depuis l'ouverture de la session en cours.
- Il permet de vérifier les encaissements à tout moment de la journée sans clôturer la session.
- Les totaux sont ventilés par moyen de paiement.

## 11. Générer un ticket Z (rapport de fin de journée) [A128]

Rendez-vous sur `/pos/closing`.

- Le ticket Z clôture la session de caisse et génère le rapport final.
- Il récapitule l'ensemble des transactions de la session : montants par moyen de paiement, nombre de commandes, TVA collectée.
- Ce rapport sert de base pour la réconciliation comptable quotidienne.

> Le ticket Z fige les données de la session. Une fois généré, la session est fermée et une nouvelle session devra être ouverte pour continuer les ventes.

## 12. Consulter l'historique des sessions POS [A129]

Rendez-vous sur `/pos/history`.

- Consultez la liste de toutes les sessions POS passées.
- Chaque session affiche la date d'ouverture, de fermeture et le récapitulatif des transactions.
- Cela permet un suivi historique et la vérification des rapports de clôture.

## 13. Interdire l'accès POS touch hors session [A130]

Rendez-vous sur **Admin** > **Config**.

- Activez l'option permettant d'interdire l'accès à `/pos/touch` lorsque la session POS est fermée.
- Cela empêche la création de commandes accidentelles en dehors des heures d'ouverture.
- Lorsque cette option est active, les utilisateurs POS doivent d'abord ouvrir une session sur `/pos` avant de pouvoir accéder à l'écran tactile.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Paramètres POS | Configuration générale | A89 |
| Paiements POS | Moyens de paiement en caisse | A102 |
| Session POS | Ouverture et fermeture | A120 |
| Parcourir produits | Interface tactile | A121 |
| Onglets commande | Gestion multi-commandes | A122 |
| Articles et notes | Ajout, quantité, annotations | A123 |
| Division commande | Scinder entre onglets | A124 |
| Paiement | Encaissement et validation | A125 |
| Ticket cuisine | Impression pour préparation | A126 |
| Ticket X | Rapport intra-journée | A127 |
| Ticket Z | Rapport de clôture | A128 |
| Historique sessions | Consultation passée | A129 |
| Restriction hors session | Interdire POS touch | A130 |