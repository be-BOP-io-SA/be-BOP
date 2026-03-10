# Gestão de custos de envio

## Introdução
O be-BOP oferece atualmente apenas um método de envio genérico.
No entanto, existem várias formas de gerir os custos de envio.
Os custos de envio podem ser configurados:
- globalmente em /admin/config/delivery
- detalhadamente em /admin/product/{id}

## Modo de gestão
Os dois principais são:
- Taxa fixa: cada pedido é cobrado um determinado valor (definido em /admin/config/delivery), numa moeda definida.
  - "Apply flat fee for each item instead of once for the whole order": neste modo, a taxa fixa é aplicada a cada linha de item em vez de ao carrinho.
- "Fees depending on product": cada produto tem os seus próprios custos de envio específicos, que são adicionados ao carrinho de acordo com o número de itens encomendados.
  - neste modo, apenas a taxa de entrega do item mais caro é aplicada, em vez da soma total.

Em todos os casos, estes cálculos dizem respeito apenas a produtos para os quais a opção "The product has a physical component that will be shipped to the customer's address" foi ativada em /admin/product/{id}.
Os custos de envio e as contribuições forfetárias para os custos de envio não são tidos em conta no cálculo dos tipos de produtos.

### Linha de item?
[Screenshot requis]
Um carrinho de compras de um cliente geralmente contém várias linhas, cada uma correspondendo a um produto A na quantidade n.
Assim, se eu tiver o seguinte carrinho:
- Item A qtd 2
- Item B qtd 3
- Item C qtd 4
- Item D qtd 8
O meu carrinho contém 4 linhas de item.

No caso de uma configuração de taxa fixa de 10€, o preço do envio será 10€.
Para uma configuração de "Taxa fixa" de 10€ com a opção "Apply flat fee for each item instead of once for the whole order", o custo de envio será 4 linhas de item * 10€, ou seja, 40€.

### Item autónomo
Por vezes, um item volumoso ou frágil justifica sozinho um envio separado, seguro, embalagem especial, proteção de envio, etc.
Quando adiciona o mesmo item A ao carrinho 2 vezes, o carrinho exibe uma única linha com "Item A qtd 2".
Se ativar a opção "This is a standalone product" em /admin/product/{id}, cada vez que adicionar um produto, adicioná-lo-á numa linha individual.
Assim, se eu tiver um item B (por exemplo, uma televisão) e o adicionar 3 vezes, o meu carrinho torna-se:
- Item A qtd 2
- Item B
- Item B
- Item B
O meu carrinho agora contém 4 linhas de item: 1 item autónomo corresponde a 1 linha de carrinho.

## Zona de envio
Por padrão, as zonas de envio e os seus custos não estão definidos.
Para definir um custo de envio global, selecione "Other countries", adicione-o e defina um valor.
Se definirmos um preço de envio para o país A, outro para o país B e um final para "Other Countries", o preço definido para "Other Countries" será usado por padrão para todos os países que não sejam o país A nem o país B.

## Preços de envio específicos por produto e restrições de envio por produto
(A definir)
