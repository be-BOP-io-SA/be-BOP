# Comment sauvegarder mes donnees et gerer la maintenance ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la sauvegarde de vos donnees, la restauration depuis une sauvegarde et la mise en place du mode de maintenance sur votre boutique be-BOP.

## 1. Creer une sauvegarde de la base de donnees [A107]

Rendez-vous sur **Admin** > **Config** > **Backup**.

- Cliquez sur le bouton de sauvegarde pour generer un fichier de sauvegarde de votre base de donnees.
- Deux options sont disponibles :
  - **Full backup** : Sauvegarde complete de l'ensemble des donnees (produits, commandes, configuration, pages CMS, etc.).
  - **Products only** : Sauvegarde uniquement des donnees produits.
- Le fichier de sauvegarde est telecharge automatiquement une fois genere.

> Il est recommande d'effectuer des sauvegardes regulieres, en particulier avant toute mise a jour ou modification importante de la configuration.

## 2. Restaurer une sauvegarde [A108]

Rendez-vous sur **Admin** > **Config** > **Backup**.

- Cliquez sur le bouton d'importation pour restaurer une sauvegarde.
- Selectionnez le fichier de sauvegarde a importer depuis votre ordinateur.
- Confirmez la restauration. Les donnees actuelles seront remplacees par celles contenues dans le fichier de sauvegarde.

> Attention : la restauration ecrase les donnees existantes. Assurez-vous de disposer d'une sauvegarde recente avant de proceder.

## 3. Activer le mode de maintenance [A53]

Rendez-vous sur **Admin** > **Config**.

### Activer le mode de maintenance

- Cochez la case **Enable maintenance mode** pour activer le mode de maintenance.
- Lorsque le mode de maintenance est active, seules les adresses IP autorisees et les pages d'administration restent accessibles. Tous les autres visiteurs sont rediriges vers la page de maintenance.

### Configurer les IP autorisees

- Dans le champ **Maintenance IPs**, saisissez les adresses IP autorisees a acceder au site pendant la maintenance.
- Separez chaque adresse IP par une virgule (ex. : `192.168.1.1, 203.0.113.5`).
- Votre adresse IP actuelle est affichee sous le champ pour vous permettre de l'ajouter facilement a la liste.

### Creer la page CMS de maintenance

- Rendez-vous sur **Admin** > **Merch** > **CMS**.
- Creez la page CMS suggeree `maintenance`.
- Parametres recommandes :
  - **Full Screen** : coche.
  - **Hide this page from search engines** : coche.
- Personnalisez le contenu de la page avec un message a destination de vos visiteurs.

### Comportement en mode maintenance

- Seules les pages marquees **Available even in Maintenance mode** et les pages **Admin** restent accessibles.
- Toutes les autres pages redirigent vers `/maintenance`.

> Assurez-vous d'enregistrer les parametres apres avoir active le mode de maintenance ou mis a jour la liste des IP.

Pour plus de details, consultez [Configuration du Mode de Maintenance](../fr/WIP-maintenance-whitelist.md).

## Recapitulatif

| Etape | Fonctionnalite | Identifiant |
| ----- | -------------- | ----------- |
| Sauvegarde base de donnees | Database backup | A107 |
| Restauration sauvegarde | Database import | A108 |
| Mode de maintenance | Maintenance mode | A53 |