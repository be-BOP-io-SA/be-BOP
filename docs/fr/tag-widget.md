# Documentation Tag Widget

Accessible sur **Admin** > **Widgets** > **Tag** les tags sont :

- Un moyen de gérer les créateurs/marques/catégories sans un système de gestion de catégorie/marques/fabricant lourd.
- Un moyen d'habiller et de donner de la profondeur aux pages web be-bOP avec du contenu à la fois statique et dynamique sur les pages CMS.
- Un moyen de donner aux partenaires et aux vendeurs un moyen d'avoir un beau catalogue bien rempli, rempli de contexte autour des produits, les catégories pseudo-dynamiques n'étant pas seulement une liste de produits.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Tag Family

Les tags sont classés en 4 familles pour faciliter leur organisation.

- Creators : pour les tags créateurs
- Retailers : pour les tags liés à une boutique
- Temporal : pour les tags temporels
- Events : pours les tags d'evenement

## Les tags Special

Il existe un tag special `pos-favorite` cf [pos-touch-screen.md].

## Ajouter un Tag

Pour ajouter un tag cliquez sur **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

L'interface **"Add a tag"** permet aux utilisateurs d'ajouter un nouveau tag avec des informations spécifiques, telles que le nom, le slug, la family, le titre, le sous-titre...

### Champs du formulaire

- **Tag name** : le nom qui identifie le tag
- **Slug** : Identifiant unique de unique utilisé dans l'URL, pour l'intégration CMS... . Auto-généré à partir du nom.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Options**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only** : Pour intégration CMS seulement ne peut etre utilisé comme category.
  [ ] **Available for product tagging** : Disponible pour catégoriser les produits.
  [ ] **Use light/dark inverted mode** : Utiliser le mode inversé clair/sombre.

- **Tag Family** : la famille du tag

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title** : Titre qu'on affiche sur le tag lors de l'intégration CMS
- **Tag subtitle** : Le sous-titre qu'on affiche sur le tag lors de l'intégration CMS
- **Short content** : Le contenu court à afficher selon la variation.
- **Full content** : Le contenu long à afficher selon la variation.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures** : Une liste de photos à uploader. Chaque photo est associé à une variation.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs** : Des boutons, associé à des liens, qu'on retrouvent lors de l'affichage du tag en zone ou page CMS.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text** (Texte) : Description du bouton associé au tag.
    _Exemple : "Voir Plus"_
  - **URL** : Lien URL pointant vers une page ou un contenu supplémentaire au click du bouton.
  - **Open in new tab** (Ouvrir dans un nouvel onglet) : Option pour ouvrir le lien dans un nouvel onglet du navigateur.

- **CSS Override** : pour remplacer le css existant sur le tag.

## Intégration CMS

Pour intégrer un tag dans une zone ou page CMS vous pouvez l'ajoutez comme suit: `[Tag=slug?display=var-1].
Les `var` definissent les variations possible d'affichage et sont de`var-1`jusqu'a`var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

Et votre tag sera afficher pour vos utilisateurs comme suit.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
