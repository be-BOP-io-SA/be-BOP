# Configuração SumUp para a Aplicação be-BOP

Para integrar o SumUp como método de pagamento na sua aplicação **be-BOP**, vá a **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Configurações

### 1. API Key

- **Descrição**: Chave API fornecida pelo SumUp para autenticar transações.
- **Localização**: Introduza-a no campo **API Key** nas configurações.
- **Exemplo**: `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Descrição**: Código de identificação único do comerciante fornecido pelo SumUp.
- **Localização**: Introduza-o no campo **Merchant Code**.
- **Exemplo**: `YOUR_MERCHANT_CODE`

### 3. Currency

- **Descrição**: Moeda usada para transações SumUp na sua aplicação **be-BOP**.
- **Localização**: Introduza-a no campo **Currency**.
- **Valores possíveis**:

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

- **Exemplo**: `EUR`

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Pagamento com Cartão

Após a configuração, pode agora receber pagamentos com cartão.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
