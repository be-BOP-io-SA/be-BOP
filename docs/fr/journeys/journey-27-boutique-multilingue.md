# Comment proposer ma boutique en plusieurs langues ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration multilingue de votre boutique be-BOP, de l'activation des langues jusqu'a la traduction de vos produits et pages CMS.

## 1. Activer ou desactiver les langues [A77]

Rendez-vous sur **Admin** > **Config** > **Languages**.

- La liste des langues disponibles est affichee avec une case a cocher pour chacune (ex. : English, Francais, Espanol, Nederlands, Italian, Deutsch, Portugues).
- Cochez les cases des langues que vous souhaitez rendre disponibles sur votre boutique.
- Decochez les langues que vous ne souhaitez pas proposer.
- Vous devez selectionner au moins une langue.

Cliquez sur **Update** pour enregistrer.

> Seules les langues activees seront proposees aux visiteurs via le selecteur de langue.

## 2. Definir la langue par defaut [A78]

Rendez-vous sur **Admin** > **Config** > **Languages**.

- Dans le selecteur **Default language**, choisissez la langue par defaut de votre boutique.
- Cette langue sera utilisee lors de la premiere visite d'un client et comme langue de secours si la langue du navigateur du visiteur n'est pas disponible.

Cliquez sur **Update** pour enregistrer.

## 3. Personnaliser les cles de traduction (JSON) [A79]

Rendez-vous sur **Admin** > **Config** > **Languages**, section **Custom Translation Keys**.

- Chaque langue activee dispose d'un champ d'edition JSON dedie.
- Vous pouvez ajouter ou modifier des cles de traduction pour personnaliser les libelles de l'interface :
  ```json
  {
    "welcome_message": "Bienvenue dans notre boutique !",
    "checkout": "Passer a la caisse"
  }
  ```
- Les cles personnalisees remplacent les traductions par defaut de be-BOP.
- Les modifications sont appliquees apres validation et sauvegarde.

> Les cles de traduction personnalisees permettent d'adapter les textes de l'interface (boutons, messages, libelles) sans modifier le code source.

## 4. Traduire les pages CMS [A42]

Rendez-vous sur **Admin** > **Merch** > **CMS** et selectionnez la page a traduire.

- Chaque page CMS peut etre traduite dans toutes les langues activees.
- Selectionnez la langue cible dans l'editeur de la page.
- Renseignez le titre et le contenu de la page dans la langue selectionnee.
- Repetez l'operation pour chaque langue souhaitee.

Cliquez sur **Update** pour enregistrer chaque traduction.

> Les visiteurs verront automatiquement la version de la page correspondant a leur langue selectionnee. Si aucune traduction n'est disponible, la langue par defaut sera utilisee.

## 5. Traduire les produits [A28]

Rendez-vous sur **Admin** > **Merch** > **Product** et selectionnez le produit a traduire.

- Chaque produit peut etre traduit dans toutes les langues activees.
- Selectionnez la langue cible dans l'editeur du produit.
- Traduisez les champs suivants :
  - **Nom du produit** : Titre du produit dans la langue cible.
  - **Description** : Description du produit dans la langue cible.
- Repetez l'operation pour chaque langue souhaitee.

Cliquez sur **Update** pour enregistrer chaque traduction.

> Les produits sont affiches dans la langue selectionnee par le visiteur. Si aucune traduction n'est disponible pour un champ, la version dans la langue par defaut est affichee.

Pour plus de details, consultez [Configuration des langues](../fr/language-configuration.md).

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Activer/desactiver les langues | Languages | A77 |
| Langue par defaut | Default language | A78 |
| Cles de traduction personnalisees | Custom Translation Keys | A79 |
| Traduction pages CMS | CMS page translations | A42 |
| Traduction produits | Product translations | A28 |