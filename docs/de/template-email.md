# E-Mail-Vorlagen-Konfiguration

Zugänglich über **Admin** > **Config** > **Templates**, dieser Bereich ermöglicht es Ihnen, Vorlagen für von Ihrem be-BOP gesendete E-Mails zu konfigurieren, wie z.B. E-Mails zum Zurücksetzen des Passworts, Bestellverfolgungs-E-Mails usw.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Vorlagenliste

| Template                              | Beschreibung                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| passwordReset                         | Die E-Mail, die beim Zurücksetzen des Passworts gesendet wird                         |
| temporarySessionRequest               | Die E-Mail, die bei Anforderung einer temporären Sitzung gesendet wird                |
| order.payment.expired                 | Benachrichtigungs-E-Mail für eine abgelaufene Bestellung                              |
| order.payment.canceled                | Benachrichtigungs-E-Mail für eine stornierte Bestellung                               |
| order.payment.paid                    | Benachrichtigungs-E-Mail für eine vollständig bezahlte Bestellung                     |
| order.payment.pending.{paymentMethod} | Benachrichtigungs-E-Mail für eine ausstehende Zahlung einer Bestellung mit paymentMethod |

## Vorlageneinstellungen

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Jede Vorlage enthält die Felder:

- **Subject**: Der E-Mail-Betreff.
- **HTML body**: Unter Verwendung von HTML-Tags ist dies der E-Mail-Inhalt.

Zwei Schaltflächen:

- **Update**: Zum Ändern und Speichern der Vorlage.
- **reset to default**: Zum Zurücksetzen auf die Standardvorlage.

Kann die folgenden Tags enthalten:

- Alle: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` und `{{bic}}`
- Bestelltypen: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
