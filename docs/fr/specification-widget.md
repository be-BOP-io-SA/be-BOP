# Documentation Specification Widget

Accessible sur **Admin** > **Widgets** > **Specifications**, les widgets spécification peuvent être utilisés dans votre be-bop pour integrer des spécifications dans des zones ou pages CMS. Ce widget peut etre utilser pour renseigner les specifications de vos articles dans votre be-bop.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Créer une spécification

Pour ajouter une cliquez sur **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Titre

- Entrez un titre décrivant les spécifications.

### 2. Slug

- Fournissez un identifiant unique .  
  Ce slug est utilisé comme clé unique pour les références internes ou les URL.

### 3. Contenu

- Renseignez le contenu sous forme de tableau structuré en CSV avec les colonnes suivantes :
  - **Catégorie** : Le groupe auquel appartient la spécification.
  - **Étiquette** : Nom spécifique de la caractéristique.
  - **Valeur** : Détail de la spécification.

#### Exemple de contenu pour une montre:

```csv
"Boîtier et cadran";"Métal";"Or rose 18 carats"
"Boîtier et cadran";"Diamètre de la boîte";"41"
"Boîtier et cadran";"Épaisseur";"9.78 mm"
"Boîtier et cadran";"Diamants (carats)";"10.48"
"Boîtier et cadran";"Cadran";"en or rose 18 carats entièrement serti de diamants"
"Boîtier et cadran";"Étanchéité";"100 mètres"
"Boîtier et cadran";"Fond";"glace saphir"
"Mouvement";"Mouvement";"Chopard 01.03-C"
"Mouvement";"Type de remontage";"mouvement mécanique et remontage automatique"
"Mouvement";"Fonction";"heures et minutes"
"Mouvement";"Réserve de marche";"Réserve de marche d’environ 60 heures"
"Mouvement";"Fréquence";"4 Hz (28 800 alternance par heure)"
"Mouvement";"Spiral";"plat"
"Mouvement";"Balancier";"à trois bras"
"Mouvement";"Dimensions du mouvement";"Ø 28.80 mm"
"Mouvement";"Épaisseur du mouvement";"4.95 mm"
"Mouvement";"Nombre de composants du mouvement";"182"
"Mouvement";"Rubis";"27"
"Sangle et boucle";"Type de boucle";"boucle déployante"
"Sangle et boucle";"Matériau de la boucle";"Or rose 18 carats"

```

## Intégration CMS

Pour ajouter une specification dans une zone CMS vous pouvez utiliser `[Specifcation=slug]`

- Exemple dans une zone CMS d'un produit.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  Et on aura lorsqu'on affiche le produit
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
