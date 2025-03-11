Configuration des langues

La section **Admin** > **Config** > **Languages** vous permet de définir les langues disponibles dans votre application ainsi que de configurer la langue par défaut.

## Fonctionnalités

### Langues disponibles

- **Liste des langues** : Cochez les cases des langues que vous souhaitez rendre disponibles dans votre application be-bop. Vous devez sélectionner au moins une langue.

  - Exemple : `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Langue par défaut

- **Langue par défaut** : Sélectionnez une langue qui sera utilisée si la traduction préférée de l'utilisateur n'est pas disponible parmi les options.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Gestion du sélecteur de langue

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Afficher ou masquer le sélecteur de langue** : Cliquez sur le lien **here** pour gérer la visibilité du sélecteur de langue dans l'interface utilisateur.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Clés de Traduction Personnalisées

La section **Custom Translation Keys** permet de personnaliser les traductions pour différentes langues dans votre application.

## Fonctionnalités

### Vue d'ensemble

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- Vous pouvez définir des **clés de traduction spécifiques** pour chaque langue disponible.
- Les clés de traduction sont définies au format JSON. Cela permet une gestion simple et structurée de vos traductions.

### Édition des traductions

1. **Sélectionnez une langue** :
   - Chaque langue est représentée dans une section distincte (par exemple, `en` pour anglais, `es-sv` pour espagnol d'El Salvador).
2. **Ajoutez vos traductions** :
   - Ajoutez ou modifiez des clés et leurs valeurs dans le champ de texte JSON.
   - Exemple `en` :
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Sauvegarde

- Une fois les traductions ajoutées ou modifiées, les changements sont automatiquement appliqués après validation et sauvegarde.
