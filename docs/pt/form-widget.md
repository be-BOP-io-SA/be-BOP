# Documentação do Widget de Formulário de Contacto

Acessível via **Admin** > **Widgets** > **Form**, os widgets de formulário podem ser usados no seu be-BOP para integrar formulários de contacto em zonas ou páginas CMS.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Adicionar um Formulário de Contacto

Para adicionar um formulário de contacto, clique em **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Informações Básicas

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: O nome do formulário de contacto.
- **Slug**: Identificador único para o formulário de contacto.

### Informações do Formulário de Contacto

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Permite ao proprietário da loja definir um endereço de e-mail ou npub de destino para notificações de contacto; se não preenchido, o valor padrão será o e-mail de contacto da identidade.
- **Display from: field**: Quando marcado, exibe o campo de remetente (From:) no formulário de contacto. É acompanhado por uma caixa de seleção **Prefill with session information** que, quando marcada, preenche previamente o campo de remetente com informações de sessão.
- **Add a warning to the form with mandatory agreement**: Adiciona uma caixa de seleção obrigatória para exibir uma mensagem de acordo antes de enviar o formulário de contacto.
  - **Disclaimer label**: Um título para a mensagem de acordo.
  - **Disclaimer Content**: O texto da mensagem de acordo.
  - **Disclaimer checkbox label**: O texto para a caixa de seleção da mensagem de acordo.
- **Subject**: O assunto do formulário de contacto.
- **Content**: O conteúdo do formulário de contacto.

Para assuntos e conteúdos, pode usar as seguintes tags no texto:

`{{productLink}}` e `{{productName}}` quando usado numa página de produto.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` e `{{pageName}}` quando usado noutro local.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## Integração CMS

Para integrar o seu formulário de contacto numa zona ou página CMS, adicione-o da seguinte forma: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

E o seu formulário de contacto será exibido aos seus utilizadores da seguinte forma.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
