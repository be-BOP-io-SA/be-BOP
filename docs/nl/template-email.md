# E-mailtemplate Configuratie

Toegankelijk via **Admin** > **Config** > **Templates**, dit gedeelte stelt u in staat om templates te configureren voor e-mails die door uw be-BOP worden verzonden, zoals wachtwoordherstel e-mails, orderopvolging e-mails, enz.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Templatelijst

| Template                              | Beschrijving                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| passwordReset                         | De e-mail die wordt verzonden bij het herstellen van het wachtwoord                       |
| temporarySessionRequest               | De e-mail die wordt verzonden bij het aanvragen van een tijdelijke sessie                 |
| order.payment.expired                 | Een notificatie-e-mail voor een verlopen bestelling                                       |
| order.payment.canceled                | Een notificatie-e-mail voor een geannuleerde bestelling                                   |
| order.payment.paid                    | Een notificatie-e-mail voor een volledig betaalde bestelling                               |
| order.payment.pending.{paymentMethod} | Een notificatie-e-mail voor een lopende betaling van een bestelling met paymentMethod      |

## Template-instellingen

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Elke template bevat de velden:

- **Subject**: Het onderwerp van de e-mail.
- **HTML body**: Met HTML-tags, dit is de inhoud van de e-mail.

Twee knoppen:

- **Update**: Om de template te wijzigen en op te slaan.
- **reset to default**: Om terug te keren naar de standaard template.

Kan de volgende tags bevatten:

- Alle: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` en `{{bic}}`
- Ordertypen: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
