# Comment gerer les paiements par acompte ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la configuration et la gestion des paiements par acompte (depot partiel) sur votre boutique be-BOP, permettant a vos clients de payer une partie du montant a la commande et le solde ulterieurement.

## 1. Configurer l'acompte sur un produit [A19]

Rendez-vous sur **Admin** > **Merch** > **Product** et selectionnez le produit concerne.

- Cochez la case **Allow partial deposit** pour activer le paiement par acompte sur ce produit.
- Definissez le montant de l'acompte :
  - **Pourcentage** : Indiquez un pourcentage du prix total (ex. : 30 %).
  - **Montant fixe** : Indiquez un montant fixe a payer en acompte.
- Le reste du montant sera du par le client lors d'un paiement ulterieur.

Cliquez sur **Update** pour enregistrer.

> L'acompte peut etre configure individuellement pour chaque produit. Les produits sans acompte active restent payables uniquement en totalite.

## 2. Choisir entre acompte et paiement integral (client) [C09]

Lorsqu'un produit propose le paiement par acompte, le client dispose d'un choix sur la page produit :

- **Payer l'acompte** : Le client ne paie que le montant de l'acompte configure (pourcentage ou montant fixe). Le solde restant sera a regler ulterieurement.
- **Payer le prix integral** : Le client paie la totalite du prix du produit immediatement.

Le client selectionne l'option souhaitee avant d'ajouter le produit au panier.

## 3. Affichage de l'acompte dans le panier [C17]

Lorsque le client a choisi de payer un acompte, le panier affiche clairement :

- **Montant de l'acompte** : Le montant a payer immediatement.
- **Solde restant** : Le montant restant a regler ulterieurement.
- **Prix total** : Le prix total du produit pour reference.

Le client peut ainsi verifier les montants avant de proceder au paiement.

## 4. Payer le solde restant (client) [C38]

Une fois la commande passee avec un acompte, le client peut regler le solde restant :

- Rendez-vous sur la page de paiement de la commande : `/order/[id]/payment/[paymentId]/pay`.
- Le montant restant a regler est affiche.
- Le client choisit un moyen de paiement et procede au reglement du solde.

> Le lien de paiement du solde est accessible depuis la page de detail de la commande. Le client peut egalement recevoir un rappel par email si le serveur SMTP est configure.

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Configurer l'acompte | Partial deposit on product | A19 |
| Choix acompte/integral (client) | Deposit vs full payment | C09 |
| Affichage acompte dans le panier | Cart deposit display | C17 |
| Payer le solde restant (client) | Pay pending order balance | C38 |