# Comment mettre en place une restriction d'age ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la mise en place d'une restriction d'age sur votre boutique be-BOP, afin de limiter l'acces a vos produits ou services en fonction de l'age des utilisateurs.

## 1. Configurer la restriction d'age [A90]

Rendez-vous sur **Admin** > **Config** > **Age Restriction**.

### Activer la restriction

- Cochez la case **My online business needs age limitation & validation** pour activer la restriction d'age.

### Definir l'age minimum

- Renseignez l'age minimum requis pour acceder a votre boutique.

### Renseigner le motif legal

- Dans le champ **Legal reason**, indiquez le motif legal justifiant la restriction d'age (lois specifiques, reglementations applicables, etc.).
- Ce texte sera affiche aux visiteurs dans le formulaire de verification d'age.

### Configurer la page de restriction

- Rendez-vous sur **Admin** > **Merch** > **CMS** et creez la page CMS suggeree `agewall`.
- Le contenu de cette page sera integre dans le formulaire de restriction d'age presente aux visiteurs.
- Personnalisez le texte pour informer vos visiteurs des raisons de la restriction et des conditions d'acces.

Cliquez sur **Update** pour enregistrer.

## 2. Acceptation de la restriction par le client [C10]

Lorsque la restriction d'age est activee, les visiteurs voient apparaitre un formulaire de verification avant de pouvoir acceder a la boutique.

- Un formulaire modal s'affiche avec le texte legal configure par l'administrateur.
- Le visiteur doit confirmer qu'il repond aux criteres d'age minimum en acceptant les conditions.
- Tant que le visiteur n'a pas accepte la restriction, l'acces aux produits et au processus d'achat est bloque.

> La restriction d'age s'applique a l'ensemble de la boutique. Tous les visiteurs doivent l'accepter avant de pouvoir naviguer et acheter.

Pour plus de details, consultez [Restriction d'age](../fr/age.restriction.md).

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Configuration restriction d'age | Age Restriction | A90 |
| Acceptation par le client | Age disclaimer acceptance | C10 |