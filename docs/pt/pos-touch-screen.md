# Documentação da Interface de Ecrã Tátil POS

Esta documentação descreve as funcionalidades da interface tátil (POS Touch Screen) para selecionar e gerir artigos no carrinho.

---

## Visão Geral

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

A interface está dividida em várias secções para facilitar a gestão de vendas:

1. **Carrinho**: Exibe os artigos selecionados pelo cliente.
2. **Favoritos e Tags de Artigos**: Permite a recuperação rápida de artigos.
3. **Todos os Artigos**: Exibe todos os artigos disponíveis.
4. **Ações**: Botões para gerir o carrinho e finalizar a venda.

---

## Configuração

Em admin/tag, pos-favorite é uma tag a criar para exibir artigos como favoritos por defeito na interface /pos/touch.

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

Em admin/config/pos, pode adicionar tags para servir como menus em /pos/touch.

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Descrição das Secções

### 1. Carrinho

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Exibição**: Localizado no lado esquerdo da interface, esta secção mostra os artigos atualmente no carrinho.
- **Estado inicial**: Exibe "Cart is empty" quando nenhum artigo foi adicionado.
- **Funcionalidade**: Permite visualizar artigos adicionados com a sua quantidade e preço total.
- **Adicionar ao Carrinho**: Para adicionar ao carrinho num ecrã de ponto de venda, basta clicar no artigo.

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  E o artigo será adicionado ao carrinho e exibido no bloco do talão.

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  Quando um artigo é adicionado ao carrinho, pode adicionar uma nota clicando no nome do artigo.

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)

  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Favoritos e Tags de Artigos

- **Favoritos**: A secção `Favorites` no topo da interface apresenta uma lista de artigos marcados como favoritos para acesso rápido.

  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Gerir Favoritos**: Pode marcar artigos como favoritos durante a sua criação para acesso posterior mais fácil.

- **Tags de Artigos**: A secção abaixo de "Favorites" apresenta uma lista de artigos organizados por diferentes tags.

  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. Todos os Artigos

- **Exibição de Artigos**: Apresenta uma lista de todos os artigos disponíveis no sistema, organizados com imagens e nomes de artigos.

  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Ações

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

Esta secção agrupa os botões para gerir o carrinho, guardar ou finalizar uma venda:

- **Tickets**: Aceder aos talões de venda atuais.
- **Pay**: Redireciona para a página /checkout para finalizar a venda dos artigos no carrinho e registar a transação.

  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)

- **Save**: Guarda o estado atual do carrinho ou modificações de configuração.
- **Pool**: Pode ser usado para dividir a encomenda, gerir grupos de artigos ou associar clientes a uma encomenda específica.
- **Open Drawer**: Abre a gaveta de dinheiro para aceder aos fundos (requer um sistema físico conectado).
- **🗑️**: Permite limpar o conteúdo do carrinho.

  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)

- **❎**: Permite remover a última linha do carrinho.

  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Tema

Por defeito, o POS Touch Screen usa o design mostrado nas capturas de ecrã anteriores, mas é possível alterar este design modificando o tema em **Admin** > **Merch** > **Themes**.

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
