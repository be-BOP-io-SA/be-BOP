# Inicialize o seu be-BOP

Resumo rápido antes de uma documentação mais detalhada

Uma vez que o seu be-BOP esteja no ar (não se esqueça do readme.md):

## Conta de super-administrador

- Acesse seu-site/admin/login
- crie a sua conta e senha de superadmin

## /admin/config (via Admin / Config)

### Proteja o acesso ao seu back-office

Acesse /admin/config, vá até "Admin hash", defina um hash e salve.
Agora, o endereço do back-office é /admin-seuhash

### Colocar o seu be-BOP em modo de manutenção

Acesse /admin/config, marque "Enable maintenance mode".
Você pode adicionar qualquer IPv4 separado por vírgulas para permitir o acesso ao front-office.
O back-office estará sempre aberto.

### Defina as suas moedas
Acesse /admin/config:
- a moeda principal é usada para exibição no front e nas faturas
- a moeda secundária é opcional e é usada para exibição no front
- a moeda de referência de preço é a moeda padrão na qual você criará seus preços, mas poderá alterá-la produto por produto
  - ao clicar no botão vermelho e confirmar, as moedas dos seus produtos serão substituídas pela seleção escolhida, mas o preço não será atualizado
- a moeda contábil permite que um be-BOP com moeda totalmente em BTC salve a taxa de câmbio do Bitcoin no momento do pedido.

### Temporização

A duração da assinatura é usada para produtos de assinatura, podendo escolher mês, semana ou dia.
O lembrete de assinatura é o intervalo entre o envio da nova proposta de fatura e o término da assinatura.

### Blocos de confirmação

Para pagamentos Bitcoin on-chain, você pode definir um número padrão de verificações para transações.
Mas com "Manage confirmation thresholds", poderá fazê-lo dependendo do preço, por exemplo:
- < 100€ : 0 confirmações
- 100€ a 1000€ : 1 confirmação
- 1000€ a 9999999999999€ : 2 confirmações
etc

### Expiração do pedido

"Set desired timeout for payment (in minute)" permite cancelar um pedido no sistema be-BOP se a transação não foi paga ou verificada suficientemente.
Aplica-se apenas a Bitcoin on-chain, Lightning e cartão de crédito pelo Sum Up.
Um tempo muito curto obrigará a ter confirmações on-chain curtas/nulas.
Um tempo muito longo bloqueará o estoque dos seus produtos enquanto o pedido estiver pendente.

### Reserva de estoque
Para evitar a ocupação indevida do estoque, pode definir "How much time a cart reserves the stock (in minutes)".
Quando adiciono um produto ao meu carrinho, se for o último, ninguém mais poderá adicioná-lo.
Mas, se eu não processar o meu pedido e esperar mais do que o tempo definido, o produto ficará disponível novamente e será removido do meu carrinho se outra pessoa o comprar.

### A definir

## /admin/identity (via Config / Identity)

Aqui, todas as informações sobre a sua empresa serão usadas para faturas e recibos.

"Invoice Information" é opcional e será adicionado no canto superior direito do recibo.

Para permitir o meio de pagamento "transferência bancária", precisa preencher o IBAN e BIC da sua "Bank account".

O email de informações de contacto será usado como "enviado por" nos emails e exibido no rodapé.

## /admin/nostr (através de Node management / Nostr)

Acesse /admin/nostr (através de Node management / Nostr) e clique em "Create nsec" se ainda não tiver um.
Depois, pode adicioná-lo no .env.local antes (veja readme.md)

## /admin/sumup (através de Payment partner / Sum Up)

Assim que tiver a sua conta Sum Up, use a interface de desenvolvimento deles e copie a chave API aqui.
O código de comerciante pode ser encontrado no seu painel, ou em recibos de transações anteriores.
A moeda é a moeda da sua conta Sum Up (geralmente, do país de origem da sua empresa).

# O resto

Por agora, e para coisas fora do back-office, não se esqueça do readme.md.

O organograma de governança será publicado em breve, mas, resumidamente, cada pull request será revisto por:
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
E se estivermos de acordo, faremos o merge.

Recusaremos necessidades ultra-específicas e optaremos por funcionalidades genéricas que possam ser usadas pelo maior número de pessoas.
