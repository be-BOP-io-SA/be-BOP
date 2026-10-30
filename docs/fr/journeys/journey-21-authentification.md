# Comment permettre à mes clients de se connecter facilement ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la configuration des différentes méthodes d'authentification proposées à vos clients dans be-BOP : OAuth, magic link par email et connexion Nostr.

## 1. Ajouter des fournisseurs OAuth [A91]

Rendez-vous sur **Admin** > **Config** > **OAuth**.

Pour chaque fournisseur, configurez les champs suivants :

- **Client ID** : Identifiant de l'application fourni par le fournisseur OAuth.
- **Client Secret** : Clé secrète de l'application.
- **Issuer URL** : URL de l'émetteur (pour les fournisseurs OIDC compatibles).

### Fournisseurs supportés

- **Google** : Connexion via compte Google.
- **Facebook** : Connexion via compte Facebook.
- **Twitter** : Connexion via compte Twitter/X.
- **GitHub** : Connexion via compte GitHub.
- **Custom OIDC** : Tout fournisseur compatible OpenID Connect en renseignant l'Issuer URL.

Cliquez sur **Save** pour enregistrer chaque fournisseur. Les boutons de connexion correspondants apparaitront automatiquement sur la page **/login** de votre boutique.

> Pour obtenir les identifiants Client ID et Client Secret, créez une application dans la console développeur de chaque fournisseur (Google Cloud Console, Facebook Developer, etc.).

## 2. Connexion par magic link email (client) [C43]

Depuis la page **/login** de votre boutique :

- Le client saisit son adresse email dans le champ dédié.
- Un email contenant un **lien de connexion unique** (magic link) est envoyé à cette adresse.
- Le client clique sur le lien dans l'email pour s'authentifier automatiquement.
- Aucun mot de passe n'est nécessaire : le lien est valide pour une durée limitée et une seule utilisation.

> La connexion par magic link nécessite que le serveur SMTP soit correctement configuré (voir [Configuration des emails](../fr/journey-18-emails-notifications.md)).

## 3. Connexion via Nostr npub (client) [C44]

Depuis la page **/login** de votre boutique :

- Le client saisit sa clé publique Nostr (npub) dans le champ dédié.
- Le système vérifie la clé et authentifie le client.
- Le client accède à son espace personnel associé à son identité Nostr.

> La connexion via npub nécessite que Nostr soit configuré sur votre be-BOP (voir [Configuration Nostr](../fr/journey-19-configurer-nostr.md)).

## 4. Connexion via OAuth (client) [C45]

Depuis la page **/login** de votre boutique :

- Les boutons des fournisseurs OAuth configurés sont affichés (ex. : "Se connecter avec Google").
- Le client clique sur le bouton du fournisseur de son choix.
- Il est redirigé vers la page d'authentification du fournisseur (Google, Facebook, etc.).
- Après validation, le client est automatiquement redirigé vers votre boutique, connecté.

> Seuls les fournisseurs configurés dans **Admin** > **Config** > **OAuth** apparaissent sur la page de connexion.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Fournisseurs OAuth | OAuth provider configuration | A91 |
| Magic link email | Email magic link login | C43 |
| Connexion Nostr | Nostr npub login | C44 |
| Connexion OAuth | OAuth login | C45 |

Pour plus de détails, consultez [Configuration Nostr](../fr/journey-19-configurer-nostr.md) et [Configuration des emails](../fr/journey-18-emails-notifications.md).