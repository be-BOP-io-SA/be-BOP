# Configuração Stripe para a Aplicação be-BOP

Para integrar o Stripe como método de pagamento na sua aplicação **be-BOP**, vá a **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Configurações

### 1. Secret Key

- **Descrição**: A sua chave secreta Stripe.
- **Localização**: Introduza-a no campo **Secret Key** nas configurações.
- **Exemplo**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Descrição**: A sua chave pública Stripe.
- **Localização**: Introduza-a no campo **Public key**.
- **Exemplo**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Descrição**: Moeda usada para transações Stripe na sua aplicação **be-BOP**.
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

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Uma vez concluídos estes passos, o Stripe será adicionado como método de pagamento na sua plataforma.
