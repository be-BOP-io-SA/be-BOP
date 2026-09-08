# Configuracao CLINK

CLINK (Common Lightning Interface for Nostr Keys) e um metodo de pagamento Lightning que utiliza o protocolo Nostr como camada de transporte. Permite aos comerciantes receber pagamentos Lightning via eventos Nostr criptografados de tipo 21001.

## Visao Geral

Quando um cliente paga com CLINK:

1. Uma **fatura bolt11** e criada imediatamente no momento do pedido e exibida como codigo QR
2. Qualquer carteira Lightning pode escanear e pagar a bolt11 diretamente
3. Carteiras compatveis com CLINK tambem podem escanear o **nOffer** do comerciante e receber a mesma bolt11 via relay Nostr
4. O pagamento e confirmado consultando o no Lightning do processador backend configurado para a fatura (via hash de pagamento)

CLINK e **apenas uma camada de transporte**, nao um backend Lightning. A geracao de faturas e o settlement sao delegados ao proprio processador Lightning configurado do be-BOP (LND, Blink, PhoenixD, etc.): o mesmo no que suportaria qualquer outro pagamento Lightning. Isso produz um hash de pagamento real e um `checkPayment()` confiavel com base no no, que reconcilia contra o backend que realmente recebeu os sats.

## Pre-requisitos

- Uma **chave privada Nostr** configurada em `.env.local` (formato nsec)
- Um processador Lightning configurado e habilitado (ex: Blink, LND, PhoenixD) usado para geracao de faturas
- Um relay Nostr para comunicacao CLINK (padrao: `wss://strfry.shock.network`)

## Configuracao

### 1. Variaveis de ambiente

Adicionar em `.env.local`:

```
# Chave privada Nostr (formato nsec) -- necessaria para criptografia NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configuracao do Admin

Navegar ate **Admin > CLINK**:

- **nOffer**: Sua string nOffer Lightning.Pub (ex: `noffer1...`). Identifica sua conta de comerciante para carteiras CLINK.
- **URL do relay Nostr**: O relay Nostr utilizado para comunicacao CLINK (padrao: `wss://strfry.shock.network`)
- Clicar em **Save**, depois em **Test connection** para verificar que o relay e o nOffer estao funcionando corretamente

### 3. Ativar CLINK como metodo de pagamento

Na pagina **Config**, sob **Metodos de pagamento**, ativar **Lightning** e definir o processador Lightning padrao como **CLINK**. O backend Lightning subjacente (LND, Blink, PhoenixD…) tambem deve estar configurado e habilitado.

## Como Funciona

### Fluxo de pagamento

1. **Cliente faz o pedido** -> be-BOP delega a criacao da fatura ao seu processador Lightning configurado, que emite uma bolt11 com hash de pagamento real
2. **Codigo QR exibido** -> A fatura bolt11 e apresentada ao cliente
3. **Fluxo da carteira CLINK** -> Carteiras compatveis com CLINK solicitam a fatura via Nostr (kind 21001); a bolt11 e retornada criptografada (NIP-44)
4. **Cliente paga** -> Escaneia o QR (ou usa sua carteira CLINK) com qualquer carteira Lightning e paga
5. **Pedido confirmado** -> O poller de pedidos do be-BOP chama `checkPayment()`, que delega ao processador Lightning backend e consulta o no pela fatura usando seu hash de pagamento real; o pedido e marcado como pago

### Protocolo CLINK

O protocolo CLINK utiliza o evento Nostr tipo 21001 com criptografia NIP-44:

- **Requisicao** (cliente -> servidor): O cliente envia uma requisicao de pagamento criptografada com o valor
- **Resposta** (servidor -> cliente): O servidor responde com a fatura bolt11 criptografada
- **Settlement**: O cliente paga a fatura bolt11 via Lightning padrao; o no Lightning do comerciante detecta o pagamento

### Deteccao de pagamento

O pagamento e detectado pelo proprio processador Lightning backend: `checkPayment()` redireciona para o processador que criou a fatura (registrado por pagamento como `meta.backend`) e consulta aquele no pela fatura via hash de pagamento. **Nao ha dependencia de recibos Nostr**: o settlement e verificado contra o no que realmente recebeu os sats, tornando o fluxo sem estado (stateless) e seguro em multi-processo.

Um botao **Verificar status do pagamento** esta disponivel nos pedidos CLINK pendentes; ele apenas reexecuta essa verificacao baseada no no (o settlement e aplicado pelo poller de pedidos sob o lock do pedido).

### Componentes principais

- **nOffer**: Uma string de oferta do comerciante codificada em bech32 contendo a chave publica Nostr do comerciante, a URL do relay e o ID da oferta
- **Criptografia NIP-44**: Criptografia de ponta a ponta para requisicoes e respostas de pagamento
- **Criacao de faturas**: Delegada ao processador Lightning configurado do be-BOP; cria uma fatura real + hash de pagamento, sem idas e voltas via Nostr
- **Ouvinte persistente**: Uma assinatura Nostr de longa duracao no relay do comerciante que entrega bolt11s para carteiras CLINK, sobrevivendo a reconexoes do relay. Ouvinte inicia automaticamente na inicializacao do servidor.

### Seguranca

- **Protecao SSRF do relay**: As URLs dos relays sao validadas contra faixas de IP privadas/internas antes de conectar
- **Validacao BOLT11**: Faturas devem carregar exatamente o valor esperado (sem tolerancia) e a rede correspondente
- **Verificacao de assinaturas**: Todos os eventos Nostr entrantes sao verificados antes do processamento
- **Filtro por chave publica do comerciante**: Os filtros de assinatura Nostr usam a chave publica propria do comerciante (derivada de `NOSTR_PRIVATE_KEY`), nao a chave do Lightning.Pub

## Carteiras compatveis

Qualquer carteira Lightning pode pagar o codigo QR bolt11. Para o fluxo Nostr CLINK, use uma carteira compatvel com CLINK:

- ShockWallet
- ZEUS
- Outras carteiras compatveis com CLINK

## Solucao de problemas

### Fatura nao criada

- Verificar se um processador Lightning esta configurado e habilitado (ex: Blink, LND, PhoenixD)
- Verificar se `NOSTR_PRIVATE_KEY` esta definido em `.env.local`
- Verificar os logs do servidor para erros relacionados a CLINK

### Codigo QR nao exibido

- Assegurar que o arquivo `assets/bebop-b.svg` exista para a sobreposicao do logo do QR
- Verificar o console do navegador para erros

### A carteira CLINK nao consegue conectar

- Verificar se a URL do relay esta correta e acessivel pelo servidor
- Verificar se a lista de relays Nostr em **Admin > Nostr** inclui o relay CLINK
- Assegurar que a string nOffer e valida e corresponde a chave Nostr configurada

### Pagamento nao confirmado

- Verificar se o no Lightning backend esta acessivel e que a fatura foi criada nele
- Usar o botao **Verificar status do pagamento** na pagina do pedido para ativar manualmente uma consulta ao no
- O poller de pedidos reverifica a cada 2 segundos; o settlement e aplicado sob o lock do pedido

## Detalhes Tecnicos

- **Tipo de evento Nostr**: 21001
- **Criptografia**: NIP-44 (versao 2)
- **Backend de faturas**: O processador Lightning configurado do be-BOP (LND, Blink, PhoenixD…)
- **Deteccao de pagamento**: Busca baseada no no usando hash de pagamento real, delegada ao processador backend da fatura
- **URL do relay CLINK**: `wss://strfry.shock.network` (configuravel em Admin > CLINK)

## Settlement com nDebit

CLINK e **apenas uma camada de transporte** -- ele **nao exige nDebit** para settlement. O settlement de pagamentos e tratado inteiramente pelo processador Lightning padrao do comerciante (Blink, LND, Phoenixd, etc.) via a fatura bolt11. O comerciante recebe sats em seu backend Lightning existente.

Se um comerciante deseja usar nDebit para settlements entre nos (ex: com ShockWallet), isso e configurado em sua carteira, nao no be-BOP.
