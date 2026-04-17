# Páginas CMS obrigatórias

## Introdução

O be-BOP utiliza nativamente certas páginas obrigatórias para exibir vários textos (como avisos legais), a página inicial ou páginas de erro.
Estas páginas são páginas CMS que podem ser personalizadas em /admin/CMS como qualquer outra página de conteúdo rico.

Os slugs para estas páginas são:
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Página inicial
Esta página é exibida ao aceder à raiz do seu site (/).
Servindo como vitrine da sua empresa, deve (ou pode, dependendo do gosto), em resumo:
- apresentar a sua marca
- apresentar os seus valores
- apresentar as suas novidades
- destacar certos artigos
- permitir navegar pelo resto do seu site à medida que avança, sem ter de voltar aos menus
- apresentar a sua identidade gráfica
- permitir que as pessoas o contactem
- não estar sobrecarregada
Embora cada um destes pontos possa ser desenvolvido na sua própria página CMS, uma leitura vertical da sua página inicial deve fazer os visitantes querer descobrir o resto do seu site.

## /error - Página de erro
Se deseja que seja exibida o mínimo possível, é sempre melhor redirecionar o seu utilizador para conteúdo em vez de uma mensagem de erro bruta.
Isto pode assumir a forma de:
- uma mensagem de desculpa (essencial)
- um formulário de contacto para reportar a anomalia encontrada
- um link para uma seleção de produtos, uma página de novidades ou a página inicial

## /maintenance - Página de manutenção
Ver [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
Quando está a realizar trabalhos no seu site ou precisa restringir o acesso para migração, backup ou outras operações, pode colocar o seu site em manutenção.
Todo o público (exceto uma lista de visitantes cujo IP foi adicionado à whitelist), ao tentar aceder a qualquer página do seu site, será redirecionado para a página /maintenance.
Pode incluir:
- uma explicação do encerramento do site
- um teaser sobre as novidades que virão com a reabertura
- um formulário de contacto
- visuais
- links para outros sites ou redes sociais

## /terms - Termos de utilização
Esta página é geralmente exibida nos links do rodapé do site, e também é exibida no túnel de checkout com a caixa de verificação obrigatória **I agree to the terms of service**.
O link para esta opção obrigatória no túnel (/checkout) leva a /terms, dando aos seus visitantes acesso a todos os termos e condições de venda e utilização.
Preencher esta página é tedioso, mas não obstante obrigatório!

## /privacy - Política de privacidade
Ver [privacy-management.md](/docs/en/privacy-management.md)
Esta página é geralmente exibida nos links do rodapé do site.
Permite que os seus visitantes conheçam todas as condições que regem o uso das suas informações pessoais, conformidade com o RGPD, recolha de cookies, etc.
O único cookie presente (bootik-session) no be-BOP é o cookie de sessão, que é essencial para o funcionamento correto.
Não utilizamos cookies publicitários.
Um segundo cookie (lang) está presente para armazenar a sua escolha de idioma.
Como proprietário, pode recolher mais informações (informações de faturação, endereço IP) por razões legais e contabilísticas: por favor explique nesta página.
Além disso, embora os optins para prospeção comercial estejam nativamente desativados no be-BOP, é possível apresentá-los (desativados) ao cliente, e deve comprometer-se a respeitar a escolha do cliente quanto ao que escolhe ou não nos seus optins.
Preencher esta página é tedioso, mas não obstante obrigatório e ético para com os seus visitantes!

## /why-vat-customs - Pagamento na alfândega à receção
Ver [VAT-configuration.md](/docs/en/VAT-configuration.md)
Sob o regime de IVA 2B (venda à taxa de IVA do país do vendedor e isenção para entrega de itens físicos no estrangeiro), o cliente deve validar uma nova opção obrigatória: Compreendo que terei de pagar IVA na entrega. Esta opção liga à página CMS /why-vat-customs, que deve ser criada e preenchida para explicar por que o seu cliente deve pagar IVA no seu país à receção do seu item.

## /why-collect-ip - Justificação para a recolha de IP
Ver [privacy-management.md](/docs/en/privacy-management.md)
Se, por razões contabilísticas ou legais, precisar armazenar o endereço IP do seu cliente para uma compra desmaterializada sem morada postal (via /admin/config com a opção **Request IP collection on deliveryless order**), o cliente terá uma opção obrigatória para completar o pedido **I agree to the collection of my IP address (why?)**.
O link para esta opção vai para /why-collect-ip, onde é melhor explicar por que deseja guardar esses dados (lembrando que a aceitação do cliente é obrigatória para finalizar o pedido se configurar o seu be-BOP desta forma).

## /why-pay-reminder - Compromisso de pagar um pedido em conta
Ver [order-with-deposit.md](/doc/en/order-with-deposit.md)
Quando ativa o pagamento em conta para um dos seus itens, o primeiro pedido efetuado inclui apenas o depósito, mas o cliente compromete-se a pagar ao vendedor o restante do valor do pedido nas condições apresentadas.
Se o seu pedido incluir uma reserva de um item em conta, o link é exibido no túnel de checkout com a caixa de verificação obrigatória **I agree that I need to pay the remainder in the future (why?)**.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom,  /basket-top, /basket-bottom
Ver [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
