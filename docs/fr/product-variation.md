# Documentation Product Variation

![image](https://github.com/user-attachments/assets/5d44dd81-a1d8-474e-b627-d5f3e01e955f)

Accessible lors de la création ou de l'edition d'un produit, les variations permet de faire une selection (sur la couleur, sur la taille...) d'un article avant de l'ajouter au panier

## Creer ou ajouter un produit avec variations

Lors de l'ajout ou de la modification d'un produit on peut y ajouter des variations. Pour faire cela :

- cocher sur **This is a standalone product** pour que le produit avec variations ne soit ajouter au panier avec une quantité superieure à 1.
- cocher sur **Product has light variations (no stock difference)** pour pouvoir ajouter les differentes variation

  ![image](https://github.com/user-attachments/assets/80bfe14e-cec9-4b29-b8e2-eb3067a29b26)

Pour ajouter une variation remplissez le :

- **Name** : qui est le titre de la variation (exemple : Size)
- **Value** : qui est une valeur de name (exemple : XL)
- **Price difference** : qui est la valeur en nombre (au meme currency que le prix du produit) qu'on doit rajouter lorsqu'un utilisateur choisit cette variation.
  (exemple : un t-shirt XL va couter 2 euro de plus que le prix de base d'un t-shirt)

Cliquez sur **add variation** pour ajouter une nouvelle variation. l'icone '🗑️' permet de supprimer une variation deja ajouté en base

## Affichage dans la page produit

![image](https://github.com/user-attachments/assets/ed13cc76-330b-4c3c-b162-52f6438ccca3)

Lorsque vous affichez un produit avec variations vous pourrez choisir les variations avant d'ajouter au panier. Le nom et la liste de variation seront accessible dans la fiche produit.

## Affichage au panier

![image](https://github.com/user-attachments/assets/747aed2c-854f-4bf4-a156-9a1b18f3616e)

![image](https://github.com/user-attachments/assets/394264ed-91c0-478c-9aa1-b9064c7c1b6b)

Lorsqu'un produit avec variation est ajouté au panier le nom devient le nom produit concatené avec la valeur de la variation

exemple: T-shirt - XL - Rouge ( ou XL est une valeur de variation Size et Rouge une valeur de variation Color)
