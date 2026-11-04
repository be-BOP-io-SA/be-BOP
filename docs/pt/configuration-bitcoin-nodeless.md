# Configuração Bitcoin Nodeless

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Esta página permite configurar o módulo "Bitcoin nodeless" para gerar endereços e rastrear pagamentos Bitcoin mantendo o controlo total dos fundos na sua própria carteira.
É acessível via **Admin** > **Payment Settings** > **Bitcoin nodeless**.

---

## **Configuração**

### **1. BIP Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Descrição**: Padrão BIP utilizado para gerar endereços Bitcoin.
- **Opções disponíveis**:
  - `BIP 84` (atualmente, esta é a única opção suportada).
- **Instruções**:
  - Se estiver a utilizar uma carteira compatível, escolha `BIP 84`.

---

### **2. Public Key (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Descrição**: Uma chave pública no formato `zpub` para transações Bitcoin.
- **Instruções**:
  - Utilize uma carteira como **Sparrow Wallet** para gerar uma chave `zpub` ou `vpub` (para testnet).
  - Certifique-se de que o caminho de derivação é:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Introduza a chave no campo.

---

### **3. Derivation Index**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Descrição**: O índice do endereço a gerar.
- **Instruções**:
  - Por defeito, começa em `0` e incrementa `1` para cada novo endereço gerado.
  - **Não modifique este valor** a menos que saiba o que está a fazer — isto pode levar à reutilização de endereços ou criar endereços que não serão detetados pela sua carteira.

---

### **4. Mempool URL**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Descrição**: URL da API Mempool para verificar fundos recebidos nos endereços gerados.
- **Exemplo padrão**:
  - Testnet: `https://mempool.space/testnet`
- **Instruções**:
  - Se hospedar a sua própria instância Mempool, pode substituir este URL.
  - Para testnet, adicione o sufixo `/testnet`.

---

## **Próximos Endereços Gerados**

Os próximos endereços gerados a partir desta configuração são exibidos na secção **"Next addresses"**. Estes endereços são baseados na chave pública e no índice de derivação.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
