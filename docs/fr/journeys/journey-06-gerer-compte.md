# Comment gérer mon compte et mes préférences ?

> **Parcours client** — Ce guide est destiné aux clients de la boutique.

Ce guide décrit comment vous connecter à votre compte be-BOP, gérer vos sessions et mettre à jour vos informations personnelles.

## 1. Se connecter via un lien magique par e-mail [C43]

Rendez-vous sur `/login`.

1. Saisissez votre adresse e-mail dans le champ prévu.
2. Cliquez sur le bouton de connexion.
3. Un e-mail contenant un lien magique (lien unique à usage limité) est envoyé à votre adresse.
4. Ouvrez l'e-mail et cliquez sur le lien pour vous authentifier automatiquement.

> Le lien magique a une durée de validité limitée. Si le lien a expiré, demandez-en un nouveau depuis `/login`.

## 2. Se connecter via Nostr (npub) [C44]

Rendez-vous sur `/login`.

1. Saisissez votre npub (clé publique Nostr) dans le champ prévu.
2. Authentifiez-vous via le protocole Nostr (extension de navigateur ou application compatible).
3. Une fois authentifié, votre session est ouverte.

La connexion Nostr vous permet également de recevoir des notifications de commande via le réseau Nostr.

## 3. Se connecter via OAuth (SSO) [C45]

Rendez-vous sur `/login`.

Selon la configuration de la boutique, les fournisseurs OAuth suivants peuvent être disponibles :

- **Google** : Connexion avec votre compte Google.
- **Facebook** : Connexion avec votre compte Facebook.
- **Twitter** : Connexion avec votre compte Twitter.
- **GitHub** : Connexion avec votre compte GitHub.
- **Fournisseurs personnalisés** : D'autres fournisseurs OAuth peuvent être configurés par le vendeur.

Cliquez sur le bouton du fournisseur souhaité et suivez les étapes d'autorisation.

## 4. Gérer sa session [C46]

Sur la page `/login`, vous pouvez gérer vos sessions actives :

- **Déconnecter l'e-mail** : Supprime l'association e-mail de la session en cours.
- **Déconnecter le npub** : Supprime l'association Nostr de la session en cours.
- **Déconnecter le SSO** : Supprime la session OAuth en cours.

Chaque méthode de connexion peut être déconnectée indépendamment. Vous pouvez combiner plusieurs méthodes de connexion sur un même compte.

## 5. Mettre à jour ses informations personnelles [C47]

Rendez-vous sur `/identity` pour modifier vos informations.

- **Nom** : Prénom et nom de famille.
- **Adresse** : Adresse postale complète (rue, ville, code postal, pays).

Ces informations sont utilisées pour la livraison et la facturation. Mettez-les à jour avant de passer commande pour éviter toute erreur.

## 6. Gérer les préférences newsletter [C48]

Rendez-vous sur `/identity`, section newsletter.

- Activez ou désactivez votre inscription à la newsletter de la boutique.
- Lorsque la newsletter est activée, vous recevrez les communications commerciales de la boutique par e-mail.
- Vous pouvez modifier cette préférence à tout moment.

## Récapitulatif

| Action | URL | Identifiant |
| ------ | --- | ----------- |
| Connexion par e-mail (lien magique) | `/login` | C43 |
| Connexion par Nostr (npub) | `/login` | C44 |
| Connexion par OAuth (SSO) | `/login` | C45 |
| Gestion de session | `/login` | C46 |
| Informations personnelles | `/identity` | C47 |
| Préférences newsletter | `/identity` | C48 |