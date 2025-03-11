# Configuration du Mode de Maintenance

![image](https://github.com/user-attachments/assets/203847fe-887b-4d0f-86d6-00a490770a7d)

Cette section explique comment activer le mode de maintenance, spécifier les IP qui peuvent accéder au site pendant la maintenance.
Il explique aussi comment crée un page CMS de maintenance.

## Activer le Mode de Maintenance

![image](https://github.com/user-attachments/assets/348ce057-6cb1-4b36-b937-f62947f5152e)

Pour activer le mode de maintenance, suivez les étapes suivantes :

1. Allez dans **Admin** > **Config**
2. Repérez l'option intitulée **Enable maintenance mode**.
3. Cochez la case à côté de **Enable maintenance mode** pour l'activer.
   - Lorsque le mode de maintenance est activé, seules les adresses IP spécifiées auront accès au site. Tous les autres visiteurs verront une page de maintenance.

## Définir les IP de Maintenance

![image](https://github.com/user-attachments/assets/449637f8-31e6-4ab5-9c28-9fba5d7ae3fd)

Vous pouvez autoriser certaines IP à contourner le mode de maintenance et à accéder normalement au site. Pour ajouter ces IP :

1. Dans le champ **IP de maintenance**, entrez les adresses IP qui doivent avoir accès pendant le mode de maintenance.
2. Séparez chaque adresse IP par une virgule.
   - Exemple : `192.168.1.1, 203.0.113.5, 41.82.89.58`

## Afficher Votre Adresse IP Actuelle

Votre adresse IP actuelle est affichée sous le champ **Maintenance IPs**. Cette IP peut être ajoutée à la liste des **Maintenance IPs** pour s'assurer que vous avez accès au site même en mode maintenance.

![image](https://github.com/user-attachments/assets/449637f8-31e6-4ab5-9c28-9fba5d7ae3fd)

## Notes

- Assurez-vous d'enregistrer les paramètres après avoir activé le mode de maintenance ou mis à jour la liste des IP de maintenance.
- Seuls les utilisateurs accédant au site depuis les IP spécifiées pourront contourner la page de maintenance.

# Étapes pour Configurer la Page de Maintenance

![image](https://github.com/user-attachments/assets/b3e7fd02-8728-4be4-bdf1-4980beccacf1)

Pour configurer une page maintenance vous pouvez cliquer sur le lien (voir image) ou aller sur **Admin** > **Merch** > **CMS** et créer la page CMS suggéré `maintenance`.

## Créer une page maintenance

![image](https://github.com/user-attachments/assets/4a8f0442-26fe-4736-a585-e46e4f6fb598)

Comme pour créer une page CMS (cf [WIP-build-cms-pages-with-widget.md]) la page maintenance fait partie des CMS pages suggéres.

Lors de la création il est suggéré de cocher ces paramêtres :

- **Full Screen** : ☑️ (Activé)
- **Hide this page from search engines** : ☑️ (Activé)

## Affichage de la page maintenance

Lorsque la configuration du mode maintenance est activé seul les pages **Available even in Maintenance mode** et les pages Admin seront disponible.
Toutes les autres pages rediregeront vers /maintenance

![image](https://github.com/user-attachments/assets/c1e02dac-91d2-4e80-848a-84f3ba455138)
