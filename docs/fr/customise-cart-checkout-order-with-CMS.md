# Personnalisation du tunnel de commande

Le tunnel est constitué de 3 pages successives :
- /cart (le panier)
- /checkout (page de livraison, choix de paiement et contact)
- /order (page de bilan de commande, d'appel à paiement et d'accès à la facture et aux fichiers téléchargeables)

Chacune de ces pages peut être embellie par l'intégration du contenu d'une page CMS.
Ces pages sont :

Pour le panier (/cart]
  /basket-top
  /basket-bottom
Pour le tunnel (/checkout)
/checkout-top
/checkout-bottom
Pour la page de commande (/order)
  /order-top
  /order-bottom

Les contenus sont affichés de cette façon (ici, avec l'utilisation d'un tag [Picture=ID] dans chaque page CMS, voir [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Tous les contenus CMS peuvent être utilisés (slider, image de remerciement, formulaire de contact sur la page /checkout, etc).

Il est néanmoins déconseiller d'intégrer des liens textuels ou des widgets avec CTA (Tag ou Product), par envie de cross-selling ou autre. Une fois au /cart, toute sortie du tunnel de commande est un risque de commande non-finalisée et de baisse du taux de transformation.

Les widgets conseillés sont donc :
- du contenu CMS standart sans lien hypertexte
- le widget [Picture=ID]
- le widget [Slider=ID]
- le widget [Form=ID], plus particulièrement sur la page /order-bottom

Et ne surchargez pas trop ces pages CMS intégérées, sous peine de perdre de l'utilisateur / utilisatrice et de lui faire abandonner sa commande.
