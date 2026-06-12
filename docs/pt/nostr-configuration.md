# **Documentação da Interface NostR**

Acessível via **Admin** > **Node Management** > **Nostr**, esta secção permite configurar as suas mensagens Nostr para enviar notificações aos seus clientes e partilhar o seu catálogo para que os clientes possam encomendar via o bot Nostr.

## Configuração

Para configurar as suas mensagens Nostr, clique em **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Copie a chave e adicione-a ao seu **.env** da seguinte forma:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Após guardar, poderá agora enviar notificações com Nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Chaves**

- **Chave Privada:** Uma chave privada única exibida no topo da secção. Esta chave deve ser protegida e nunca partilhada.

  - Exemplo: `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Chave Pública (NPUB):** Uma chave pública usada para identificar a sua conta NostR.
  - Exemplo: `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Botão Certificar**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Descrição:**
  - Um botão para certificar ou validar as suas chaves.

## **3. Secção Enviar Mensagem**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Introduza a chave pública (NPUB) do destinatário a quem a mensagem deve ser enviada.
  - Formato esperado: `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Campo de texto para escrever a mensagem a enviar.

- **Botão Enviar:**
  - Pressione este botão para transmitir a mensagem ao destinatário.

## **4. Secção Obter Metadados**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Introduza uma chave pública (NPUB) para obter os metadados associados.

- **Botão Get Metadata:**
  - Pressione este botão para obter e exibir informações relacionadas com a chave pública especificada.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Lista de relays ativos aos quais a sua aplicação está conectada.

  - Exemplo:
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Cada relay tem um ícone 🗑️ para o remover da lista.

### **Adicionar um Relay**

1. **Campo Relay:**
   - Introduza o URL do novo relay em formato WebSocket: `wss://new.relay.url`.
2. **Botão "Update relay list":**
   - Pressione este botão para adicionar o relay especificado à lista existente.

## **6. Mensagem de Introdução**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Descrição:**
  - Uma mensagem de introdução automática enviada pelo bot Nostr quando o comando não corresponde.
- **Opção "Disable Nostr-bot intro message":**
  - Marque esta caixa para desativar o envio automático de mensagens de introdução.

## **7. Mensagens Recebidas**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Descrição:** Lista de mensagens recebidas de relays conectados.
  - Exibe as seguintes informações:
    - 📅 **Data e Hora**
    - 🆔 **Chave pública (NPUB)** do remetente
    - ✉️ **Conteúdo da mensagem**
  - Exemplo:
    - **26/11/2024, 10:59:23**
      - Chave pública: `npub1ncecgaxk4l70594uq...`
      - Mensagem: `!Catalog`
    - **04/11/2024, 13:22:21**
      - Chave pública: `npub1qh8fj9wqc7lw5z37g...`
      - Mensagem: `Hello`

## Nostr-bot

Tem agora a capacidade de interagir com o bot Nostr enviando comandos para o seu endereço Nostr.
Para obter a lista de comandos, digite `!help`.

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
