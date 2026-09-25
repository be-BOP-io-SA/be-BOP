# Comment configurer ma boutique be-BOP pour la première fois ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration initiale de votre boutique be-BOP, de la sécurisation de l'accès administrateur jusqu'à la personnalisation visuelle.

## 1. Définir le mot de passe administrateur [A74]

Rendez-vous sur **Admin** > **Config**, section **Admin hash**.

- **Admin hash** : Saisissez un mot de passe sécurisé pour protéger l'accès à l'interface d'administration.
- Ce mot de passe sera demandé à chaque connexion au back-office.
- Cliquez sur **Update** pour enregistrer.

> Choisissez un mot de passe fort et conservez-le en lieu sûr. Sans celui-ci, vous ne pourrez plus accéder à l'administration.

## 2. Configurer l'identité du vendeur [A85]

Rendez-vous sur **Admin** > **Config** > **Seller Identity** pour renseigner les informations légales de votre entreprise.

### Informations légales

- **Business name** : Nom officiel de l'entreprise.
- **VAT Number** : Numéro d'identification TVA.

### Adresse de l'entreprise

- **Street** : Adresse postale.
- **Country** : Pays.
- **State** : Région ou département.
- **City** : Ville.
- **Zip Code** : Code postal.

### Informations de contact

- **Email** : Adresse e-mail de contact.
- **Phone** : Numéro de téléphone.

### Compte bancaire

- **Account Holder Name** : Nom du titulaire du compte.
- **Account Holder Address** : Adresse du titulaire.
- **IBAN** : Numéro IBAN.
- **BIC** : Code BIC/SWIFT.

Remplir les informations bancaires active automatiquement le moyen de paiement **Virement Bancaire**.

### Informations sur la facture

- **Fill with main shop informations** : Bouton pour pré-remplir avec les informations de la boutique.
- **Very-top-right issuer information** : Texte optionnel affiché en haut à droite de la facture.

Cliquez sur **Update** pour enregistrer.

Pour plus de détails, consultez [Identité du vendeur](../fr/seller-identity.md).

## 3. Configurer la boutique physique [A86]

Rendez-vous sur **Admin** > **Config** > **Physical Shop** pour renseigner les informations de votre point de vente physique.

- **Shop name** : Nom de la boutique physique.
- **Address** : Adresse complète du magasin.
- **Opening hours** : Horaires d'ouverture.

Ces informations peuvent être affichées sur votre site et dans les communications clients.

Pour plus de détails, consultez [Boutique physique](../fr/physical-shop.md).

## 4. Configurer les devises [A57]

Rendez-vous sur **Admin** > **Config**, section devises.

be-BOP supporte quatre types de devises :

1. **Main Currency** : La devise principale dans laquelle les prix des produits sont affichés par défaut (ex. : EUR, CHF, USD).

2. **Secondary Currency** : Devise alternative utilisée pour l'affichage des prix ou les transactions complémentaires (ex. : BTC en complément de l'EUR).

3. **Price reference currency** : Permet de fixer les prix en évitant les fluctuations de taux de change. Cette devise sert de référence stable pour les prix des produits. En cliquant sur le bouton rouge de recalcul et en confirmant, tous les prix seront recalculés en fonction de la nouvelle devise de référence.

4. **Accounting currency** : Devise dans laquelle les montants de paiement sont également enregistrés. Utile pour les boutiques Bitcoin qui souhaitent suivre les valeurs en monnaie fiduciaire.

### Devises disponibles

| Symbole | Description                            |
| ------- | -------------------------------------- |
| `BTC`   | Bitcoin                                |
| `CHF`   | Franc suisse                           |
| `EUR`   | Euro                                   |
| `USD`   | Dollar américain                       |
| `ZAR`   | Rand sud-africain                      |
| `SAT`   | Satoshi (plus petite unité de Bitcoin) |
| `XOF`   | Franc CFA Ouest-Africain              |
| `XAF`   | Franc CFA Afrique Centrale            |
| `CDF`   | Franc congolais                        |

### Exemple

Si votre boutique est configurée avec `EUR` comme devise principale et `BTC` comme devise comptable, les prix seront affichés en euros pour les clients, tandis que les montants de paiement seront également enregistrés en Bitcoin.

## 5. Configurer le régime de TVA [A58]

Rendez-vous sur **Admin** > **Config**, section TVA.

- Définissez le régime de TVA applicable à votre entreprise.
- Configurez les taux de TVA par défaut et les profils de TVA disponibles.
- Chaque produit pourra ensuite être associé à un profil de TVA spécifique.

Pour plus de détails, consultez [Configuration TVA](../fr/VAT-configuration.md).

## 6. Activer/désactiver les langues [A77]

Rendez-vous sur **Admin** > **Config** > **Languages**.

- Activez ou désactivez les langues disponibles sur votre boutique.
- Seules les langues activées seront proposées aux visiteurs.

Pour plus de détails, consultez [Configuration des langues](../fr/language-configuration.md).

## 7. Définir la langue par défaut [A78]

Rendez-vous sur **Admin** > **Config** > **Languages**.

- Sélectionnez la langue par défaut qui sera utilisée lors de la première visite d'un client.
- Cette langue sera également utilisée comme langue de secours si la langue du navigateur du client n'est pas disponible.

## 8. Créer et éditer un thème [A48]

Rendez-vous sur **Admin** > **Merch** > **Theme**.

- Cliquez sur **Create a new theme** pour créer un nouveau thème.
- Configurez les éléments visuels pour les modes **Dark** et **Light** :
  - **Header** : Couleur de fond, polices, couleurs de police, couleur de soulignement de l'onglet actif.
  - **Navbar** : Couleur de fond, police, couleur de police, couleur de fond du champ de recherche.
  - **Footer** : Couleur de fond, police, couleur de police.
  - **Cart preview** : Couleurs de fond, couleurs des boutons CTA, polices.
  - **Body** : Couleurs de fond, polices de titre et de texte, couleurs des CTA, couleur des hyperliens.
  - **Tag widget** : Couleurs de fond, police, couleurs des CTA et hyperliens.

Pour plus de détails, consultez [Gestion des thèmes](../fr/theme-management.md).

## 9. Appliquer un thème [A49]

Rendez-vous sur **Admin** > **Merch** > **Themes**.

- Sélectionnez le thème créé dans la liste des thèmes disponibles.
- Cliquez pour l'activer comme thème principal de votre boutique.

## 10. Configurer le stockage S3 [A92]

Rendez-vous sur **Admin** > **Config** > **S3**.

- **Endpoint** : URL du service S3 (compatible AWS S3 ou MinIO).
- **Bucket** : Nom du bucket de stockage.
- **Access Key** : Clé d'accès S3.
- **Secret Key** : Clé secrète S3.
- **Region** : Région du service (si applicable).

Le stockage S3 est utilisé pour héberger les images, fichiers téléchargeables et autres médias de votre boutique.

## 11. Configurer le serveur SMTP [A103]

Rendez-vous sur **Admin** > **Config** > **SMTP**.

- **Host** : Adresse du serveur SMTP.
- **Port** : Port du serveur (ex. : 587 pour TLS).
- **Username** : Nom d'utilisateur SMTP.
- **Password** : Mot de passe SMTP.
- **From email** : Adresse e-mail d'expédition.
- **From name** : Nom d'expéditeur affiché.

La configuration SMTP est indispensable pour l'envoi des confirmations de commande, des liens de connexion et des notifications par e-mail.

Pour plus de détails, consultez [Configuration SMTP](../fr/configuration_smtp2go.md).

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Mot de passe admin | Admin hash | A74 |
| Identité vendeur | Seller Identity | A85 |
| Boutique physique | Physical Shop | A86 |
| Devises | Currency configuration | A57 |
| TVA | VAT regime | A58 |
| Langues actives | Languages | A77 |
| Langue par défaut | Default language | A78 |
| Création thème | Theme | A48 |
| Thème actif | Active theme | A49 |
| Stockage S3 | S3 configuration | A92 |
| Serveur SMTP | SMTP configuration | A103 |