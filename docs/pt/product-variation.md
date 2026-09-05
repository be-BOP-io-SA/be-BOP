# Documentação de Variações de Produto

![image](https://github.com/user-attachments/assets/5d44dd81-a1d8-474e-b627-d5f3e01e955f)

Acessível ao criar ou editar um produto, as variações permitem fazer uma seleção (de cor, tamanho, etc.) de um artigo antes de adicioná-lo ao carrinho.

## Criar ou Adicionar um Produto com Variações

Ao adicionar ou editar um produto, pode adicionar variações. Para isso:

- Marque **This is a standalone product** para que o produto com variações não seja adicionado ao carrinho com uma quantidade superior a 1.
- Marque **Product has light variations (no stock difference)** para poder adicionar diferentes variações.

  ![image](https://github.com/user-attachments/assets/80bfe14e-cec9-4b29-b8e2-eb3067a29b26)

Para adicionar uma variação, preencha:

- **Name**: O título da variação (exemplo: Tamanho)
- **Value**: Um valor para o nome (exemplo: XL)
- **Price difference**: O valor numérico (na mesma moeda que o preço do produto) a adicionar quando um utilizador escolhe esta variação.
  (exemplo: uma t-shirt XL custará mais 2 euros do que o preço base de uma t-shirt)

Clique em **add variation** para adicionar uma nova variação. O ícone '🗑️' permite eliminar uma variação já guardada na base de dados.

## Exibição na Página do Produto

![image](https://github.com/user-attachments/assets/ed13cc76-330b-4c3c-b162-52f6438ccca3)

Quando exibe um produto com variações, pode escolher as variações antes de adicionar ao carrinho. O nome e a lista de variações estarão acessíveis na página do produto.

## Exibição no Carrinho

![image](https://github.com/user-attachments/assets/747aed2c-854f-4bf4-a156-9a1b18f3616e)

![image](https://github.com/user-attachments/assets/394264ed-91c0-478c-9aa1-b9064c7c1b6b)

Quando um produto com variações é adicionado ao carrinho, o nome torna-se o nome do produto concatenado com o valor da variação.

Exemplo: T-shirt - XL - Vermelho (onde XL é um valor de variação de Tamanho e Vermelho um valor de variação de Cor)
