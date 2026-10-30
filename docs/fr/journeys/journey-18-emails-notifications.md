# Comment configurer les emails et les notifications ?

> **Parcours propriétaire** — Ce guide est destiné aux administrateurs de la boutique.

Ce guide vous accompagne dans la configuration du serveur SMTP, des templates d'emails et des notifications par e-mail dans be-BOP.

## 1. Configurer le serveur SMTP [A103]

Rendez-vous sur **Admin** > **Config** > **SMTP**.

Remplissez les champs suivants :

- **Host** : Adresse du serveur SMTP (ex. : `mail.smtp2go.com`).
- **Port** : Port du serveur (ex. : `2525` pour smtp2go, `587` pour TLS).
- **Username** : Identifiant de connexion SMTP.
- **Password** : Mot de passe SMTP.
- **From email** : Adresse e-mail d'expédition (doit correspondre à l'adresse vérifiée auprès de votre fournisseur SMTP).
- **From name** : Nom d'expéditeur affiché dans les emails.

> Assurez-vous que l'adresse email d'envoi soit la même que celle configurée dans **Admin** > **Config** > **Identity**, section **Contact Information > Email**.

Pour plus de détails sur la configuration avec smtp2go, consultez [Configuration SMTP2GO](../fr/configuration_smtp2go.md).

## 2. Configurer les templates d'emails [A87]

Rendez-vous sur **Admin** > **Config** > **Templates**.

Les templates disponibles sont :

| Template | Description |
| -------- | ----------- |
| `passwordReset` | Email de réinitialisation de mot de passe |
| `temporarySessionRequest` | Email de demande de session temporaire (magic link) |
| `order.payment.expired` | Notification de commande expirée |
| `order.payment.canceled` | Notification de commande annulée |
| `order.payment.paid` | Notification de commande payée |
| `order.payment.pending.{paymentMethod}` | Notification de paiement en attente |

Pour chaque template, configurez :

- **Subject** : Objet de l'email.
- **HTML body** : Contenu de l'email en HTML.

### Variables disponibles

- Variables communes : `{{websiteLink}}`, `{{brandName}}`, `{{iban}}`, `{{bic}}`
- Variables de commande : `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`

Cliquez sur **Update** pour enregistrer vos modifications.

## 3. Réinitialiser un template par défaut [A88]

Rendez-vous sur **Admin** > **Config** > **Templates**.

- Sélectionnez le template à réinitialiser.
- Cliquez sur le bouton **Reset to default** pour restaurer le contenu original du template.
- Le template retrouvera son sujet et son contenu HTML par défaut.

> Cette action est irréversible : toute personnalisation du template sera perdue.

## 4. Envoyer un email de test [A104]

Rendez-vous sur **Admin** > **Config** > **Email**.

- Utilisez la fonction de test pour vérifier que la connexion SMTP fonctionne correctement.
- Un email de test sera envoyé à l'adresse configurée.
- Vérifiez la réception de l'email dans votre boîte de réception.

> Si l'email de test n'arrive pas, vérifiez vos paramètres SMTP (host, port, identifiants) et la vérification de votre adresse d'expédition auprès de votre fournisseur.

## 5. Envoyer une copie des emails de commande à l'administrateur [A69]

Rendez-vous sur **Admin** > **Config**.

- Activez la case permettant d'envoyer une copie de chaque email de commande à l'adresse administrateur.
- Lorsque cette option est cochée, chaque notification de commande (paiement reçu, commande expirée, etc.) sera également envoyée à l'email de contact configuré dans l'identité du vendeur.

> Cette option est utile pour garder une trace des notifications envoyées aux clients et être alerté en temps réel des nouvelles commandes.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Serveur SMTP | SMTP configuration | A103 |
| Templates d'emails | Email templates | A87 |
| Réinitialiser template | Reset template | A88 |
| Email de test | Test email | A104 |
| Copie admin | Order email copy | A69 |

Pour plus de détails, consultez [Configuration SMTP2GO](../fr/configuration_smtp2go.md) et [Templates d'emails](../fr/template-email.md).