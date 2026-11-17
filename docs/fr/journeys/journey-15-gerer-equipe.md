# Comment gérer les accès de mon équipe ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide explique comment créer des comptes administrateurs, définir des rôles avec des permissions granulaires et gérer les accès de votre équipe dans be-BOP.

## 1. Créer un utilisateur administrateur [A80]

Rendez-vous sur **Admin** > **Config** > **ARM**, section **Users**.

- Cliquez sur **Create a user** pour ajouter un nouvel utilisateur.
- Remplissez les champs suivants :
  - **Login** : Identifiant de connexion de l'utilisateur.
  - **Alias** : Nom d'affichage de l'utilisateur dans l'interface.
  - **Password** : Un lien de réinitialisation de mot de passe sera envoyé à l'utilisateur pour qu'il définisse son mot de passe.

Chaque utilisateur peut être modifié ou supprimé via les icônes **Save** et **Delete** dans la liste des utilisateurs.

## 2. Créer des rôles avec permissions granulaires [A81]

Rendez-vous sur **Admin** > **Config** > **ARM**, section **Access Rights Management**.

- Cliquez sur **Create a role** pour ajouter un nouveau rôle.
- Configurez les champs suivants :
  - **Role ID** : Identifiant unique du rôle dans le système.
  - **Role name** : Nom convivial du rôle (ex. : "Super Admin", "Point of sale", "Ticket checker").
  - **Write access** : Chemins auxquels ce rôle a un accès en écriture.
    - Exemple : `/admin/*` pour donner un accès en écriture complet à l'administration.
    - Exemple : `/admin/ticket/:id/burn` pour autoriser uniquement la validation des tickets.
  - **Read access** : Chemins auxquels ce rôle a uniquement un accès en lecture.
  - **Forbidden access** : Chemins auxquels ce rôle n'a aucun accès.

> Vous pouvez combiner les accès en écriture, lecture et interdiction pour créer des rôles adaptés à chaque fonction de votre équipe.

## 3. Assigner un rôle à un utilisateur [A82]

Rendez-vous sur **Admin** > **Config** > **ARM**, section **Users**.

- Sélectionnez un utilisateur existant ou créez-en un nouveau.
- Dans le champ **Role**, choisissez le rôle à attribuer parmi ceux créés précédemment (ex. : "Super Admin", "Point of sale").
- Cliquez sur **Save** pour enregistrer l'attribution.

Le rôle détermine immédiatement les pages et actions accessibles par cet utilisateur.

## 4. Configurer les informations de récupération [A83]

Rendez-vous sur **Admin** > **Config** > **ARM**, section **Users**.

Pour chaque utilisateur, configurez les options de récupération de compte :

- **Recovery email** : Adresse e-mail permettant de récupérer l'accès au compte en cas de perte du mot de passe.
- **Recovery npub** : Clé publique Nostr pouvant être utilisée comme méthode alternative de récupération.

> Il est recommandé de renseigner au moins une méthode de récupération pour chaque utilisateur administrateur.

## 5. Activer ou désactiver un utilisateur [A84]

Rendez-vous sur **Admin** > **Config** > **ARM**, section **Users**.

- Localisez l'utilisateur dans la liste.
- Modifiez le champ **Status** pour basculer entre :
  - **Enabled** : L'utilisateur peut se connecter et accéder au back-office selon son rôle.
  - **Disabled** : L'utilisateur ne peut plus se connecter. Son compte est conservé mais inactif.
- Cliquez sur **Save** pour appliquer le changement.

> Désactiver un utilisateur est préférable à le supprimer si vous souhaitez conserver un historique ou réactiver le compte ultérieurement.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Créer un utilisateur | Admin user creation | A80 |
| Créer des rôles | Role management | A81 |
| Assigner un rôle | Role assignment | A82 |
| Récupération de compte | Recovery settings | A83 |
| Activer/désactiver | User status | A84 |

Pour plus de détails, consultez [Gestion des droits d'accès](../fr/WIP-team-access-management.md).