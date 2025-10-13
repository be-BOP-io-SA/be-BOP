# Option de Point of Sale (PoS)

## Introduction

be-BOP vous permet à la fois d'interagir avec votre communauté sur internet, mais également d'être utilisé comme logiciel de caisse (en stand ou magasin).

POS : Point Of Sale (point de vente, pour avoir un comportement de caisse de magasin)

En utilsant le rôle POS et en l'affectant à un profil [team-access-management.md](team-access-management.md), vous pouvez donner à un profil de caisse des options supplémentaires pour des options d'achat spécifique.
L'utilisation du compte POS permet également d'avoir un affichage client pour afficher :
- une page d'accueil
- l'affichage du panier au fur et à mesure
- le QR code de paiement (Bitcoin, Lightning ou CB Sum Up) une fois la commande validée
- une page de validation une fois le paiement validé

## La gestion du compte POS

Le rôle point-of-sale est configuré par défaut dans le module /admin/arm :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Connexion au compte POS

Une fois attribué à un profil, la personne possédant les accès POS doit se rendre sur la page d'identification dans l'administration (/admin/login , où /admin est la chaîne sécurisée configurée par le propriétaire du be-BOP (voir [back-office-access.md](back-office-access.md) ) puis s'identifier.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(Dans le cas d'un magasin, il est préférable de choisir un temps de maintien de connexion de "1 day", pour éviter les déconnexions en pleine session de vente)

## L'utilisation du compte POS

Une fois connecté, l'utilisateur POS renvoie vers l'URL /pos :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

La session /pos/session renvoie vers l'affichage côté client (voir après "Affichage client").
L'affichage des dernières transactions permet d'assurer le SAV en cas de demande client.
Si le compte POS a été configuré ainsi dans l'ARM, il peut mauellement accéder aux pages /admin dans un autre onglet.

## Ajout panier

Les produits accessibles au compte POS sont ceux qui sont configurés ainsi dans le product canal selector ( [Retail (POS logged seat)](Retail (POS logged seat)) ) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

Les options activées dans la colonne "Retail (POS logged seat)" s'appliqueront exclusivement au compte POS.

### Navigation par catalogue

La personne gérant la caisse peut ajouter les produits soit :
- par les pages CMS présentant les product widgets (voir [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md) )
- par l'accès à la page /catalog affichant l'intégralité des articles éligibles via le canal selector

Le parcours jusqu'au panier est alors similaire à celui de n'importe quel utilisateur ou utilisatrice sur le web.

### Ajout rapide via Alias

Un alias peut être ajouté à chaque produit ( [product-alias-management.md](product-alias-management.md) ).
Dans le cas où les articles que vous vendez disposent d'un code-barre (type ISBN / EAN13), celui-ci peut être renseigné comme alias.

Au panier, le compte POS dispose d'une option pas affichée chez un utilisateur lambda : en allant directement sur la page panier (/cart), le compte POS dispose d'un champ permettant de renseigner un alias (manuellement, ou via une douchette USB).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Après validation via "entrée" :__

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

Le champ "Alias" est viré pour permettre de scanner l'article suivant plus rapidement.

En cas d'erreur d'ajout panier, l'erreur sera notifiée et le champ Alias sera vidé :
- Nombre de ligne maximum du panier déjà atteint : "Cart has too many items"
- Alias inexistant : "Product not found"
- Stock épuisé : "Product is out of stock"
- Article de type "souscription" ajouté 2 fois : l'article n'est pas ajouté une 2nde fois (les articles de type souscription ont une quantité fixée à 1)
- Article à sortie future mais à pré-commande non-autorisée : "Product is not available for preorder"
- Article avec l'ajout panier désactivé dans le canal selector : "Product can't be added to basket"
- Article avec une quantité limite d'achat par commande donc le maximum est déjà atteint :
  - S'il ne s'agit pas d'un article "Stand alone" : "You can only order X of this product"
  - "Cannot order more than 2 of product: Cheap" (pour l'instant nous avons un bug avec ce contrôle, l'article est ajouté et le message est affiché après refresh panier, et la validation du panier renvoie vers /cart avec le message d'erreur)
- Article à livraison interdite dans votre pays de destination : l'article est ajouté mais le message "La livraison n'est pas disponible dans votre pays pour certains articles de votre panier." est affiché en bas de panier

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

A noter qu'en cas d'ajout d'article prix libre (PWYW) via alias, le montant du produit sera le montant minimum configuré sur le produit.

## Spécificités du tunnel (/checkout)

Le compte POS dispose d'options supplémentaires :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Livraison

Le formulaire d'adresse est optionnel, tant qu'un pays (selon de la boutique) est sélectionné, tous les autres champs sont facultatifs (dans le cas d'un client qui achète, retire directement en magasin et ne requiert pas de facture nomminative).
- Si le client souhaite être livré, le formulaire d'adresse peut être renseigné.
- Si le client souhaite une facture, l'option "Mon adresse de livraison et mon adresse de facturation sont différentes" peut être utilisée pour renseigner la facture.

### Offrir les frais de port
Par défaut, toute commande avec des articles ayant une contrepartie physique sont considérées comme en livraison.
L'administrateur (ou toute autre personne avec accès en écriture à /admin/config ) peut activer cette option dans /admin/config/delivery (voir [delivery-management.md](delivery-management.md) ).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Si l'option "Allow voiding delivery fees on POS sale" est activée, cette option sera disponible sur la page /checkout pour le compte POS :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

En cas d'activation de l'option, une justification obligatoire sera à renseignée, pour suivi managérial :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

La somme (frais de port + tva liée) sera déduite à la page suivante (les prix de la page /checkout ne sont pas encore mis à jour en temps réel en fonction des options POS appliquée).

### Paiement multiple ou paiement magasin

Le compte POS permet d'utiliser :
- les paiements classiques proposés sur le site qui ont été activés et sont éligibles ( [payment-management.md](payment-management.md ) pour l'ensemble des produits du panier 
- le paiement Point of Sale, qui inclut tout paiement extérieur au système be-BOP

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

En cas d'activation de "Utiliser plusieurs modes de paiement", le choix du paiement n'est plus nécessaire (voir "Spécificités de la commande (/order)" ci-après).

En cas d'utilisation d'un paiement classique (CB Sum Up, Lightning ou Bitcoin on-chain), le QR code de paiement sera affiché sur le périphérique client (voir "Affichage côté client" ci-après).
En cas d'utilisation du virement bancaire, la commande sera en suspens et validée une fois le virement reçu manuellement (déconseillé lors d'un paiement en magasin)

En cas d'utilisation du mode de paiement "Point of sale" (paiement unique), le mode d'encaissement sera à renseigner manuellement (voir "Spécificités de la commande (/order)" ci-après).

### Exemption de TVA

Un compte POS peut choisir de facturer sans TVA à un client (par exemple, en France, à une clientèle professionnelle).
⚖️ Votre loi locale doit autoriser l'utilisation de cette option, dont vous êtes responsable.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

En cas d'activation de l'option, une justification obligatoire sera à renseignée, pour suivi managérial :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

La somme (TVA globale) sera déduite à la page suivante (les prix de la page /checkout ne sont pas encore mis à jour en temps réel en fonction des options POS appliquée).

### Application d'une remise cadeau

Un compte POS peut choisir d'appliquer une réduction à un client :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

En cas d'activation de l'option, une justification obligatoire sera à renseignée, pour suivi managérial :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

Il faut également choisir le type de réduction :
- en %age (un message d'erreur sera affiché en cas d'entrée invalide, ou de réduction de 100%)
- en montant correspondance à la devise principale du be-BOP ( voir [currency-management.md](currency-management.md) ) (un message d'erreur sera affiché en cas d'entrée invalide, ou de réduction de correspondant au total de la commande)

⚖️ Votre loi locale doit autoriser l'utilisation de cette option et ses montants maximum, dont vous êtes responsable (par exemple : loi du prix unique en France)

⚠️ En attendant que les montants soient mis à jour en temps réel sur la page /checkout, attention au cumul réduciton + exemption de TVA + retrait des frais de port.
Le cumul des fonctions, si pas déconseillé, demande un minimum d'attention.

### Contact client facultatif

En temps normal, en mode eshop, il est nécessaire de laisser soit une adresse email, soit une npub Nostr pour recevoir les notifications de sa commande et en conserver l'URL d'accès.
En mode POS, ces champs sont facultatifs si un client refuse de laisser ses coordonnées :
- Indiquez cependant au client, dans ce cas, qu'il sera obligé de passer par le support de la boutique pour retrouver l'URL de son récapitulatif de commande, ses factures et ses fichiers téléchargeables
- Prévoyez une imprimante pour imprimer la facture après achat
- Si le panier inclut un souscription (abonnement), expliquez à la personne qu'il ne s'agit pas d'un renouvellement automatique mais qu'à chaque fois un appel à paiement est réalisé sur les coordonnées laissées (voir [subscription-management.md](subscription-management.md) ) ; et donc, sans coordonnées, la souscription ne pourra jamais être renouvellée, donc autant la retirer du panier

### Autres checkbox clients

Lors de la validation d'une commande POS, les checkbox obligagoires du parcours client restent à valider :
- l'acceptation des conditions générales de vente et d'utilisation
- (si l'option a été activée - voir [privacy-management.md](privacy-management.md) ) l'acceptation du stockage d'IP dans le cadre d'un panier sans adresse de livraison
- (si la commande inclus un article payé sur acomte - voir [payment-on-deposit.md](payment-on-deposit.md) ) l'engagement à payer le reste de la commande à terme
- (si la commande inclus une livraison à l'étranger à 0% avec détaxe et déclaration douanière obligatoire à posteriori - voir [VAT-configuration.md](VAT-configuration.md) ) l'engagement au respect des déclarations douanières

Les liens de ces différentes options renvoient vers des pages CMS décrites ici : [required-CMS-pages.md](required-CMS-pages.md).
La personne achetant en magasin n'aura évidemment pas le temps de consulter ces documents dans leur intégralité, les alternatives proposées sont :
- avoir une version imprimée de chacune de ces pages imprimée et consultable en boutique :
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- renvoyer la personne vers le site pour consultation exhautive à posteriori
- poser oralement la question au client à la validation de chaque option requise :
  - "Est-ce que vous acceptez les conditions générales de ventes ?"
  - "Est-ce que pour des raisons comptables vous acceptez l'enregistrement de votre adresse IP dans nos bases ?"
  - "Comme vous payez sur acompte, est-ce que vous vous engagez à payer le rester de la commande à terme quand notre équipe vous recontactera ?"
  - "Comme vous vous faites livrer à l'étranger, vous ne payez pas la TVA aujourd'hui, est-ce que vous êtes bien au courant que vous devrez vous acquitter de la TVA lors de la livraison ?"

### Optin

Si l'option "Display newsletter + commercial prospection option (disabled by default)" a été activée dans /admin/config (voir [KYC.md](KYC.md) ), ce formulaire sera affiché au /checkout :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Ces options ne sont à activer que 1/ si le client vous laisse son adresse email ou sa npub Nostr 2/ vous lui posez la question et obtenez formellement son accord, en lui précisant les incidences de chaque option.
Activer ces options sans obtenir l'aval explicite du client est de votre responsabilité, et la plupart du temps hors-la-loi (en plus d'être un manque de respect intégral sur la récolte de donnée personnelle de client à usage commercial sans son accord).

## Spécificités de la commande (/order)

### Paiement Point of Sale

En attendant la création de sous-types de paiement Point of Sale, le paiement Point of Sale inclut tous les paiements hors-be-BOP :
- l'utilisation d'un TPE physique (nous ne faisons pas encore de réconciliation automatique avec les TPE Sum UP, même si le compte du site et le compte du TPE sont partagés)
- cash
- chèque (pour les pays qui l'utilisent encore)
- twint (pour l'instant, l'intégration sera possible un jour)
- lingot d'or
- etc

Le compte POS dispose donc d'une validation (ou annulation) manuelle de la commande, avec un justificatif obligatoire :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

Le détail est stocké dans l'objet commande et doit permettre la réconciliation comptable plus facilement.

Ainsi, vous pouvez y indiquer :
- "Cash : donné 350€, rendu 43.53€"
- "Chèque n° XXXXX, justificatif stocké dans le dossier B2"
- "Twint : transaction XXX"
- "Sum Up : transaction XXX"

Pour récupérer le n° de transaction Sum Up lors d'un paiement TPE physique, vous pouvez le trouver ici dans l'appli liée au TPE en consultant la transaction :
![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Une fois l'encaissement réalisé, vous pouvez renseigner et valider le champ et accéder à la facture :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 Si vous souhaitez exporter la facture en PDF, vous pouvez choisir en destination d'impression "Enregistrer au format PDF" (be-BOP ne permet nativement pas la génération d'un document PDF pour le moment)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 Si vous imprimez la facture et ne voulez pas des libellés liés au navigateur à l'impression, vous pouvez désactiver l'option "En-tête et pieds de page" dans les Options des paramètres d'impression

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Paiement multiple

Si vous avez choisi cette option au /checkout :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Vous pourrez utiliser la fonction "Envoyer un appel à paiement" pour scinder en plusieurs paiements.

Imaginons que sur cette commande, 30€ sont payés en carte bleue via TPE, 20€ en lightning, et 6.42€ en liquide :

1/ Encaisser les 30€ en carte bleue via TPE puis valider le paiement

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Puis les 20€ en Lightning :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

Et enfin, une fois la transaction validée, le reste en cash :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Une fois le montant complet atteint, la commande sera notée comme "validée"

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Affichage côté client

Pendant que vous êtes derrière votre PC de caisse, vous pouvez mettre à disposition un dispositif d'affichage côté client pour qu'il ou elle puisse suivre sa commande.
Cela peut être au choix :
- un écran supplémentaire connecté en HDMI : il faut dans ce cas ouvrir un onglet sur l'url /pos/session depuis le compte de caisse, puis afficher l'écran en pleine page (souvent F11) pour retirer le header du navigateur
- un périphérique autre avec un navigateur internet, type tablette ou téléphone ; dans ce cas, il faut :
  - se rendre sur /admin/login (avec l'URL admin sécurisée)
  - se loguer avec le même compte POS
  - afficher la page /pos/session
  - désactiver la veille de l'appareil
  - voir (selon périphérique) pour passer la page web en plein écran

Lorsqu'un panier est vide et qu'une commande n'est pas en attente, un écran d'attente et d'accueil sera affiché :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Dès qu'un article est ajouté au panier depuis le poste de caisse, l'affichage se met à jour et montre son panier à la personne qui achète :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Lors d'un paiement Lightning

Le QR Code est affiché pour scan et paiement.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Lors d'un paiement Bitcoin on-chain

(Nous déconseillons l'usage du paiement on-chain en magasin, sauf si vous avez un faible nombre de vérifications, ou si vous avez le temps d'occuper votre client 15 minutes avec un café le temps que les validations se fassent)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Lors d'un paiement carte bancaire Sum Up hors TPE

Si votre TPE physique est en panne, votre client peut scanner un QR Code avec son téléphone pour avoir un formulaire de CB sur son propre appareil (ce qui est plus pratique que de lui faire taper ses informations de CB sur votre PC de caisse...).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Lorsqu'un paiement Lightning / Bitcoin on-chain / CB Sum Up par QR Code est validé

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

L'affichage revient ensuite vers l'affichage d'accueil / attente, avec le message de bienvenue et le logo du be-BOP.

### Lorsqu'un paiement Point of Sale est réalisé

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Une fois la commande validée manuellement en caisse :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

Et enfin, l'écran d'accueil / d'attente :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### En cas de paiement multiple en caisse :

Tant qu'aucune saisie n'a été faite :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Si j'effectue un premier paiement (Point of sale, pour cash) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

Au lieu d'avoir la page de confirmation, on retourne sur la page avec le reste à payer qui a été mis à jour :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

Et continuer avec les paiements suivants (ici Lightning) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Une fois l'intégralité de la commande payée :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

Et enfin, l'écran d'accueil / d'attente :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
