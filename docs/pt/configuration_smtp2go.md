# Introdução

Esta documentação visa ajudar os proprietários de be-BOP a configurar o envio automático de e-mails da forma mais simples e económica encontrada até à data.

Fornecedores de e-mail testados até agora que funcionam:
- Outlook.fr
- (mais a vir)

Os que não funcionam (restrição DMARC):
- GMail
- Protonmail
- (mais a vir)

Sinta-se à vontade para testar e informar-nos se o seu fornecedor de e-mail funciona ou não em contact@be-bop.io

# Prefácio

Era uma vez uma época maravilhosa em que os proprietários de websites interativos ou lojas online podiam enviar e-mails automáticos livremente e de forma gratuita.
Era a época em que os fornecedores de e-mail gratuitos permitiam facilmente o uso de uma caixa de e-mail por uma aplicação de terceiros.
Era a época em que o SMTP transacional era permitido e gratuito.
Era a época em que as pessoas eram felizes.
Era a época.
Mas então, um dia, a nação Paywall decidiu atacar...

Hoje em dia, o SMTP transacional, quando não estritamente proibido, está sujeito a um token SMTP oferecido apenas num plano empresarial pago, ou depende de um terceiro especializado em envio de e-mails em massa, exigindo configurações extensas de zona DNS que excluem utilizadores regulares, que devem então recorrer a agências web caras para configurar um serviço inicialmente gratuito mas que rapidamente se torna pago.
Estas pessoas, que podem precisar apenas de notificar cerca de uma dúzia de encomendas online por mês, ficaram então desamparadas...
As suas únicas opções restantes eram:
- subscrever um serviço de e-mail pago
- subscrever certos fornecedores de domínio específicos que também oferecem e-mail
- usar terceiros complexos que requerem assistência técnica ou tempo significativo de aprendizagem
- abandonar as notificações por e-mail e ser rejeitado pelos primeiros clientes devido a esta lacuna

...e então a equipa be-BOP chegou com o smtp2go.

# Descrição

O smtp2go é uma plataforma de entrega de e-mail na nuvem que permite enviar e rastrear e-mails.
Embora usar um terceiro não seja ideal, é o melhor compromisso encontrado até à data para pessoas que não têm uma conta de e-mail que autorize SMTP transacional.
Ao associar o smtp2go a um endereço de e-mail existente, e uma simples verificação técnica da conta de e-mail, o smtp2go permite ao be-BOP enviar até 1.000 e-mails/mês no seu plano gratuito.

# Procedimento

- Crie (ou tenha disponível) um endereço de e-mail acessível que receberá os e-mails enviados pelo be-BOP a visitantes, clientes e funcionários.
- Vá a https://smtp2go.com
- Clique em "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Introduza o seu endereço de e-mail (o que será usado pelo be-BOP ou o seu próprio — podem ser diferentes)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Introduza a sua identidade e informações empresariais (a palavra-passe só é pedida uma vez, verifique a sua entrada)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- Ser-lhe-á pedido que valide o seu endereço de e-mail:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Aceda à sua caixa de entrada, abra a mensagem do SMTP2GO e clique no link de confirmação no corpo da mensagem
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- A sua conta será agora ativada
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Em seguida, verifique o remetente (botão verde "Add a verified sender") e escolha a opção correta "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Introduza o endereço de e-mail que será usado pelo be-BOP e submeta o formulário
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Se o seu fornecedor de e-mail não bloquear a opção, verá esta exibição:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
Também receberá esta mensagem por e-mail: terá de validá-la clicando no botão "Verify email@domain.com"
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
No entanto, se vir a seguinte mensagem, significa que o seu fornecedor de e-mail recusa a associação (provavelmente porque oferece SMTP transacional como serviço pago ou sob outras condições):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Uma vez validado o e-mail de verificação, o seu remetente deverá ser exibido assim:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- No menu esquerdo, vá a "SMTP Users" e clique em "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Clique em "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- O SMTP2GO preenche previamente o formulário com um utilizador SMTP cujo Username padrão é o domínio do seu endereço de e-mail de envio. Pode deixá-lo como está, ou personalizá-lo por razões de segurança (e como o identificador deve ser único no SMTP2GO, um identificador demasiado simples já estará tomado e será rejeitado). Depois valide clicando no botão "Add SMTP User".
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- Pode então configurar o be-BOP com as seguintes informações e reiniciá-lo:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=o_username_escolhido_no_smtp2go
SMTP_PASSWORD=a_password_escolhida_no_smtp2go
```

# Verifique a Sua Configuração

Para evitar problemas de envio de e-mail, certifique-se de que o endereço de e-mail de envio é o mesmo que o configurado no back-office do be-BOP, em Admin > Config > Identity, em "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Aviso Legal

- Para além de 1.000 e-mails enviados por mês, o envio de e-mails deixará de funcionar, e o SMTP2GO enviar-lhe-á uma solicitação para atualizar para um plano pago
- O software be-BOP não está de forma alguma associado ou afiliado ao serviço SMTP2GO
- be-bop.io não está de forma alguma associado ou afiliado ao smtp2go.com
- be-BOP.io SA não está de forma alguma associado ou afiliado ao SMTP2GO
- A equipa be-BOP não fornece suporte SMTP2GO
- A equipa be-BOP apenas fornece esta documentação para ajudar os seus utilizadores e evitar que recorram a serviços pagos ou complexos

Morte aos paywalls ✊
