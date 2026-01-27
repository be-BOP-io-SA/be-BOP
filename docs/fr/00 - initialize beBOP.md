# Initialiser votre be-BOP

Résumé rapide et imparfait avant une documentation plus propre

Une fois votre be-BOP installé (n'oubliez pas le readme.md) :

## Compte uper-admin

- Allez sur votre-site/admin/login
- créez votre compte superadmin et votre mot de passe

## /admin/config (via Admin / Config)

### Protégez l'accès à votre back-office

Allez dans /admin/config, allez dans "Admin hash", définissez un hash, et sauvegardez.
Désormais, l'adresse du backoffice est /admin-yourhash

### Faites passer votre be-BOP en mode maintenance

Allez dans /admin/config, cochez "Activer le mode maintenance".
Vous pouvez indiquer n'importe quel IPv4 séparé par des virgules pour autoriser l'accès au front-office.
Le back-office sera toujours ouvert.

### Définissez vos devises
Allez dans /admin/config :
- la devise principale est utilisée pour être affichée sur les pages du be-BOP et sur les factures
- la deuxième devise est optionnelle et est utilisée pour être affichée sur les pages du be-BOP
- la devise de référence du prix est la devise par défaut dans laquelle vous créerez votre prix, mais vous pourrez la modifier produit par produit.
  - en cliquant sur le bouton rouge et en confirmant, les devises de vos produits seront remplacées par la sélection choisie, mais le prix ne sera pas mis à jour.
- La monnaie de compte permet à un be-BOP entièrement en BTC d'enregistrer le taux de change du Bitcoin au moment de la commande.

### Timing

La durée de l'abonnement est utilisée pour le produit d'abonnement, vous pouvez choisir le mois, la semaine ou le jour.
Le rappel d'abonnement est le délai entre l'envoi de la nouvelle proposition de facture et l'abonnement.

### Blocs de confirmation

Pour les paiements Bitcoin on-chain, vous pouvez soit définir un nombre standard de vérification pour la transaction.
Mais avec "Gérer les seuils de confirmation", vous pourrez le faire en fonction du prix, par exemple :
- < 100€ : 0 confirmation
- 100€ à 1000€ : 1 confirmation
- 1000€ à 9999999999999€ : 2 confirmations
etc

### Expiration de la commande

"Définir le délai de paiement souhaité (en minutes)" permet d'annuler une commande sur le système be-BOP si la transaction n'a pas été suffisamment payée ou vérifiée.
Cette option n'est valable que pour le Bitcoin-onchain, le Lightning et les cartes de crédit par sum up.
Un temps trop court vous obligera à avoir une cible de bloc de confirmation onchain courte / nulle.
Un délai trop long bloquera le stock de vos produits pendant que la commande est en attente.

### Réservation de stock
Pour éviter que le stock ne se privatise par un client, vous pouvez définir "Combien de temps un panier réserve-t-il le stock (en minutes)".
Lorsque j'ajoute un produit à mon panier, si c'est le dernier, personne ne pourra le faire.
Mais si je ne traite pas ma commande et si j'attends plus longtemps que le délai défini, le produit sera à nouveau disponible et retiré de mon panier si quelqu'un d'autre l'achète.

### TBD

## /admin/identity (via Config / Identity)

Ici, toutes les informations concernant votre entreprise seront utilisées pour les factures et les reçus.

Les "Informations de la facture" sont optionnelles et seront ajoutées en haut à droite de la facture.

Pour permettre le paiement par "virement bancaire", vous devez renseigner votre "Compte bancaire" IBAN et BIC.

L'email de contact sera utilisé comme "send as" pour l'email et affiché en bas de page.

## /admin/nostr (par la gestion des nœuds / Nostr)

Allez dans /admin/nostr (via Node management / Nostr) puis cliquez sur "Créer une nsec" si vous n'en avez pas déjà une.
Ensuite, vous pouvez l'ajouter dans le fichier .env.local avant (voir readme.md)

## /admin/sumup (par l'intermédiaire d'un partenaire de paiement / Sum Up)

Une fois que vous avez votre compte Sum Up, utilisez leur interface de développement et copiez la clé API ici.
Le code Merchand peut être trouvé sur votre tableau de bord, ou sur vos reçus de transactions précédentes.
La devise est la devise de votre compte Sum Up (en général, celle du pays d'origine de votre entreprise).

# Le reste

Pour l'instant, et pour les réflexions en dehors du back-office, n'oubliez pas le readme.md.

Le tableau des gouvernants sera bientôt publié, mais, en bref, chaque demande d'extraction sera examinée par :
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
Et si nous sommes d'accord, nous ferons un merge.

Nous refuserons les besoins ultra-spécifiques et irons vers des fonctionnalités génétiques qui peuvent être utilisées par le plus grand nombre.
