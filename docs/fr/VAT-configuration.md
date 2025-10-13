# Gestion des régimes et taux de TVA

## Introduction

Nativement, be-BOP affiche des prix hors-taxe.
Les calculs de TVA sont réalisés dès le panier.

Il existe 3 grands régimes de TVA, dont une variation :
- l'exemption sous justification
- la vente sous TVA du pays du vendeur
- la vente sous TVA du pays de l'acheteur
- la vente sous TVA du pays du vendeur avec exonération pour les acheteurs se faisant livrer à l'étranger, sous réserve de déclaration de paiement de la TVA de leur pays auprès de leurs propres services douaniers

Pour contrôle fiscal, respect de la loi et comptabilité, il est parfois nécessaire recueillir des données liées au client, pour justifier une éventuelle exonération de TVA.
Ces points sont abordés dans le [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Cas 1 : exemption de TVA sur sous justification

Dans /admin/config se trouve l'option **Disable VAT for my be-BOP** (*Désactiver la TVA pour mon be-BOP*).
Une fois la case activée, **une TVA de 0% est appliquée sur l'ensemble des futures commandes**.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

L'activation de cette option active la sous-option **VAT exemption reason (appears on the invoice)** (*Raison d'exemption de TVA (apparaît sur les factures)*).
Il s'agit du texte légal à renseigner pour justifier de l'absence de TVA à votre client.
Par exemple, en France :
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (prestation de service inter-communautaire)

Le motif renseigné sera alors indiqué sur chacune de vos factures.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Cas 2A : vente au taux de TVA du pays du vendeur

Dans /admin/config se trouve l'option **Use VAT rate from seller's country (always true for products that are digital goods)** (*Utiliser la TVA du pays du vendeur (toujours vrai pour les articles sans livraison)*).
Il faut ensuite choisir le pays auquel est rattaché votre entreprise dans l'option **Seller's country for VAT purposes** (*Pays du vendeur pour définition de la TVA*).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

En procédant ainsi :
- le taux de TVA indiqué au panier sera celui du pays de votre entreprise (avec un indicateur rappelant ce pays)
- le taux de TVA indiqué dans la page de tunnel sera celui du pays de votre entreprise (avec un indicateur rappelant ce pays)
- le taux de TVA indiqué sur la commande sera celui du pays de votre entreprise (avec un indicateur rappelant ce pays)
- le taux de TVA indiqué sur la facture sera celui du pays de votre entreprise

## Cas 2B : vente au taux de TVA du pays du vendeur et exonération pour la livraison d'articles physiques à l'étranger

Dans le cas précédent, dans /admin/config, si vous activez l'option **Make VAT = 0% for deliveries outside seller's country** (*Considérez la TVA comme nulle pour les clients livrés en dehors de votre pays*), les règles resteront les mêmes pour les clients se faisant livrer dans le pays de votre entreprise.

Il en sera de même pour l'achat d'articles téléchargeables, de dons ou d'abonnements (le taux de TVA appliqué sera celui du pays de votre entreprise).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

En revanche, si votre client veut se faire livrer votre marchandise dans son pays (qui n'est pas celui de votre entreprise) :
- le taux de TVA indiqué au panier sera celui du pays dans lequel est géolocalisé son IP (d'après des données originaires de ip2location.com)
- le taux de TVA indiqué dans la page de tunnel sera celui du pays de livraison choisi par le client
- le taux de TVA indiqué sur la commande sera celui du pays de livraison choisi par le client
- le taux de TVA indiqué sur la facture sera celui du pays de livraison choisi par le client
Même si l'adresse de facturation de votre client est dans le pays de votre entreprise, la livraison à l'étranger, dans certains régimes, peut l'obliger à ce paiement via déclaration au service des douanes dès réception de la marchandise.

Quand cette option est activée, dans le tunnel (page /checkout), le client devra valider une nouvelle option obligatoire : **I understand that I will have to pay VAT upon delivery** (*Je comprends que je devrais payer la VAT au moment de la livraison*).
Le lien de cette option renvoie vers la page CMS /why-vat-customs , à créer et à compléter pour expliquer pourquoi votre client doit s'acquitter de la TVA de son pays dès réception de votre article.

### Client se faisant livrer dans le pays du be-BOP

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Client se faisant livrer ailleurs

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Cas 3 : vente au taux de TVA du pays de l'acheteur

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Quand, dans /amdin/config, aucune option de régime de TVA n'est activée et qu'un pays de TVA est choisi, la TVA appliquée sera celle du client :
- le taux de TVA indiqué au panier sera celui du pays dans lequel est géolocalisé son IP (d'après des données originaires de ip2location.com)
- le taux de TVA indiqué dans la page de tunnel sera celui du pays de livraison choisi par le client, ou celui du pays dans lequel est géolocalisé son IP (d'après des données originaires de ip2location.com) dans le cadre d'un panier sans article nécessitant une livraison
- le taux de TVA indiqué sur la commande sera celui du pays de livraison choisi par le client, ou celui du pays dans lequel est géolocalisé son IP (d'après des données originaires de ip2location.com) dans le cadre d'un panier sans article nécessitant une livraison
- le taux de TVA indiqué sur la facture sera celui du pays de livraison choisi par le client, ou celui du pays dans lequel est géolocalisé son IP (d'après des données originaires de ip2location.com) dans le cadre d'un panier sans article nécessitant une livraison

## L'IP de l'utilisateur utilisée pour l'évaluation de la TVA est-elle stockée ?
Ces points sont abordés dans le [privacy-management.md](/docs/frprivacy-management.md).
Mais, sans autre configuration exigeant des informations du client, l'information n'est pas stockée : elle est récupérée du navigateur (car fournie par ce dernier) et utilisée pour donner une estimation de la TVA et des frais de port avant le renseignement de l'adresse postale du client (recommandation légale imposée par certains pays), mais elle n'est nativement pas stockée dans les bases de données be-BOP.
En revanche, les services fiscaux et frontaliers peuvent exiger dans certains pays un nombre de preuves justifiant le paiement de la TVA par le client qui n'est pas celle du pays du vendeur. En ce cas, be-BOP propose certaines options (sans pour autant les encourager nativement).
A noter que l'IP est considérée comme une donnée de facturation valide dans certains pays, et que le vendeur n'est pas responsable de l'adresse IP poussée par le navigateur du client.

## Quel régime de TVA choisir ?

Le régime de TVA de votre entreprise peut dépendre :
- du statut de votre entreprise
- de votre type d'activité
- de votre chiffre d'affaire annuel
- d'autres subtilités légales et administratives

Le plus sur est de consulter votre comptable, avocat ou service aux entreprises compétent afin de connaître votre régime de TVA cible et le configurer dans be-BOP.

## Gesttion des profils de TVA réduite

Selon les pays, certains pays bénéficient d'un taux de TVA réduit (produits culturels, dons à associations ou financement de campagne politique, etc).
Pour cela, il faut créer des **Custom VAT Rates**.
Le lien est accesible dans /admin/config, et sur /admin/config/vat :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

Vous pouvez nommer et enregistrer un profil, et renseigner un taux de TVA personnalisé par pays (sans précision, c'est la TVA par défaut qui sera appliquée).

Exemple de Custom VAT Rate dédié aux livres :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Puis, dans l'interface d'administration des produits (/admin/product/{id}), vous pouvez renseigner le profil de TVA souhaité en fonction du type de produit :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" prendra par défaut la TVA générale du be-BOP.

La TVA de chaque article sera affichée au panier :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

Et éagalelement sur la facture :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)

