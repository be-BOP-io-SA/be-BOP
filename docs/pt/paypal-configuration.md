# Configuração PayPal

Esta secção permite configurar as definições de pagamento PayPal para o seu be-BOP. É acessível via **Admin** > **Payment Settings** > **Paypal**.

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Campos de Configuração

### **1. Client ID**

- **Descrição:** Identificador único associado à sua conta PayPal.
- **Como obter:**
  - Inicie sessão na sua conta PayPal.
  - Vá à secção de aplicações e API.
  - Copie o `Client ID` correspondente.

### **2. Secret**

- **Descrição:** Chave secreta usada para autenticação com o PayPal.
- **Como obter:**
  - Na mesma área onde se encontra o `Client ID`, copie o campo `Secret`.

### **3. Sandbox Mode**

- **Descrição:** Marque esta caixa se as credenciais fornecidas são para o ambiente de teste do PayPal (sandbox).
- **Valores possíveis:**
  - [x] Ativado (Teste em ambiente sandbox)
  - [ ] Desativado (Ambiente de produção)

### **4. Currency**

- **Descrição:** Defina a moeda padrão usada para pagamentos PayPal.
- **Exemplo:** `EUR` (Euros)
- **Opções disponíveis:**

  | Símbolo | Descrição                            |
  | ------- | ------------------------------------ |
  | `BTC`   | Bitcoin                              |
  | `CHF`   | Franco Suíço                         |
  | `EUR`   | Euro                                 |
  | `USD`   | Dólar Americano                      |
  | `ZAR`   | Rand Sul-Africano                    |
  | `SAT`   | Satoshi (menor unidade de Bitcoin)   |
  | `XOF`   | Franco CFA da África Ocidental       |
  | `XAF`   | Franco CFA da África Central         |
  | `CDF`   | Franco Congolês                      |

## Ações

### **Guardar**

- Guarda as configurações atuais na aplicação.

### **Repor**

- Repõe todos os campos do formulário para os seus valores padrão.

## Pagamento com PayPal

Após configurar o PayPal, pode receber pagamentos PayPal no seu be-BOP.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
