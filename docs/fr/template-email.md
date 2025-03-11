# Configuration Template E-mail

Accesible on **Admin** > **Config** > **Templates**, cette section permet de configurer les templates pour les e-mails envoyés dans votre be-bop comme les emails de reinitalisation de mot de passe, de suivi de commande etc.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Liste Templates

| Template                              | Description                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| passwordReset                         | L'email envoyé lors de la reinitalisation du mot de passe                                  |
| temporarySessionRequest               | L'email envoyé lors d'une demande de session temporaire                                    |
| order.payment.expired                 | Une email de notification de commande expirée                                              |
| order.payment.canceled                | Une email de notification de commande annulée                                              |
| order.payment.paid                    | Une email de notification de commande payée entierement                                    |
| order.payment.pending.{paymentMethod} | Une email de notifaction d'un payment en attente d'une commande à payer avec paymentMethod |

## Paramétrage des templates

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Chaque template contient les champs

- **Subject** : qui est le sujet de l'email.
- **HTML body** : utilisant des balise HTML et qui est le contenu de l'email.

Deux boutons :

- **Update** : pour changer le template et sauvegarder.
- **reset to default** : pour revnir au template par défaut.

Peut contenir les balises suivantes :

- Tous : `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` and `{{bic}}`
- Les type orders : `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
