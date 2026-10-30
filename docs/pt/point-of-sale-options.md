# Opção de Ponto de Venda

## Introdução

O be-BOP permite interagir com a sua comunidade na Internet e também pode ser usado como software de caixa registadora (num stand ou loja).

POS: Point Of Sale (para comportamento de caixa em loja)

Ao usar o papel POS e atribuí-lo a um perfil [team-access-management.md](team-access-management.md), pode dar a um perfil de caixa opções adicionais para opções de compra específicas.
Usar a conta POS também permite ter um ecrã de cliente para mostrar:
- uma página inicial
- carrinho de compras exibido em tempo real
- o código QR de pagamento (Bitcoin, Lightning ou CB Sum Up) assim que o pedido for validado
- uma página de validação assim que o pagamento for confirmado

## Gestão da conta POS

O papel de ponto de venda é configurado por padrão no módulo /admin/arm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Login na conta POS

Uma vez atribuído a um perfil, a pessoa com acesso POS deve ir à página de login na administração (/admin/login, onde /admin é a string segura configurada pelo proprietário do be-BOP (ver [back-office-access.md](back-office-access.md))) e iniciar sessão.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(No caso de uma loja, é preferível escolher um tempo de manutenção de conexão de "1 day", para evitar desconexões no meio de uma sessão de vendas).

## Utilização da conta POS

Uma vez logado, o utilizador POS acede à URL /pos:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

A sessão /pos/session liga-se ao ecrã do lado do cliente (ver "Ecrã do cliente" mais adiante).
A exibição das últimas transações permite prestar serviço pós-venda em caso de pedido do cliente.
Se a conta POS tiver sido configurada desta forma no ARM, pode aceder manualmente às páginas /admin noutro separador.

## Adicionar ao carrinho

Os produtos acessíveis à conta POS são os configurados no seletor de canal do produto ( [Retail (POS logged seat)](Retail (POS logged seat) ) :

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

As opções ativadas na coluna "Retail (POS logged seat)" aplicar-se-ão exclusivamente à conta POS.

### Navegação no catálogo

O operador de caixa pode adicionar produtos:
- via páginas CMS que exibem widgets de produtos (ver [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md))
- acedendo à página /catalog que exibe todos os itens elegíveis pelo canal seletor

O percurso até ao carrinho de compras é então semelhante ao de qualquer outro utilizador na web.

### Adição rápida via Aliases

Um alias pode ser adicionado a cada produto ( [product-alias-management.md](product-alias-management.md) ).
Se os itens que vende têm código de barras (tipo ISBN / EAN13), este pode ser inserido como alias.

No carrinho de compras, a conta POS tem uma opção não disponível para o utilizador comum: ao ir diretamente à página do carrinho (/cart), a conta POS tem um campo para inserir um alias (manualmente, ou via leitor portátil USB).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Após validação com "enter":__

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

O campo "Alias" é limpo para permitir que o próximo item seja digitalizado mais rapidamente.

Em caso de erro na adição ao carrinho, o erro será notificado e o campo Alias será esvaziado:
- Número máximo de linhas do carrinho já atingido: "Cart has too many items".
- Alias inexistente: "Product not found".
- Stock esgotado: "Product is out of stock".
- Item de "Assinatura" adicionado 2 vezes: o item não é adicionado uma 2ª vez (itens de assinatura têm quantidade fixa de 1).
- Item com lançamento futuro mas pré-encomenda não autorizada: "Product is not available for pre-order".
- Item com adição ao carrinho desativada no canal seletor: "Product can't be added to basket".
- Item com limite de quantidade de pedido já atingido:
  - Se não for um item "Stand alone": "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (de momento temos um bug com este controlo, o item é adicionado e a mensagem é exibida após atualização do carrinho, e a validação do carrinho volta ao /cart com a mensagem de erro)
- Item não disponível para entrega no seu país de destino: o item é adicionado, mas a mensagem "Delivery is not available in your country for some items in your basket" é exibida no fundo do carrinho.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Note que ao adicionar um item PWYW via alias, o valor do produto será o valor mínimo configurado no produto.

## Especificidades do túnel (/checkout)

A conta POS oferece opções adicionais:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Envio

O formulário de morada é opcional, desde que um país (dependendo da loja) seja selecionado, todos os outros campos são opcionais (no caso de um cliente que compra, recolhe diretamente na loja e não necessita de fatura nominativa).
- Se o cliente necessitar de entrega, o formulário de morada pode ser preenchido.
- Se o cliente necessitar de fatura, a opção "My delivery address and billing address are different" pode ser usada para preencher a fatura.

### Oferecer envio gratuito
Por padrão, todos os pedidos com itens que tenham uma contrapartida física são considerados como entrega.
O administrador (ou qualquer pessoa com acesso de escrita a /admin/config) pode ativar esta opção em /admin/config/delivery (ver [delivery-management.md](delivery-management.md)).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Se a opção "Allow voiding delivery fees on POS sale" estiver ativada, esta opção estará disponível na página /checkout para a conta POS:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

Se a opção for ativada, uma justificação obrigatória deve ser preenchida, para acompanhamento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

O valor (custos de envio + IVA associado) será deduzido na página seguinte (os preços da página /checkout ainda não são atualizados em tempo real de acordo com as opções POS aplicadas).

### Pagamento múltiplo ou pagamento em loja

A conta POS permite usar:
- pagamentos clássicos oferecidos no site que foram ativados e são elegíveis ( [payment-management.md](payment-management.md ) para todos os produtos no carrinho
- pagamento de Ponto de Venda, que inclui todos os pagamentos fora do sistema be-BOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

Se "Use multiple payment methods" for ativado, a escolha do método de pagamento já não é necessária (ver "Detalhes do pedido (/order)" abaixo).

Ao usar pagamento convencional (CB Sum Up, Lightning ou Bitcoin on-chain), o código QR de pagamento será exibido no dispositivo do cliente (ver "Ecrã do lado do cliente" abaixo).
Se for usada transferência bancária, o pedido será suspenso e validado assim que a transferência for recebida manualmente (não recomendado para pagamentos em loja).

Se usar o método de pagamento "Point of sale" (pagamento único), deve inserir o método de pagamento manualmente (ver "Detalhes do pedido (/order)" abaixo).

### Isenção de IVA

Uma conta POS pode escolher faturar um cliente sem IVA (por exemplo, em França, um cliente empresarial).
⚖️ A sua legislação local deve autorizar o uso desta opção, pela qual é responsável.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

Se a opção for ativada, uma justificação obrigatória deve ser preenchida, para acompanhamento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

O valor (IVA global) será deduzido na página seguinte (os preços na página /checkout ainda não são atualizados em tempo real de acordo com as opções POS aplicadas).

### Aplicar um desconto oferta

Uma conta POS pode escolher aplicar um desconto a um cliente:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

Se a opção for ativada, uma justificação obrigatória deve ser preenchida, para acompanhamento gerencial:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

Deve também escolher o tipo de redução:
- em % (uma mensagem de erro será exibida em caso de entrada inválida, ou redução de 100%)
- em valor correspondente à moeda principal do be-BOP (ver [currency-management.md](currency-management.md)) (uma mensagem de erro será exibida em caso de entrada inválida, ou redução correspondente ao total do pedido)

⚖️ A sua legislação local deve autorizar o uso desta opção e os seus valores máximos, pelos quais é responsável (ex: lei do preço único em França).

⚠️ Enquanto se aguarda que os valores sejam atualizados em tempo real na página /checkout, tenha cuidado ao acumular redução + isenção de IVA + retirada de custos de envio.
Embora não seja desaconselhável, a combinação de funções requer um mínimo de atenção.

### Contacto do cliente opcional

Normalmente, no modo eshop, é necessário deixar um endereço de email ou um Nostr npub para receber notificações do pedido e manter o URL de acesso.
No modo POS, estes campos são opcionais se um cliente recusar deixar os seus dados de contacto:
- Neste caso, no entanto, informe os clientes que terão de recorrer ao sistema de suporte da loja para encontrar o URL do resumo do pedido, faturas e ficheiros descarregáveis.
- Forneça uma impressora para imprimir a fatura após a compra.
- Se o carrinho incluir uma assinatura, explique que não é uma renovação automática, mas sim que a cada vez é feita uma chamada de pagamento nos dados de contacto deixados (ver [subscription-management.md](subscription-management.md)); e portanto, sem dados de contacto, a assinatura nunca poderá ser renovada, pelo que é melhor removê-la do carrinho.

### Outras caixas de verificação do cliente

Ao validar um pedido POS, as caixas de verificação obrigatórias do percurso do cliente permanecem para validar:
- aceitação dos termos e condições gerais de venda e utilização
- (se a opção tiver sido ativada - ver [privacy-management.md](privacy-management.md)) aceitação do armazenamento de IP para carrinhos sem morada de entrega
- (se o pedido incluir um item pago em conta - ver [payment-on-deposit.md](payment-on-deposit.md)) compromisso de pagar o restante do pedido a tempo
- (se o pedido incluir uma entrega estrangeira a 0% isenta de direitos e declaração aduaneira obrigatória posteriormente - ver [VAT-configuration.md](VAT-configuration.md)) compromisso de cumprir as declarações aduaneiras

Os links nestas opções levam às páginas CMS descritas aqui: [required-CMS-pages.md](required-CMS-pages.md).
Uma vez que os compradores em loja obviamente não terão tempo de consultar estes documentos na sua totalidade, as alternativas são:
- ter uma versão impressa de cada uma destas páginas disponível na loja:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- encaminhar o cliente para o site para consulta exaustiva após o facto
- fazer ao cliente a seguinte pergunta ao validar cada opção obrigatória:
  - Aceita as condições gerais de venda?
  - Concorda com o registo do seu endereço IP nas nossas bases de dados para fins contabilísticos?
  - "Como está a pagar em conta, concorda em pagar o restante do pedido a tempo quando a nossa equipa o contactar novamente?"
  - "Como vai receber o pedido no estrangeiro, não paga IVA hoje. Está ciente de que terá de pagar IVA na entrega?"

### Optin

Se a opção "Display newsletter + commercial prospection option (disabled by default)" tiver sido ativada em /admin/config (ver [KYC.md](KYC.md)), este formulário será exibido em /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Estas opções só precisam ser ativadas 1/ se o cliente fornecer o seu endereço de email ou Nostr npub 2/ se fizer a pergunta e obtiver o seu acordo formal, especificando as implicações de cada opção.
Ativar estas opções sem obter o consentimento explícito do cliente é da sua responsabilidade, e na maioria das vezes ilegal (além de ser uma completa falta de respeito pela recolha de dados pessoais do cliente para uso comercial sem o seu consentimento).

## Especificações do pedido (/order)

### Pagamento de Ponto de Venda

Enquanto se aguarda a criação de subtipos de pagamento de Ponto de Venda, o pagamento de Ponto de Venda inclui todos os pagamentos fora do be-BOP:
- uso de um terminal POS físico (ainda não reconciliamos automaticamente com os terminais POS Sum UP, mesmo que a conta do site e a conta do terminal POS sejam partilhadas)
- dinheiro
- cheque (para países que ainda o usam)
- twint (de momento, a integração será possível um dia)
- barras de ouro
- etc

A conta POS tem portanto uma validação manual (ou cancelamento) do pedido, com um recibo obrigatório:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

Os detalhes são armazenados no objeto do pedido e devem facilitar a reconciliação contabilística.

Por exemplo, pode indicar:
- "Dinheiro: dado 350€, devolvido 43,53€".
- "Cheque nº XXXXX, recibo armazenado na pasta B2".
- "Twint: transação XXX"
- "Sum Up: transação XXX"

Para recuperar o número de transação Sum Up para um pagamento por terminal POS físico, pode encontrá-lo aqui na aplicação ligada ao TPE consultando a transação:
![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Assim que o pagamento for recebido, pode preencher e validar o campo e aceder à fatura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 Se desejar exportar a fatura como ficheiro PDF, pode selecionar "Guardar como PDF" como destino de impressão (o be-BOP não suporta nativamente a geração de documentos PDF de momento).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 Se estiver a imprimir a fatura e não quiser rótulos relacionados com o navegador na impressão, pode desativar a opção "Headers and footers" nas opções de configurações de Impressão

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Pagamento múltiplo

Se escolheu esta opção no /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Pode usar a função "Send a payment request" para dividir o pedido em vários pagamentos.

Imaginemos que neste pedido, 30€ são pagos por cartão de crédito com um Terminal POS, 20€ por Lightning e 6,42€ em dinheiro:

1/ Receba os 30€ por cartão de crédito via o seu terminal POS e depois valide o pagamento

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Depois os 20€ em Lightning:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

E finalmente, assim que a transação for validada, o restante em dinheiro:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Assim que o valor total for atingido, o pedido será marcado como "validado".

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Ecrã do lado do cliente

Enquanto está atrás do seu PC de caixa, pode fornecer um ecrã do lado do cliente para que ele possa acompanhar o seu pedido.
Pode escolher entre:
- um ecrã adicional conectado via HDMI: neste caso, abra um separador na URL /pos/session a partir da conta de caixa, depois exiba o ecrã em modo de página inteira (geralmente F11) para remover o cabeçalho do navegador
- outro dispositivo com navegador web, como um tablet ou telefone; neste caso, precisa de:
  - ir a /admin/login (com URL de admin segura)
  - iniciar sessão com a mesma conta POS
  - exibir a página /pos/session
  - desativar o modo de suspensão do dispositivo
  - ver (dependendo do dispositivo) como mudar a página web para ecrã inteiro

Quando um carrinho está vazio e nenhum pedido está pendente, um ecrã de espera e boas-vindas será exibido:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Assim que um item é adicionado ao carrinho a partir da caixa, o ecrã atualiza-se e mostra o carrinho de compras à pessoa que está a fazer a compra:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Ao fazer um pagamento Lightning

O código QR é exibido para digitalização e pagamento.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Ao fazer um pagamento Bitcoin on-chain

(Não recomendamos o uso de pagamento on-chain em loja, a menos que tenha um número baixo de verificações, ou se tiver tempo para ocupar o seu cliente durante 15 minutos com um café enquanto as validações decorrem).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Ao fazer um pagamento por cartão de crédito Sum Up fora de um terminal POS

Se o seu terminal POS físico estiver avariado, o seu cliente pode digitalizar um código QR com o seu telefone para obter um formulário de CB no seu próprio dispositivo (o que é mais conveniente do que tê-lo a digitar as informações do CB no seu PC de caixa...).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Quando um pagamento Lightning / Bitcoin on-chain / CB Sum Up por código QR é validado

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

O ecrã volta então ao ecrã de boas-vindas/espera, com a mensagem de boas-vindas e o logótipo do be-BOP.

### Quando um pagamento de Ponto de Venda é feito

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Assim que o pedido for validado manualmente na caixa:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

E finalmente, o ecrã inicial/de espera:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### No caso de pagamentos múltiplos na caixa:

Enquanto nenhuma entrada foi feita:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Se fizer um pagamento inicial (Ponto de venda, para dinheiro):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

Em vez da página de confirmação, volta à página com o saldo restante atualizado:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

E continue com os próximos pagamentos (aqui Lightning):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Assim que o pedido for pago na totalidade:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

E finalmente, o ecrã inicial/de espera:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
