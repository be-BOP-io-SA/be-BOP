# Documentação da Interface de Relatórios

Esta página permite visualizar e exportar detalhes sobre pedidos, produtos e pagamentos. É acessível via **Admin** > **Config** > **Reporting**.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

Exibe os relatórios para o mês e ano atuais.

---

## Funcionalidades

### 1. Filtros de Relatórios

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Opções de Filtro**: Permite filtrar pedidos pelo seu estado:
  - `Include pending orders`: Incluir pedidos pendentes.
  - `Include expired orders`: Incluir pedidos expirados.
  - `Include canceled orders`: Incluir pedidos cancelados.
  - `Include partially paid orders`: Incluir pedidos parcialmente pagos.
- **Utilização**: Marque as caixas correspondentes para incluir estes tipos de pedidos no relatório.
  Por padrão, apenas os pedidos pagos são listados.

### 2. Detalhe do Pedido

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Exportar CSV**: Permite exportar os detalhes dos pedidos em formato CSV.
- **Tabela de Detalhes do Pedido**:
  - Exibe informações dos pedidos. Cada linha representa um pedido.
  - `Order ID`: Identificador único do pedido (clique para ver mais detalhes).
  - `Order URL`: Link direto para o pedido.
  - `Order Date`: Data do pedido.
  - `Order Status`: Estado do pedido (ex: pago, pendente).
  - `Currency`: Moeda da transação.
  - `Amount`: Valor total do pedido.
  - `Billing Country`: País de faturação (se disponível).
  - `Billing Info`: Informações da morada de faturação.
  - `Shipping Country`: País de envio (se disponível).
  - `Shipping Info`: Informações da morada de envio.
  - `Cart`: Itens no carrinho do pedido.

### 3. Detalhe do Produto

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Exportar CSV**: Permite exportar as informações dos produtos associados aos pedidos em formato CSV.
- **Tabela de Detalhes do Produto**:
  - Exibe informações sobre os produtos associados aos pedidos. Cada linha corresponde a um produto adicionado a um pedido específico.
  - `Product URL`: Link direto para o produto.
  - `Product Name`: Nome do produto.
  - `Quantity`: Quantidade encomendada.
  - `Deposit`: Valor do depósito para o produto (se aplicável).
  - `Order ID`: Referência do pedido associado.
  - `Order Date`: Data do pedido associado.
  - `Currency`: Moeda da transação.
  - `Amount`: Valor total para este produto.
  - `Vat Rate`: Taxa de IVA aplicada.

### 4. Detalhe do Pagamento

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Exportar CSV**: Permite exportar os detalhes dos pagamentos em formato CSV.
- **Tabela de Detalhes do Pagamento**:
  - Exibe informações de pagamento associadas aos pedidos. Cada linha corresponde a um pagamento feito para um pedido específico.
  - `Order ID`: Referência do pedido associado.
  - `Invoice ID`: Referência da fatura.
  - `Payment Date`: Data do pagamento.
  - `Order Status`: Estado do pedido.
  - `Payment mean`: Método de pagamento.
  - `Payment Status`: Estado do pagamento.
  - `Payment Info`: Informações do pagamento.
  - `Order Status`: Estado do pedido.
  - `Invoice`: Número da fatura.
  - `Currency`: Moeda da loja.
  - `Amount`: Valor do pagamento convertido com a moeda.
  - `Cashed Currency`: Moeda do pagamento.
  - `Cashed Amount`: Valor do pagamento convertido com a moeda do pagamento.
  - `Billing Country`: País de faturação.

### 5. Filtro de Relatório

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Usado para filtrar relatórios por mês e ano selecionados.

### 6. Síntese de Pedidos

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Exportar CSV**: Permite exportar a síntese dos pedidos em formato CSV.
- **Tabela de Síntese**:
  - Exibe um resumo das estatísticas de pedidos para um determinado período.
  - `Period`: Indica o mês e ano do período.
  - `Order Quantity`: Número total de pedidos efetuados durante este período.
  - `Order Total`: Valor acumulado de todos os pedidos para o período indicado.
  - `Average Cart`: Valor médio do pedido para este período.
  - `Currency`: Moeda na qual os pedidos foram efetuados (ex: BTC para Bitcoin).

### 7. Síntese de Produtos

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Exportar CSV**: Permite exportar a síntese dos produtos em formato CSV.
- **Tabela de Síntese**:
  - Exibe um resumo das estatísticas de produtos para um determinado período.
  - `Period`: Indica o mês e ano do período.
  - `Product ID`: ID do produto.
  - `Product Name`: Nome do produto.
  - `Order Quantity`: Quantidade encomendada.
  - `Currency`: Moeda na qual os pedidos foram efetuados (ex: BTC para Bitcoin).
  - `Total Price`: Total do pedido (ex: BTC para Bitcoin).

### 8. Síntese de Pagamentos

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Exportar CSV**: Permite exportar a síntese dos pagamentos em formato CSV.
- **Tabela de Síntese**:
  - Exibe um resumo das estatísticas de pagamentos para um determinado período.
  - `Period`: Indica o mês e ano do período.
  - `Payment Mean`: O método de pagamento utilizado.
  - `Payment Quantity`: A quantidade paga.
  - `Total Price`: O preço total pago.
  - `Currency`: Moeda na qual os pedidos foram efetuados (ex: BTC para Bitcoin).
  - `Currency`: Moeda na qual os pedidos foram efetuados (ex: BTC para Bitcoin).
  - `Average`: Valor médio pago.

---

## Exportação de Dados

Cada secção (Detalhe do Pedido, Detalhe do Produto, Detalhe do Pagamento) tem um botão `Export CSV` para descarregar os dados exibidos como ficheiro CSV.

Um exemplo:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
