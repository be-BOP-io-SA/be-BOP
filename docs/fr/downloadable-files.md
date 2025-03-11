# Ajouter des fichiers téléchargeables aux produits ou pages CMS

Ce guide explique comment ajouter des fichiers téléchargeables (par exemple, des notices ou des guides produits) qui sont accessibles publiquement et ne sont pas protégés par des tokens ou des commandes. Ces fichiers peuvent être liés directement aux pages de produit ou aux pages CMS.

## Étape 1 : Accéder à la section **Files**

1. Connectez-vous au panneau d'administration.
2. Naviguez vers la section **Merch** dans le menu supérieur.
3. Cliquez sur **Files** dans le sous-menu.

## Étape 2 : Ajouter un nouveau fichier

![image](https://github.com/user-attachments/assets/3b9ca426-34f1-4905-af05-24f3b16ade14)

1. Sur la page **List of file with no associated product**, cliquez sur **New file**.

![image](https://github.com/user-attachments/assets/f4f64cd9-bedb-4af9-8626-90178c95b178)

2. Remplissez les champs requis :

   - **Name of the file** : Fournissez un nom descriptif (par exemple, "Notice produit").
   - **File** : Téléchargez le fichier en cliquant sur **Parcourir...** et en sélectionnant le fichier approprié depuis votre ordinateur.

3. Cliquez sur le bouton **Add** pour télécharger le fichier.

![image](https://github.com/user-attachments/assets/2687f745-4c29-4c85-8c92-6df71c041b91)

4. **Gérer un fichier existant :**

   - Une fois le fichier ajouté, vous pouvez le visualiser dans la liste des fichiers.
   - Cliquez sur un fichier pour modifier son nom, obtenir un lien ou le supprimer
   - **Lien permanent :**  
      Une fois le fichier ajouté, un lien permanent valide est généré. Vous pouvez le copier en cliquant sur l'icône "Copier" située à côté du lien.
     Exemple de lien :  
      `http://localhost:5173/digital-file/raw/<file-name>?key=<unique-key>`
     Vous pouvez utiliser ce lien dans vos pages CMS pour patagre vos fichier.
   - **Télécharger directement :**  
     Les utilisateurs peuvent cliquer sur le bouton **"Download file"** pour accéder immédiatement au fichier.
   - **Supprimer un fichier**
     Si un fichier n'est plus nécessaire, ouvrez-le depuis la liste et cliquez sur **"Delete"**. Une confirmation vous sera demandée avant la suppression définitive.
