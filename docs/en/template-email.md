# Email Template Configuration

Accessible via **Admin** > **Config** > **Templates**, this section allows you to configure templates for emails sent by your be-BOP, such as password reset emails, order tracking emails, etc.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Template List

| Template                              | Description                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| passwordReset                         | The email sent when resetting the password                                            |
| temporarySessionRequest               | The email sent when requesting a temporary session                                    |
| order.payment.expired                 | A notification email for an expired order                                             |
| order.payment.canceled                | A notification email for a canceled order                                             |
| order.payment.paid                    | A notification email for a fully paid order                                           |
| order.payment.pending.{paymentMethod} | A notification email for a pending payment of an order to be paid with paymentMethod  |

## Template Settings

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Each template contains the fields:

- **Subject**: The email subject.
- **HTML body**: Using HTML tags, this is the email content.

Two buttons:

- **Update**: To change the template and save.
- **reset to default**: To revert to the default template.

Can contain the following tags:

- All: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` and `{{bic}}`
- Order types: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
