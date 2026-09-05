# Acesso ao back-office

Pessoas com uma conta de funcionário be-BOP e o super-administrador podem iniciar sessão no back-office via /admin

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Primeiro login e acesso seguro

Como a URL /admin é demasiado óbvia, o proprietário do be-BOP pode configurar uma string especial para proteger o acesso ao back-office.

Para isso, quando criar o be-BOP, acesse /admin/config e vá até esta área:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Uma vez feito isto, o acesso será possível pela URL /admin-chaineconfiguree/login

O acesso à URL de admin incorreta redirecionará para esta página:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Um funcionário com acesso de leitura/escrita a /admin/arm pode enviar-lhe um link de redefinição de senha, que contém a URL incluindo /admins-secret

Quando um utilizador está logado, a URL /admin redireciona automaticamente para o link correto.

## Login de funcionário

O formulário de login do funcionário está localizado em /admin-secret/login

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

Pode estender o tempo limite da sessão inicial na conexão:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

Terá então acesso à área de administração, dependendo dos direitos atribuídos ao seu papel:
- se tiver direitos de leitura/escrita, o link do submenu é normal
- se tiver direitos apenas de leitura, o link do submenu aparece em itálico (qualquer ação na página será recusada)
- se não tiver direitos de leitura, o link do submenu será ocultado, e uma tentativa de acessá-lo por URL direta o enviará de volta à página inicial do admin.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Segurança da senha

Durante o login do funcionário, a sua senha é verificada.
Os primeiros e últimos caracteres encriptados da sua string de senha são enviados ao [Have I Been Pawned](https://haveibeenpwned.com/), que retorna uma série de strings completas.
O be-BOP verifica então localmente se a sua senha está presente nesta lista (para que não seja comunicada diretamente ao Have I Been Pawned).
Se a senha estiver presente, será bloqueado com esta mensagem de segurança, convidando-o a alterar a sua senha:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Sair do back-office

Pode terminar sessão clicando no ícone vermelho ao lado do rótulo "Admin" no cabeçalho.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

Será então redirecionado de volta para a página de login.

## Recuperação de senha

Se perder a sua senha, pode ir a /admin-secret/login e clicar em "Recovery":

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

Será então solicitado a inserir o seu login.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Se inserir o identificador errado, será notificado e poderá tentar novamente com um diferente. Se não conseguir encontrar o seu identificador, terá de pedir ao administrador do be-BOP que lhe forneça as informações novamente.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

Em caso de abuso por parte de um funcionário, a proteção será acionada:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Se o login existir, esta mensagem é enviada para o endereço de contacto associado à conta (email, npub, ou ambos):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Usar um link expirado ou já utilizado levá-lo-á de volta a uma página de erro:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Este link contém um token de uso único que o encaminha para a página de redefinição de senha.

Se a senha que inserir for muito curta, este bloqueio será exibido:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Se a senha for detetada no Have I Been Pwned, este bloqueio será exibido:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Se a senha for válida, é redirecionado para a página de login e pode agora iniciar sessão com ela.
