# Comment construire les pages de ma boutique avec le CMS ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la création et la personnalisation des pages de votre boutique be-BOP grâce au système de gestion de contenu (CMS) et aux widgets.

## 1. Créer et éditer des pages CMS [A41]

Rendez-vous sur **Admin** > **Merch** > **CMS**.

### Paramètres de la page

Chaque page CMS dispose des champs suivants :

- **Page slug** : Identifiant unique utilisé dans l'URL (ex. : `home` pour la page d'accueil, `about` pour la page "À propos").
- **Page title** : Titre affiché en haut de la page et dans l'onglet du navigateur.
- **Short description** : Brève description affichée dans les aperçus sur les réseaux sociaux.

### Options de la page

- **Full screen** : Affiche la page en plein écran, sans les marges latérales.
- **Available even in Maintenance mode** : Rend la page accessible même lorsque la boutique est en mode maintenance.
- **Hide this page from search engines** : Masque la page de l'indexation par les moteurs de recherche.
- **Add custom meta tag** : Permet d'ajouter des balises meta personnalisées pour le référencement.

### Contenu de la page

Le contenu est rédigé en Markdown et peut inclure des widgets (voir section 3).

### Pages CMS suggérées

be-BOP propose une liste de pages CMS recommandées pour le bon fonctionnement de votre boutique. Consultez [Pages CMS requises](../fr/required-CMS-pages.md) pour la liste complète.

## 2. Traduire les pages CMS [A42]

Chaque page CMS peut être traduite dans toutes les langues activées sur votre boutique.

- Depuis l'éditeur de la page CMS, sélectionnez la langue cible dans le sélecteur de langue.
- Traduisez le titre, la description courte et le contenu de la page.
- Chaque traduction est indépendante : vous pouvez adapter le contenu selon la langue sans être limité à une traduction littérale.

## 3. Utiliser les widgets dans les pages CMS

Les widgets permettent d'intégrer des éléments dynamiques dans vos pages. Insérez les balises suivantes dans le contenu Markdown de votre page.

### Afficher un produit

```markdown
[Product=slug?display=img-1]
```

- **slug** : Identifiant du produit.
- **display** : Option d'affichage de l'image (`img-1`, `img-2`, `img-3`, etc.).

### Afficher une image

```markdown
[Picture=slug width=100 height=100 fit=contain]
```

- **width** et **height** : Dimensions en pixels.
- **fit** : Ajustement de l'image (`contain`, `cover`, etc.).

### Afficher un slider

```markdown
[Slider=slug?autoplay=3000]
```

- **autoplay** : Temps en millisecondes entre chaque diapositive.

### Afficher un tag

```markdown
[Tag=slug?display=var-1]
```

- **display** : Variante d'affichage du tag.

### Afficher les produits d'un tag

```markdown
[TagProducts=slug?display=img-3 sort=desc by=price]
```

- **sort** : Ordre de tri (`asc` ou `desc`).
- **by** : Critère de tri (ex. : `price`).

### Ajouter un formulaire

```markdown
[Form=slug]
```

### Ajouter un compte à rebours

```markdown
[Countdown=slug]
```

### Ajouter un QR Code Bolt 12

```markdown
[QRCode=Bolt12]
```

## 4. Gérer les métadonnées SEO [A43]

Depuis l'éditeur de la page CMS :

- Cochez **Hide this page from search engines** pour empêcher l'indexation par les moteurs de recherche.
- Utilisez **Add custom meta tag** pour définir des balises meta personnalisées (description, mots-clés, Open Graph, etc.).

Pour une configuration SEO globale, consultez la section 9.

## 5. Gérer la mise en page (Layout) [A119]

Rendez-vous sur **Admin** > **Merch** > **Layout**.

Le layout définit les éléments communs à toutes les pages de votre boutique :

- **Top bar** : Barre supérieure avec informations ou promotions.
- **Navbar** : Barre de navigation principale avec les liens vers les pages CMS et le catalogue.
- **Footer** : Pied de page avec les liens utiles, informations légales et de contact.

Pour plus de détails, consultez [Mise en page et design](../fr/layout-design.md).

## 6. Créer des tags [A109]

Rendez-vous sur **Admin** > **Widgets** > **Tag**.

- Les tags permettent de regrouper et catégoriser les produits.
- Chaque tag possède un slug, un nom et peut être affiché via le widget `[Tag=slug]` ou `[TagProducts=slug]`.
- Les tags servent aussi de menus de navigation sur l'interface POS tactile.

Pour plus de détails, consultez [Widget Tag](../fr/tag-widget.md).

## 7. Créer des sliders d'images [A110]

Rendez-vous sur **Admin** > **Widgets** > **Slider**.

- Créez un slider en lui attribuant un slug et en ajoutant les images souhaitées.
- Configurez les options de défilement (autoplay, durée entre les diapositives).
- Intégrez le slider dans une page CMS avec `[Slider=slug]`.

Pour plus de détails, consultez [Widget Slider](../fr/slider-widget.md).

## 8. Créer des comptes à rebours [A113]

Rendez-vous sur **Admin** > **Widgets** > **Countdown**.

- Définissez une date et heure cible pour le compte à rebours.
- Personnalisez le message affiché avant et après l'échéance.
- Intégrez le compte à rebours dans une page CMS avec `[Countdown=slug]`.

Pour plus de détails, consultez [Widget Countdown](../fr/countdown-widget.md).

## 9. Créer des galeries d'images [A114]

Rendez-vous sur **Admin** > **Widgets** > **Gallery**.

- Créez une galerie en ajoutant plusieurs images.
- Configurez l'affichage (grille, disposition, taille des vignettes).
- Intégrez la galerie dans une page CMS avec le widget approprié.

Pour plus de détails, consultez [Widget Gallery](../fr/gallery-widget.md).

## 10. Configurer les paramètres SEO globaux [A52]

Rendez-vous sur **Admin** > **Config**, section SEO.

- Définissez les métadonnées globales de votre boutique (titre du site, description, image par défaut pour les réseaux sociaux).
- Ces paramètres s'appliquent comme valeurs par défaut pour les pages qui n'ont pas de métadonnées personnalisées.

## 11. Ajouter du contenu avant ou après la page produit [A29]

Depuis l'éditeur d'un produit (**Admin** > **Merch** > **Product**), vous pouvez enrichir la page produit avec du contenu CMS.

### Zones CMS disponibles

- **Add CMS code and widgets before product page core** : Contenu affiché au-dessus de la fiche produit.
- **Add CMS code and widgets after product page core** : Contenu affiché en dessous de la fiche produit.

### Option mobile

- Cochez **Hide on mobile** si vous ne souhaitez pas afficher le contenu CMS sur les appareils mobiles.

### Exemple

Pour afficher des produits similaires en bas de la fiche produit :

```markdown
Dans la même catégorie [TagProducts=peluches?display=img-3]
```

Cette technique permet d'ajouter des recommandations, des bannières promotionnelles ou des informations complémentaires directement sur les pages produit.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Pages CMS | Création et édition | A41 |
| Traductions CMS | Contenu multilingue | A42 |
| SEO page | Métadonnées et indexation | A43 |
| Layout | Top bar, navbar, footer | A119 |
| Tags | Regroupement de produits | A109 |
| Sliders | Diaporamas d'images | A110 |
| Countdowns | Comptes à rebours | A113 |
| Galleries | Galeries d'images | A114 |
| SEO global | Paramètres du site | A52 |
| CMS sur produit | Contenu avant/après fiche | A29 |