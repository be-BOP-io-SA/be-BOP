# Gestion des droits d'accès

La fonctionnalité de gestion des droits d'accès vous permet de définir des rôles et des autorisations pour les utilisateurs de votre be-bop, en fonction des actions qu'ils peuvent exécuter et des ressources auxquelles ils peuvent accéder. Elle est disponible sur **Admin** > **Config** > **ARM**.

![image](https://github.com/user-attachments/assets/811fcac8-e064-47cd-a420-16957cd96a08)

## Configuration des rôles

Dans la section **Access Rights Management**:

- **Create a role** : Cliquez sur **Create a role** pour ajouter un nouveau rôle.

![image](https://github.com/user-attachments/assets/20e6e835-c0c4-49f4-8e6e-5fbe92d1f81c)

Dans la section **Access Rights Management** on peut modifier direcetment un role.

![image](https://github.com/user-attachments/assets/2123040e-804d-4209-95bd-3b9f578ac657)

Lorsqu'on ajoute ou modifie un role on a les parametres suivants:

- **Role ID** : Identifiant unique du rôle, utilisé pour référencer ce rôle dans le système.
- **Role name** : Nom convivial du rôle pour identifier la fonction (ex. "Super Admin", "Point of sale", "Ticket checker").
- **Write access** : Définissez les chemins auxquels ce rôle a un accès en écriture.
  Exemples :
  - `/admin/*` pour permettre l'accès en écriture à toutes les sections de l'administration.
  - `/admin/ticket/:id/burn` pour autoriser uniquement l'accès à la validation des tickets.
- **Read access** : Définissez les chemins auxquels ce rôle a uniquement un accès en lecture.
- **Forbidden access** : Spécifiez les ressources auxquelles ce rôle n’a aucun accès.

Chaque rôle peut être modifié ou supprimé en utilisant les icônes correspondantes dans la colonne **Save** et **Delete**.

## Gestion des utilisateurs

La section **Users** vous permet de gérer les utilisateurs de l'application.

- **Créer un utilisateur** : Cliquez sur **Create a user** pour ajouter un nouvel utilisateur.

![image](https://github.com/user-attachments/assets/c25ae7e8-b366-4442-8871-96037c4ee5c5)

Modifer directement un utilisateur.

![image](https://github.com/user-attachments/assets/91e0ca84-0b47-4242-9378-98debc99b75e)

Lorsqu'on ajoute ou modifie un utilisateur on a les parametres suivants:

- **Login** : Identifiant de connexion de l'utilisateur.
- **Alias** : Alias ou nom d'affichage de l'utilisateur.
- **Recovery email** : Adresse e-mail pour la récupération de compte.
- **Recovery npub** : Clé publique de récupération, si utilisée dans votre système.
- **Role** : Sélectionnez le rôle attribué à l'utilisateur (ex. "Super Admin", "Point of sale").
- **Status** : État du compte utilisateur, activé ou désactivé.
- **password** : Réinitialisez le mot de passe de l'utilisateur en cliquant sur l'icône de réinitialisation. Cet option enverra un message avec un lien pour réinitialiser le mot de passe

Chaque utilisateur peut être modifié ou supprimé en utilisant les options dans les colonnes **Save** et **Delete**.

---

Cette gestion des droits d'accès permet d'assurer une sécurité accrue en limitant l'accès aux ressources et actions de l'application selon les responsabilités de chaque utilisateur.
