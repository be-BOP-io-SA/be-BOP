# Comment engager ma communaute avec la gamification ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la mise en place de challenges et de classements (leaderboards) sur votre boutique be-BOP, afin de dynamiser vos ventes et d'engager votre communaute.

## 1. Creer un challenge [A117]

Rendez-vous sur **Admin** > **Widgets** > **Challenge**.

- Cliquez sur **Add challenge** pour creer un nouveau challenge.

### Parametres du challenge

- **Challenge name** : Nom du challenge, un titre court et descriptif.
- **Mode** : Type d'objectif a atteindre :
  - **TotalProducts** : Nombre d'articles vendus.
  - **MoneyAmount** : Somme d'argent a collecter (accompagne d'un champ **Currency** pour definir la devise).
- **Goal** : Objectif chiffre a atteindre.
- **Beginning date** : Date de debut du challenge.
- **Ending date** : Date de fin du challenge.
- **Products** : Liste des produits dont les ventes font progresser le challenge.

### Integration CMS

Pour afficher un challenge dans une page ou zone CMS, utilisez la balise :

```
[Challenge=slug]
```

Le challenge sera affiche avec une barre de progression indiquant l'avancement par rapport a l'objectif.

## 2. Creer un classement (Leaderboard) [A118]

Rendez-vous sur **Admin** > **Widgets** > **Leaderboard**.

- Cliquez sur **Add leaderboard** pour creer un nouveau classement.

### Parametres du classement

- **Leaderboard name** : Nom du classement, un titre court et descriptif.
- **Mode** : Type de classement :
  - **TotalProducts** : Classement par nombre d'articles achetes.
  - **MoneyAmount** : Classement par somme depensee (accompagne d'un champ **Currency**).
- **Beginning date** : Date de debut du classement.
- **Ending date** : Date de fin du classement.
- **Products** : Liste des produits pris en compte dans le classement.

### Integration CMS

Pour afficher un classement dans une page ou zone CMS, utilisez la balise :

```
[Leaderboard=slug]
```

Le classement sera affiche sous forme de tableau avec le rang des participants.

## 3. Consulter la progression d'un challenge (client) [C53]

Les clients peuvent suivre la progression d'un challenge en se rendant sur :

- `/challenges/[id]` : Affiche la page dediee au challenge, avec la progression actuelle vers l'objectif, les dates de debut et de fin, et les produits concernes.
- Les challenges integres dans les pages CMS affichent egalement la barre de progression en temps reel.

## 4. Consulter un classement (client) [C54]

Les clients peuvent consulter les classements en se rendant sur :

- `/leaderboards/[id]` : Affiche la page dediee au classement, avec le tableau des participants et leur rang.
- Les classements integres dans les pages CMS sont egalement visibles directement sur les pages concernees.

Pour plus de details, consultez [Challenge Widget](../fr/challenge-widget.md) et [Leaderboard Widget](../fr/leaderboard-widget.md).

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Creer un challenge | Challenge widget | A117 |
| Creer un classement | Leaderboard widget | A118 |
| Progression challenge (client) | Challenge progress | C53 |
| Consulter classement (client) | Leaderboard view | C54 |