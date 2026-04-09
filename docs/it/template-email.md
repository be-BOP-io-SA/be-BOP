# Configurazione Template E-mail

Accessibile tramite **Admin** > **Config** > **Templates**, questa sezione consente di configurare i template per le e-mail inviate dal vostro be-BOP, come e-mail di reimpostazione password, e-mail di tracciamento ordini, ecc.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Elenco Template

| Template                              | Descrizione                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| passwordReset                         | L'e-mail inviata durante la reimpostazione della password                                 |
| temporarySessionRequest               | L'e-mail inviata durante la richiesta di una sessione temporanea                          |
| order.payment.expired                 | Un'e-mail di notifica per un ordine scaduto                                               |
| order.payment.canceled                | Un'e-mail di notifica per un ordine annullato                                             |
| order.payment.paid                    | Un'e-mail di notifica per un ordine completamente pagato                                  |
| order.payment.pending.{paymentMethod} | Un'e-mail di notifica per un pagamento in attesa di un ordine da pagare con paymentMethod |

## Impostazioni dei Template

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Ogni template contiene i campi:

- **Subject**: L'oggetto dell'e-mail.
- **HTML body**: Utilizzando tag HTML, questo è il contenuto dell'e-mail.

Due pulsanti:

- **Update**: Per modificare il template e salvare.
- **reset to default**: Per tornare al template predefinito.

Può contenere i seguenti tag:

- Tutti: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` e `{{bic}}`
- Tipi di ordine: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
