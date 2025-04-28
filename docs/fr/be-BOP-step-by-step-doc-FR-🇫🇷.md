# be-BOP step-by-step doc FR 🇫🇷

# 1\. Installation et Accès Initial

**1\.1. Installation de be-BOP**

- **Pré-requis :**

    1. **Infrastructure technique :**

        - **Stockage S3 compatible :** Un service ou solution (ex. : MinIO, AWS S3, Scaleway, …) avec la configuration du bucket (S3\_BUCKET, S3\_ENDPOINT\_URL, S3\_KEY\_ID, S3\_KEY\_SECRET, S3\_REGION).

        - **Base de données MongoDB en ReplicaSet :** Soit une instance locale configurée en ReplicaSet, soit l’utilisation d’un service tel que MongoDB Atlas (variables MONGODB\_URL et MONGODB\_DB).

        - **Environnement Node.js :** Node version 18 ou supérieure, avec Corepack activé (`corepack enable`).

        - **Git LFS installé :** Pour gérer les gros fichiers (commande `git lfs install`).

    2. **Configuration des communications :**

        - **SMTP :** Des identifiants SMTP valides (SMTP\_HOST, SMTP\_PORT, SMTP\_USER, SMTP\_PASSWORD, SMTP\_FROM) pour l’envoi d’e-mails et notifications.

    3. **Sécurité et notifications (minimum l'un des deux):**

        - **E-mail :** Un compte e-mail permettant la configuration SMTP pour l’envoi de notifications.

        - **Clé Nostr (nsec) :** Une clé NSEC (peu être générer par be-BOP via l’interface Nostr)

    4. **Méthodes de paiement compatibles :**

        - Disposer d’au moins une méthode de paiement supporté par be-BOP, telle que :

            - Bitcoin

            - Lightning Network

            - PayPal

            - SumUp

            - Stripe

            - Les virement bancaires et paiements cash ont besoin d'une validation manuelle

    5. **Connaissance de votre régime de TVA :**

        - Il est indispensable de connaître le régime de TVA applicable à votre activité (ex. : vente sous TVA du pays du vendeur, exemption sous justification, ou vente au taux de TVA du pays de l’acheteur) afin de configurer correctement les options de facturation et de calcul de la TVA dans be-BOP.

    6. **Configuration des devises :**

        - Déterminez clairement quelle devise principale utiliser, quelle devise secondaire (si applicable) et, pour une boutique 100 % BTC, quelle devise de référence utiliser pour la comptabilité.

    7. **Autres prérequis métier :**

        - Avoir une vision de vos processus de commande, de gestion de stock, de politique des frais de port ainsi que des modalités de paiement et d’encaissement, en ligne et/ou en magasin.

        - Connaître les obligations légales (mentions légales, conditions d’utilisation, politique de confidentialité) pour la mise en place des pages CMS obligatoires.

- **Installation :** Déployez l’application via le script d'installation officiel sur votre serveur et vérifiez que toutes les dépendances sont installées correctement.

**1\.2. Création du compte Super-Admin**

- Rendez-vous sur **/admin/login**

- Créez votre compte super-admin en choisissant un identifiant et un mot de passe sécurisés. Privilégiez une phrase de passe de trois mots ou plus.

- Ce compte vous permettra d’accéder à l’ensemble des fonctionnalités du back-office.

---

# 2\. Sécurisation et Configuration du Back-Office

**2\.1. Sécurisation de l’accès**

- **Configuration du hash d’accès :**

    - Allez dans **/admin/config** via l’interface d’administration.

    - Dans la section dédiée à la sécurisation (ex. « Admin hash »), définissez une chaîne unique (hash).

    - Une fois enregistré, l’URL du back-office sera modifiée (par exemple : **/admin-votrehash/login**) afin de limiter l’accès aux personnes autorisées.

**2\.2. Activation du mode maintenance (si nécessaire)**

- Toujours dans **/admin/config**, (Config > Config via l'interface graphique) cochez l’option **Enable maintenance mode** au bas de la page.

- Vous pouvez, le cas échéant, indiquer une liste d’adresses IPv4 autorisées (séparées par des virgules) pour permettre l’accès au front-office pendant la maintenance.

- Le back-office reste accessible pour les administrateurs.

**2\.3. Configuration des accès de récupération via email ou nostr**

- Toujours dans **/admin/config**, via le module ARM, assurez-vous que le compte super-admin comporte une adresse e-mail ou une npub de récupération, facilitant ainsi la procédure en cas d’oubli du mot de passe.

**2\.4. Configuration de la langue ou du multilingue**

- Dans **Admin > Config > Languages**, activez ou désactivez le sélecteur de langue selon si votre site est multi-langue ou mono-langue (désactivez-le pour un site en une seule langue).

2\.5.Configuration du Layout, Logos et Favicon

- Dans **Admin > Merch > Layout**, configurez la top bar, la nav bar et le footer.

    - Veillez à activer l’option « Display powered by be-BOP » dans le footer.

    - N’oubliez pas de définir les logos pour les thèmes clair et sombre, ainsi que le favicon, via **Admin > Merch > Pictures**.

---

# 3\. Configuration de l’Identité du Vendeur

**3\.1. Paramétrage de l’identité**

- Accédez à **/admin/identity** (Config > Identity via l'interface graphique) pour renseigner toutes les informations relatives à votre entreprise :

    - **Nom de l’entreprise**, **adresse postale**, **email de contact** qui sera utilisé pour l’envoi des factures et pour les communications officielles.

    - **Informations de facturation** (optionnelles) qui apparaîtront dans le coin supérieur droit des factures.

- **Compte bancaire :**

    - Pour activer le paiement par virement bancaire, renseignez votre IBAN et votre BIC.

**3\.2. (Pour magasin physique) Affichage de l’adresse du store**

- Pour ceux disposant d’un magasin physique, dupliquez la configuration précédente en ajoutant dans **/admin/identity** (ou via une section dédiée) l’adresse complète du store, afin qu’elle soit affichée sur vos documents officiels et dans le footer, le cas échéant.

---

# 4\. Configuration des Devises

**4\.1. Définition des devises dans /admin/config**

- **Devise principale :**

    - Cette devise est affichée sur le front-office et sur les factures.

- **Devise secondaire (optionnelle) :**

    - Peut être utilisée pour l’affichage ou comme alternative.

- **Devise de référence pour les prix :**

    - Permet de fixer vos prix dans une devise "stable".

    - Attention : Un clic sur le bouton de confirmation recalculera les prix de tous les produits sans modifier les montants saisis.

- **Devise de compte :**

    - Utilisée pour suivre le taux de change dans un be-BOP entièrement en Bitcoin.

---

# 5\. Configuration des Méthodes de Paiement

Vous pouvez définir la durée d'un paiement en attente dans le panneau **Admin > Config !**

**5\.1. Paiements Bitcoin et Lightning**

- **Bitcoin nodeless (onchain) :**

    - Dans **Admin > Payment Settings > Bitcoin nodeless**, configurez le module en choisissant le standard BIP (uniquement BIP84 pour le moment).

    - Renseignez la clé publique (format **zpub**) générée avec un portefeuille compatible (ex. Sparrow Wallet).

    - Ne modifiez pas l’indice de dérivation, qui démarre à 0 et s’incrémente automatiquement.

    - Configurez l’URL d'un explorateur de blocs pour vérifier les transactions (ex. : `https://mempool.space` ).

- **PhoenixD pour Lightning :**

    - Installez PhoenixD sur votre serveur en suivant les instructions de [[https://phoenix.acinq.co/server/get-started](<https://phoenix.acinq.co/server/get-started>)].

    - Dans **Admin > Payment Settings > PhoenixD**, indiquez l’URL de votre instance (si vous utilisez Docker, pensez aux particularités réseau) et ajoutez le mot de passe HTTP de PhoenixD. Si vous installer PhoenixD sur le même serveur que votre be-BOP cliquez sur le bouton Detect PhoenixD Server

**Pour les power-users**

Il est possible d'avoir un full node Bitcoin ainsi que LND grâce au .env et en utilisant les identifiants RPC (+TOR recommandé) pour un noeud distant. Sinon vous pouvez installer bitcoin core ainsi que LND sur le même réseau local que votre be-BOP.

- **Bitcoin Core :**

    - Dans **Admin > Payment Settings > Bitcoin core node**

- **Lightning LND : **

    - Dans **Admin > Payment Settings > Lightning LND node**

**5\.2. Paiement par PayPal**

- Dans **Admin > Payment Settings > Paypal**, saisissez votre Client ID et Secret obtenus depuis votre compte développeur PayPal. [https://developer.paypal.com/api/rest/](<https://developer.paypal.com/api/rest/>)

- Cochez **Those credentials are for the sandbox environment** si vous souhaitez utiliser le mode Sandbox (pour tester) ou laissez par défaut pour le mode production.

**5\.3. Paiement par SumUp**

- Dans **Admin > Payment Settings > SumUp**, entrez votre API Key et votre Merchant Code. [https://developer.sumup.com/api](<https://developer.sumup.com/api>)

- La devise utilisée correspond à celle de votre compte SumUp (généralement celle du pays de votre entreprise).

**5\.4. Paiement par Stripe**

- Dans **Admin > Payment Settings > Stripe**, entrez votre Secret Key et votre Public Key. [https://docs.stripe.com/api](<https://docs.stripe.com/api>)

- La devise utilisée correspond à celle de votre compte Stripe (généralement celle du pays de votre entreprise).

---

# 6\. Gestion des Produits

**6\.1. Création d’un nouveau produit**

- Rendez-vous dans **Admin > Merch > Products** pour ajouter ou modifier un produit.

- **Informations de base :**

    - Renseignez le **Product name**, le **slug** (identifiant unique pour l’URL) et, si nécessaire, un **alias** pour faciliter l’ajout via le champ dédié dans le panier. Pour les produits destinés à la vente en ligne (hors Point of Sale), l’ajout d’un alias n’est pas requis.

- **Tarification :**

    - Définissez le prix dans **Price Amount** et sélectionnez la monnaie dans **Price Currency**. Vous pouvez aussi créer des produits gratuits ou prix libre grâce aux options du produits plus bas en cochant les cases **This is a free product **et **This is a pay-what-you-want product **respectivement.

    - **Options du produit :**

    - Indiquez si le produit est standalone (ajout unique par commande) ou s’il s’agit d’un produit avec variations (exemple un t-shirt S, M, L et XL n'est pas standalone ).

    - Pour les produits avec variations comme l'exemple précendant, activez l’option **Product has light variations (no stock difference)** et ajoutez les variations (nom, valeur, et différence de prix).

**6\.2. Gestion du stock**

- Pour un produit à stock limité, cochez **The product has a limited stock** et renseignez la quantité disponible.

- Le système affiche également le stock réservé (dans les commandes en attente) et le stock vendu.

- Vous pouvez changer la valeur en minutes de la durée à laquelle un produit est considéré comme réservé dans un panier en attente de paiement dans **Admin > Config**

---

# 7\. Création et Personnalisation des Pages CMS et Widgets

**7\.1. Pages CMS obligatoires**

- Créer dans **Admin > Merch > CMS** les pages essentielles telles que :

    - `/home` (page d’accueil),

    - `/error` (page d’erreur),

    - `/maintenance` (page de maintenance),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (pages légales et d’informations obligatoires).

- Ces pages sont destinées à fournir à vos visiteurs les informations légales, de contact et à expliquer le fonctionnement de votre boutique.

- Vous pouvez ajouter au temps de pages que vous le souhaitez.

**7\.2. Layout et éléments graphiques**

- Rendez-vous dans **Admin > Merch > Layout** pour personnaliser votre top bar, navbar et footer.

- Modifiez les liens, les logos (via **Admin > Merch > Pictures**) et la description de votre site.

**7\.3. Intégration de widgets dans les pages CMS**

- Vous pouvez créer différents Widgets dans **Admin > Widgets **Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries et Leaderboards

- Utilisez les balises spécifiques pour intégrer des éléments dynamiques, par exemple :

    - Pour afficher un produit : `[Product=slug?display=img-1]`

    - Pour afficher une image : `[Picture=slug width=100 height=100 fit=contain]`

    - Pour intégrer un slider : `[Slider=slug?autoplay=3000]`

    - Pour ajouter un challenge, un compte à rebours, un formulaire, etc., utilisez respectivement `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`.

---

# 8\. Gestion des Commandes et du Reporting

**8\.1. Suivi des commandes**

- Dans **Admin > Transaction > Orders**, vous pouvez visualiser la liste des commandes.

- Utilisez les filtres disponibles (Order Number, Product alias, Payment Mean, Email, etc.) pour affiner votre recherche.

- Vous avez la possibilité de consulter les détails d’une commande (produits commandés, informations du client, adresse de livraison) et de gérer l’état de la commande (confirmer, annuler, ajouter des labels, consulter les notes de commande).

**8\.2. Reporting et export**

- Accédez à **Admin > Config > Reporting** pour consulter les statistiques mensuelles et annuelles des commandes, produits et paiements.

- Chaque section (Order Detail, Product Detail, Payment Detail) offre un bouton **Export CSV** pour télécharger les données.

---

# 9\. Configuration de la Messagerie Nostr (optionnel)

**9\.1. Configuration de la clé Nostr**

- Dans **Admin > Node Management > Nostr**, cliquez sur **Créer une nsec** si vous n’en possédez pas déjà une.  
    **REMARQUE :** Si vous avez déjà généré et configuré votre nsec via un client Nostr et l’avez renseignée dans votre fichier .env, cette étape peut être omise.

- Copiez la clé NSEC générée par vos soin ou be-BOP et ajoutez-la dans votre fichier **.env.local** sous la variable `NOSTR_PRIVATE_KEY`.

**9\.2. Fonctionnalités associées**

- Cette configuration permet d’envoyer des notifications via Nostr, d’activer le client léger d’administration et de proposer des connexions passwordless via des liens temporaires.

---

# 10\. Personnalisation du Design et des Thèmes

- Dans **Admin > Merch > Theme**, créez un thème en définissant les couleurs, polices et styles pour les éléments du header, body, footer, etc.

- Une fois le thème créé, appliquez-le comme thème actif pour votre boutique.

---

# 11\. Configuration des Templates d’E-mails

- Accédez à **Admin > Config > Templates** pour configurer les templates d’e-mails (ex. pour la réinitialisation de mot de passe, les notifications de commande, etc.).

- Pour chaque template, renseignez le **Subject** et le **HTML body**.

- Les templates acceptent des variables telles que `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}`, etc.

---



# Pour aller plus loin...

# 12\. Configuration des Tags et Widgets Spécifiques

**12\.1. Gestion des Tags**

- Dans **Admin > Widgets > Tag**, créez des tags pour organiser vos produits ou enrichir vos pages CMS.

- Renseignez le **Tag name**, le **slug**, choisissez la **Tag Family** (Creators, Retailers, Temporal, Events) et complétez les champs optionnels (titre, sous-titre, contenu court et complet, CTAs).

**12\.2. Intégration via CMS**

- Pour intégrer un tag dans une page, utilisez la syntaxe :
    `[Tag=slug?display=var-1]`

# 13\. Configuration des Fichiers Téléchargeables

**	Ajout d’un fichier**

- Dans **Admin > Merch > Files**, cliquez sur **New file**.

- Renseignez le **nom du fichier** (ex. "Notice produit") et téléchargez le fichier via le bouton **Parcourir…**.

- Une fois ajouté, un lien permanent est généré et pourra être utilisé dans vos pages CMS pour partager le fichier.14. Nostr-bot

# **14\. Nostr-bot**

Dans la section **Node Management > Nostr**, vous pouvez configurer votre interface Nostr, qui permet d’envoyer des notifications et d’interagir avec vos clients. Parmi les options disponibles, vous pouvez :

- Gérer la liste des relais utilisés par votre nostr-bot.

- Activer ou désactiver le message d’introduction automatique envoyé par le bot.

- Certifier votre npub, en associant à celui-ci un logo, un nom et un domaine (alias Lightning BOLT12 pour les Zaps).

# **15\. Surcharge des libellés de traduction**

Bien que be-BOP soit disponible en plusieurs langues (anglais, français, espagnol, etc.), il vous est possible de personnaliser les traductions pour les adapter à vos besoins. Pour ce faire, rendez-vous dans **Config > Languages**, où vous pourrez charger et éditer les fichiers JSON de traduction. Vous trouverez ces fichiers pour chaque langue dans notre dépôt officiel à l’adresse suivante :  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](<https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations>)





# PART 2 Teamwork et POS

# 1\. Gestion des Utilisateurs et des Droits d’Accès

**1\.1. Création des rôles**

- Dans **Admin > Config > ARM**, cliquez sur **Create a role** pour définir les rôles (ex. : Super Admin, Point of Sale, Ticket checker).

- Pour chaque rôle, précisez :

    - Les chemins d’accès en **write access** et **read access**.

    - Les chemins interdits via **Forbidden access**.

**1\.2. Gestion des utilisateurs**

- Dans **Admin > Users**, créez ou modifiez les utilisateurs en renseignant :

    - Le **login**, l’**alias**, l’**email de récupération** et, le cas échéant, la **Recovery npub**.

    - Attribuez le rôle approprié à chaque utilisateur.

- Les utilisateurs avec accès en lecture seule verront les menus en italique et ne pourront effectuer aucune modification.

# 2\. Configuration du Point of Sale (POS) pour la Vente en Magasin

**2\.1. Attribution et accès POS**

- Attribuez le rôle **Point of Sale (POS)** via **Admin > Config > ARM** à l’utilisateur en charge de la caisse.

- Les utilisateurs POS se connectent via la page d’identification sécurisée et sont redirigés vers l’interface dédiée (ex. : **/pos** ou **/pos/touch**).

**2\.2. Fonctionnalités spécifiques POS**

- **Ajout rapide via alias :** Dans **/cart**, le champ d’ajout par alias permet de scanner un code-barres (ISBN, EAN13) pour ajouter directement le produit.

- **Options de paiement POS :**

    - Possibilité de gérer des paiements multi-modes (paiement en espèces, carte, lightning, etc.).

    - Options spécifiques pour l’exemption de TVA ou la réduction cadeau avec saisie obligatoire d’une justification managériale.

- **Affichage côté client :**

    - Sur un écran dédié (ex. tablette ou écran externe via HDMI), affichez la page **/pos/session** pour que le client puisse suivre l’évolution de sa commande.



