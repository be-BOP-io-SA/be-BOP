# Configuração de Modelos de E-mail

Acessível via **Admin** > **Config** > **Templates**, esta secção permite configurar modelos para e-mails enviados pelo seu be-BOP, como e-mails de reposição de palavra-passe, e-mails de acompanhamento de encomendas, etc.

![image](https://github.com/user-attachments/assets/a9b89016-1c6b-4f6c-9254-fae71ac72cd0)

## Lista de Modelos

| Template                              | Descrição                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| passwordReset                         | O e-mail enviado ao repor a palavra-passe                                             |
| temporarySessionRequest               | O e-mail enviado ao solicitar uma sessão temporária                                   |
| order.payment.expired                 | E-mail de notificação de encomenda expirada                                           |
| order.payment.canceled                | E-mail de notificação de encomenda cancelada                                          |
| order.payment.paid                    | E-mail de notificação de encomenda totalmente paga                                    |
| order.payment.pending.{paymentMethod} | E-mail de notificação de pagamento pendente de uma encomenda a pagar com paymentMethod|

## Configurações dos Modelos

![image](https://github.com/user-attachments/assets/93f7239b-58e9-4f73-ae06-7ea3fcd6cb7c)

Cada modelo contém os campos:

- **Subject**: O assunto do e-mail.
- **HTML body**: Usando tags HTML, este é o conteúdo do e-mail.

Dois botões:

- **Update**: Para alterar o modelo e guardar.
- **reset to default**: Para reverter para o modelo padrão.

Pode conter as seguintes tags:

- Todos: `{{websiteLink}}`, `{{brandName}}`, `{{iban}}` e `{{bic}}`
- Tipos de encomenda: `{{orderNumber}}`, `{{orderLink}}`, `{{invoiceLink}}`, `{{amount}}`, `{{currency}}`, `{{paymentStatus}}`, `{{paymentLink}}`, `{{qrcodeLink}}`
