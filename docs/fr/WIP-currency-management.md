# Documentation de l'interface de configuration des devises

![image](https://github.com/user-attachments/assets/13e4bd2d-07d2-4173-8561-7fd2e04f8a04)

Definit dans **admin/config**, l'interface de configuration des devises permet de définir les principales devises utilisées pour les transactions, la comptabilité, et l'affichage des prix dans l'application. Cette fonctionnalité est particulièrement utile pour les boutiques en ligne qui acceptent plusieurs types de devises, y compris les cryptomonnaies et les monnaies fiduciaires.

### Types de Devises

1. **Main Currency** : La devise principale dans laquelle les prix des produits sont affichés par défaut.

   ![image](https://github.com/user-attachments/assets/a8c04434-3fbc-4b3a-98f2-31e60aacca33)

2. **Secondary Currency** : Devise alternative utilisée pour l'affichage des prix ou les transactions en cas de besoin.

   ![image](https://github.com/user-attachments/assets/07276ee0-8ca5-43b7-ae9f-62aaa3467050)

3. **Price reference currency** : Permet de fixer les prix en évitant les fluctuations de taux de change. Cette devise sert de référence stable pour les prix des produits.

   ![image](https://github.com/user-attachments/assets/7bc13de5-0206-4883-81d1-e80861f36803)

Au click du bouton rouge et confirmation, la devise de référence pour les prix de tous les produits sera mise à jour à et tous les prix seront recalculés en fonction de cette nouvelle devise de référence pour maintenir la cohérence et la précision malgré les fluctuations de taux de change.

![image](https://github.com/user-attachments/assets/9ca15711-acdd-490d-89f0-b5f7b8558c91)

4. **Accounting currency** : Devise dans laquelle les montants de paiement sont également enregistrés. Cette fonctionnalité est utile pour les boutiques qui souhaitent suivre les valeurs en monnaie fiduciaire, même si elles réalisent des ventes entièrement en cryptomonnaie.

   ![image](https://github.com/user-attachments/assets/27b4bd83-69b4-42e2-9f28-370b5a7306fa)

### Liste des Devises Disponibles

Les devises disponibles pour configuration dans le système sont les suivantes :

| Symbole | Description                            |
| ------- | -------------------------------------- |
| `BTC`   | Bitcoin                                |
| `CHF`   | Franc suisse                           |
| `EUR`   | Euro                                   |
| `USD`   | Dollar américain                       |
| `ZAR`   | Rand sud-africain                      |
| `SAT`   | Satoshi (plus petite unité de Bitcoin) |
| `XOF`   | Franc CFA Ouest-Africain               |
| `XAF`   | Franc CFA Afrique Centrale             |
| `CDF`   | Franc congolais                        |

### Exemple d'Utilisation

- Si une boutique en ligne est configurée avec `EUR` comme devise principale et `BTC` comme devise comptable, les prix peuvent être affichés en euros pour les clients, tandis que les montants de paiement seront enregistrés en Bitcoin.
- En définissant une `devise de référence pour les prix`, la boutique peut éviter les fluctuations fréquentes dans les prix dus aux taux de change, en utilisant une devise stable pour l’évaluation des prix de base.
