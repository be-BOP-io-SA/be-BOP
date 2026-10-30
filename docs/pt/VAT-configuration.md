# Gestão de Regimes e Taxas de IVA

## Introdução

Nativamente, o be-BOP exibe preços sem impostos.
Os cálculos de IVA são realizados a partir do carrinho.

Existem 3 regimes principais de IVA, mais uma variação:
- Isenção com justificação
- Venda à taxa de IVA do país do vendedor
- Venda à taxa de IVA do país do comprador
- Venda à taxa de IVA do país do vendedor com isenção para compradores que recebem mercadorias no estrangeiro, sujeita a declaração de pagamento de IVA no seu país através dos seus próprios serviços aduaneiros

Para auditorias fiscais, conformidade legal e contabilidade, é por vezes necessário recolher dados do cliente para justificar uma possível isenção de IVA.
Estes pontos são abordados em [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Caso 1: Isenção de IVA com Justificação

Em /admin/config, existe a opção **Disable VAT for my be-BOP**.
Uma vez marcada a caixa, **é aplicado um IVA de 0% a todas as encomendas futuras**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

Ativar esta opção ativa a sub-opção **VAT exemption reason (appears on the invoice)**.
Este é o texto legal a preencher para justificar a ausência de IVA ao seu cliente.
Por exemplo, em França:
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (prestação de serviço intracomunitário)

A razão fornecida será então indicada em cada uma das suas faturas.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Caso 2A: Venda à Taxa de IVA do País do Vendedor

Em /admin/config, existe a opção **Use VAT rate from seller's country (always true for products that are digital goods)**.
Deve então escolher o país ao qual a sua empresa está associada na opção **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

Ao fazê-lo:
- A taxa de IVA mostrada no carrinho será a do país da sua empresa (com um indicador a lembrar deste país)
- A taxa de IVA mostrada na página de checkout será a do país da sua empresa (com um indicador a lembrar deste país)
- A taxa de IVA mostrada na encomenda será a do país da sua empresa (com um indicador a lembrar deste país)
- A taxa de IVA mostrada na fatura será a do país da sua empresa

## Caso 2B: Venda à Taxa de IVA do País do Vendedor com Isenção para Entrega Física no Estrangeiro

No caso anterior, em /admin/config, se ativar a opção **Make VAT = 0% for deliveries outside seller's country**, as regras permanecerão as mesmas para clientes que recebem artigos no país da sua empresa.

O mesmo se aplica à compra de artigos descarregáveis, donativos ou subscrições (a taxa de IVA aplicada será a do país da sua empresa).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

No entanto, se o seu cliente quiser a mercadoria entregue no seu país (que não é o país da sua empresa):
- A taxa de IVA mostrada no carrinho será a do país onde o seu IP está geolocalizado (baseado em dados de ip2location.com)
- A taxa de IVA mostrada na página de checkout será a do país de entrega escolhido pelo cliente
- A taxa de IVA mostrada na encomenda será a do país de entrega escolhido pelo cliente
- A taxa de IVA mostrada na fatura será a do país de entrega escolhido pelo cliente
Mesmo que a morada de faturação do seu cliente seja no país da sua empresa, a entrega no estrangeiro, sob certos regimes, pode exigir pagamento por declaração à alfândega na receção das mercadorias.

Quando esta opção está ativada, na página de checkout (/checkout), o cliente deve validar uma nova opção obrigatória: **I understand that I will have to pay VAT upon delivery**.
Esta opção liga à página CMS /why-vat-customs, que deve ser criada e preenchida para explicar por que o seu cliente deve pagar o IVA do seu país ao receber o seu artigo.

### Cliente que Recebe Artigos no País do be-BOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Cliente que Recebe Artigos Noutro Local

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Caso 3: Venda à Taxa de IVA do País do Comprador

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Quando, em /admin/config, nenhuma opção de regime de IVA está ativada e um país de IVA é escolhido, o IVA aplicado será o do cliente:
- A taxa de IVA mostrada no carrinho será a do país onde o seu IP está geolocalizado (baseado em dados de ip2location.com)
- A taxa de IVA mostrada na página de checkout será a do país de entrega escolhido pelo cliente, ou a do país onde o seu IP está geolocalizado (baseado em dados de ip2location.com) para um carrinho sem artigos que necessitem de entrega
- A taxa de IVA mostrada na encomenda será a do país de entrega escolhido pelo cliente, ou a do país onde o seu IP está geolocalizado (baseado em dados de ip2location.com) para um carrinho sem artigos que necessitem de entrega
- A taxa de IVA mostrada na fatura será a do país de entrega escolhido pelo cliente, ou a do país onde o seu IP está geolocalizado (baseado em dados de ip2location.com) para um carrinho sem artigos que necessitem de entrega

## O IP do Utilizador Usado para Avaliação de IVA é Armazenado?
Estes pontos são abordados em [privacy-management.md](/docs/fr/privacy-management.md).
No entanto, sem outra configuração que exija informações do cliente, a informação não é armazenada: é obtida do navegador (conforme fornecida por este) e usada para dar uma estimativa de IVA e envio antes de o cliente introduzir a sua morada postal (uma recomendação legal imposta por certos países), mas não é nativamente armazenada nas bases de dados do be-BOP.
Por outro lado, os serviços fiscais e de fronteira podem exigir em certos países uma série de provas que justifiquem o pagamento de IVA do cliente quando não é o do país do vendedor. Neste caso, o be-BOP oferece certas opções (sem as encorajar nativamente).
Note que o IP é considerado dado de faturação válido em certos países, e o vendedor não é responsável pelo endereço IP enviado pelo navegador do cliente.

## Que Regime de IVA Escolher?

O regime de IVA da sua empresa pode depender de:
- O estatuto da sua empresa
- O seu tipo de atividade
- A sua faturação anual
- Outras subtilezas legais e administrativas

A abordagem mais segura é consultar o seu contabilista, advogado ou serviço empresarial relevante para determinar o seu regime de IVA alvo e configurá-lo no be-BOP.

## Gestão de Perfis de IVA Reduzido

Dependendo do país, alguns beneficiam de uma taxa de IVA reduzida (produtos culturais, donativos a associações ou financiamento de campanhas políticas, etc.).
Para isso, precisa de criar **Custom VAT Rates**.
O link é acessível em /admin/config e em /admin/config/vat:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

Pode nomear e guardar um perfil, e introduzir uma taxa de IVA personalizada por país (sem especificação, o IVA padrão será aplicado).

Exemplo de Custom VAT Rate dedicado a livros:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Depois, na interface de administração de produtos (/admin/product/{id}), pode especificar o perfil de IVA desejado baseado no tipo de produto:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" usará por defeito o IVA geral do be-BOP.

O IVA de cada artigo será exibido no carrinho:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

E também na fatura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
