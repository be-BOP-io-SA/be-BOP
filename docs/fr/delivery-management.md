# Gestion des frais d'envoi

## Introduction
be-BOP, à l'heure actuelle, ne propose qu'un seul mode d'expédition générique.
En revanche, plusieurs modes de gestion des frais d'envoi sont proposés.
Les frais d'envoi peuvent être configurés :
- au global sur /admin/config/delivery
- au détail sur /admin/product/{id}

## Mode de gestion
Les deux principaux sont :
- "Flat fees" : "participation forfaitaire aux frais de port", chaque commande est facturée une certaine somme (définie dans /admin/config/delivery), dans une devise définie
  - "Apply flat fee for each item instead of once for the whole order" : dans ce mode, la participation forfaitaire aux frais de port est appliquée à chaque ligne article plutôt qu'au panier
- "Fees depending on product" : "frais dépendant du produit", chaque produit possède ses frais de ports spécifiques, frais qui sont cumulés au panier selon le nombre d'articles commandés
  - "For orders with multiple products, only apply the delivery fee of the product with the highest delivery fee" : dans ce mode, seul les frais de ports de l'article le plus élevé sont appliqués, plutôt que la somme

Dans tous les cas, ces calculs ne concernent que les produits pour lesquels l'option "The product has a physical component that will be shipped to the customer's address" a été activée dans /admin/product/{id}.
Les frais d'envoi et participations forfaitaires aux frais de port ne sont pas pris en compte pour le calcul de type de produits.

### Ligne article ?
[Screenshot requis]
Un panier client contient plusieurs lignes, en général, chacune correspondant à un produit A en quanté n.
Ainsi, si j'ai le panier suivant :
- Article A qté 2
- Article B qté 3
- Article C qté 4
- Article D qté 8
Mon panier contient 4 lignes articles.

Dans le cadre d'une configuration "Flat fees" de 10€, le prix des frais de port sera de 10€.
Dans le cadre d'une configuration "Flat fees" de 10€ avec l'option "Apply flat fee for each item instead of once for the whole order", le prix des frais de port sera de 4 lignes articles * 10€, soit 40€.

### Article Standalone
Parfois, un article volumineux ou fragile justifie à lui seul un envoi à part, une assurance, un colis spécial, des protections d'envoi, etc.
Lorsqu'on ajoute 2 fois un même article A au panier, le panier affiche une seule ligne avec "Article A qté 2".
Si on active l'option "This is a standalone product" dans /admin/product/{id}, chaque ajout du produit se fait sur une unique ligne.
Ainsi, si j'ai un article B (par exemple une télévision) et que je l'ajoute 3 fois, mon panier devient donc :
- Article A qté 2
- Article B
- Article B
- Article B
Mon panier contient alors 4 lignes articles : 1 article Standalone correspond à 1 ligne panier.

## Zone d'envoi
Par défaut, les zones d'envoi et leurs frais ne sont pas définies.
Pour définir un frais de port global, il faut choisir "Other countries", l'ajouter et fixer des frais.
Si on définit un prix d'envoi pour un pays A, un autre pour un pays B et un dernier pour "Other Countries", le prix fixé pour "Other Countries" servira par défaut pour tous les pays n'étant ni le pays A ni le pays B.

## Prix d'envoi de produit spécifique et restriction d'envoi de produit
(TBD)
