# Pages CMS obligatoires

## Introduction

be-BOP utilise nativement certaines pages obligatoires pour afficher différents textes (type mentions légales), la homepage ou des pages d'erreur.
Ces pages sont des pages CMS pouvant être personnalisées dans /admin/CMS comme n'importe quelle page de contenu enrichi.

Les slugs de ces pages sont :
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Homepage
Cette page est affichée lors de l'accès à la racine de votre site (/).
Servant de vitrine à votre entreprise, elle doit (ou peut, selon goûts), en synthèse :
- présenter votre marque
- présenter vos valeurs
- présenter votre actualité
- mettre en avant certains articles
- permettre de parcourir au reste de votre site au fur et à mesure de sa lecture, sans revenir aux menus
- présenter votre identité graphique
- permettre de vous contacter
- ne pas être surchargée
Si chacun des points peut être développé dans sa propre page CMS, une lecture verticale de votre homepage doit donner envie au visiteur de découvrir au reste de votre site.

## /error - Page d'erreur
Si on la souhaite le moins affichée possible, il est toujours préférable en cas d'erreur de rediriger votre utilisateur vers du contenu qu'un message d'erreur brut.
Cela peut se traduire par :
- un message d'excuse (indispensable)
- un formulaire de contact pour signalier l'anomalie rencontrée
- un renvoi vers une sélection de produits, une page d'actualité ou la homepage via un lien

## /maintenance - Page de maintenance
Voir [maintenance-whitelist.md](/docs/fr/maintenance-whitelist.md)
Lorsque vous effectuez des travaux sur votre site ou devez restreinte son accès pour des opérations de migration, sauvegarde ou autre, vous pouvez mettre votre site en maintenance.
L'ensemble du public (modulo une liste de visiteurs dont l'IP aura été préalablement whitelistée), lorsqu'il tentera d'accéder à n'importe quelle page de votre site, sera redirigé vers la page /maintenance.
Vous pouvez y inclure :
- une explication sur la fermeture du site
- un teasing sur les nouveautés qui viendront avec les réouvertures
- un formulaire de contact
- des visuels
- des liens vers d'autres sites ou réseaux sociaux

## /terms - Conditions d'utilisation
Cette page est usuellement affichée dans les liens du footer du site, et est également affichée dans le tunnel (/checkout) avec l'option obligatoire à cocher **I agree to the terms of service** (*J'accepte les conditions d'utilisation*).
Le lien de cette option obligatoire dans le tunnel (/checkout) renvoie vers /terms, et permet à vos visiteurs de connaîtres toutes les conditions générales de ventes et d'utitilisation.
Remplir cette page est fastidieux, mais néanmoins obligatoire !

## /privacy - Politique de confidentialité
Voir [privacy-management.md](/docs/fr/privacy-management.md)
Cette page est usuellement afichée dans les liens du footer du site.
Elle permet à vos visiteurs de connaîtres toutes les conditions d'utilisations de leurs informations personnelles, du respect de la RGPD, de la collecte de cookies, etc.
Nativement, le seul cookie present (bootik-session) sur be-BOP est le cookie de session qui est essential au bon fonctionnement.
Nous n’utilisons pas de cookie publicitaire.
Un second cookie (lang) est présent pour la conservation du choix de la langue.
En tant que propriétaire, vous pouvez récolter plus d'informations (information de facturation, adresse IP) pour raisons légales et comptables : à vous de l'expliquer dans cette page.
De plus, si, nativement, les optins pour démarchage commercial sont désactivés sur be-BOP, leur présentation (désactivée) au client est possible, et vous devez vous engager à respecter le choix du client sur ce qu'il choisit ou non dans ses optins.
Remplir cette page est fastidieux, mais néanmoins obligatoire et éthique vis-à-vis de vos visiteurs !

## /why-vat-customs - Paiement aux douanes dès réception
Voir [VAT-configuration.md](/docs/fr/VAT-configuration.md)
Dans le cadre du régime de TVA 2B (vente au taux de TVA du pays du vendeur et exonération pour la livraison d'articles physiques à l'étranger), le client devra valider une nouvelle option obligatoire : I understand that I will have to pay VAT upon delivery (Je comprends que je devrais payer la VAT au moment de la livraison). Le lien de cette option renvoie vers la page CMS /why-vat-customs , à créer et à compléter pour expliquer pourquoi votre client doit s'acquitter de la TVA de son pays dès réception de votre article.

## /why-collect-ip - Justification de la collecte d'IP
Voir [privacy-management.md](/docs/fr/privacy-management.md)
Si, pour raison comptable ou légale, vous devez stocker l'IP de votre client lors d'un achat dématérialisé sans adresse postale (via /admin/config avec l'option **Request IP collection on deliveryless order** (*Demander le stockage de l'IP pour les demandes sans livraison physique*)), le client disposera d'une option obligatoire pour terminer sa commande **I agree to the collection of my IP address (why?)** (*J'accepte la collecte de mon adresse IP (pourquoi?)*).
Le lien de cette option renvoie vers /why-collect-ip , où il est préférable d'expliquer pourquoi vous souhaitez la sauvegarde d'une telle donnée (en rappelant que l'acceptation par le client est obligatoire pour finaliser la commande si vous configurez votre be-BOP ainsi).

## /why-pay-reminder - Engagement de paiement d'une commande sur acompte
Voir [order-with-deposit.md](/doc/fr/order-with-deposit.md)
Lorsque vous activez le paiement sur acompte pour l'un de vos articles, la première commande réalisée n'inclut que l'acompte, mais le client s'engage auprès du vendeur à payer, sous conditions présentées, le reste du montant de commande.
Si votre commande inclut une réservation d'article sur acompte, le lien est affiché dans le tunnel (/checkout) avec l'option obligatoire à cocher **I agree that I need to pay the remainder in the future (why?)** (*Je comprends que je dois m'acquitter du solde hors-acompte (pourquoi ?)*)

## /order-top, /order-bottom, /checkout-top, /checkout-bottom,  /basket-top, /basket-bottom
Voir [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
