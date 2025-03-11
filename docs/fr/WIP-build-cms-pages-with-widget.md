# Documentation de l'interface de creation de page CMS

## Introduction

Définis dans Admin > Merch > CMS les pages CMS sont utilisés pour créer, modifier et organiser des pages avec du contenu dynamique. Les pages CMS permettent d'ajouter des produits, des images, des galeries, et bien plus à vos pages.

## Paramètres de la Page

Chaque page CMS possède des paramètres qui définissent son apparence et son comportement.

![image](https://github.com/user-attachments/assets/bea0cea5-f878-4e1c-8157-c381606d5baf)

- **Page slug** : Identifiant unique de la page, utilisé dans l'URL. Par exemple, `home` pour la page d'accueil.
- **Page title** : Titre affiché en haut de la page et dans l'onglet du navigateur.
- **Short description** : Brève description visible dans les aperçus sur les réseaux sociaux.
- **Options supplémentaires** :
  - **Full screen** : Affiche la page en plein écran.
  - **Available even in Maintenance mode** : Accessible en mode maintenance.
  - **Hide this page from search engines** : Masque la page des moteurs de recherche.
  - **Add custom meta tag** : Permet d'ajouter des balises meta personnalisées.

## Utilisation des Widgets

Les widgets permettent d'ajouter des éléments dynamiques à votre page. Pour les utiliser, ajoutez une balise spécifique dans le contenu de votre page.

### Afficher un Produit

```markdown
[Product=slug?display=img-1]
```

- **slug** : Remplacez-le par l'identifiant du produit.
- **display** : Option d'affichage de l'image du produit (`img-1`, `img-2`, etc.).

### Afficher une Image

```markdown
[Picture=slug width=100 height=100 fit=contain]
```

- **width** et **height** : Spécifiez la taille en pixels.
- **fit** : Définit l'ajustement de l'image (`contain`, `cover`, etc.).

### Afficher un Slider

```markdown
[Slider=slug?autoplay=3000]
```

- **autoplay** : Temps en millisecondes pour le défilement automatique.

### Afficher un Tag

```markdown
[Tag=slug?display=var-1]
```

- **display** : Modifie l'affichage de la balise.

### Afficher les Produits d'un Tag

```markdown
[TagProducts=slug?display=img-3 sort=desc by=price]
```

- **sort** : Trie les produits (`asc` ou `desc`).
- **by** : Critère de tri (ex. : `price`).

### Ajouter un Formulaire

```markdown
[Form=slug]
```

### Compte à Rebours

```markdown
[Countdown=slug]
```

### Ajouter un QR Code Bolt 12

```markdown
[QRCode=Bolt12]
```

## Exemples de Contenu

### Home

![image](https://github.com/user-attachments/assets/0009001c-f8a5-4eef-aceb-9f2914b02e9f)

```markdown
Découvrez nos produits en vedette

[Product=peluche-enfant?display=img-3]
[Product=peluche-enfant-v2?display=img-3]
```

![image](https://github.com/user-attachments/assets/16e06d46-ca63-44d0-a1ff-dc5c67d30594)

## Les cms pages suggéres

![image](https://github.com/user-attachments/assets/37852837-e7d2-4a43-9366-d05b671e7fc5)
