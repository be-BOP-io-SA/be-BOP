# Documentação do Countdown

Disponível via **Admin** > **Widgets** > **Countdowns**, esta interface permite configurar um countdown que pode ser usado para destacar um prazo importante, como uma oferta promocional ou um evento especial.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Adicionar um Countdown

Para adicionar um countdown, clique em **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Descrição**: Identificador interno único para o countdown.

### 2. **Slug**

- **Descrição**: URL ou chave de identificação única para o countdown.
- **Restrições**:
  - Só pode conter letras minúsculas, números e hífens.
  - Útil para gerar links específicos.

### 3. **Title**

- **Descrição**: Título visível associado ao countdown.
- **Utilização**: Este texto pode ser exibido no site para contextualizar o countdown.

### 4. **Description**

- **Descrição**: Texto opcional descrevendo os detalhes do countdown.
- **Utilização**: Ideal para adicionar contexto ou instruções sobre o evento.

### 5. **End At**

- **Descrição**: Data e hora de fim do countdown.
- **Detalhes**:
  - O fuso horário é baseado no navegador do utilizador (exibido em **GMT+0**).
  - Use o calendário integrado para selecionar intuitivamente a data e hora.

## Integração CMS

Para integrar o seu countdown numa zona ou página CMS, adicione-o da seguinte forma: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

E o seu countdown será exibido aos seus utilizadores da seguinte forma.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
