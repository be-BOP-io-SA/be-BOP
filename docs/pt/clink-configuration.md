# Configuracao CLINK

CLINK (Common Lightning Interface for Nostr Keys) e um metodo de pagamento Lightning que utiliza o protocolo Nostr como camada de transporte. Permite aos comerciantes receber pagamentos Lightning via eventos Nostr criptografados de tipo 21001.

## Visao Geral

Quando um cliente paga com CLINK:

1. Uma **fatura bolt11** e criada imediatamente no momento do pedido e exibida como codigo QR
2. Qualquer carteira Lightning pode escanear e pagar a bolt11 diretamente
3. Carteiras compatveis com CLINK tambem podem escanear o **nOffer** do comerciante e receber a mesma bolt11 via relay Nostr
4. O pagamento e confirmado quando Lightning.Pub envia um recibo (segundo evento kind 21001) ao comerciante

CLINK e uma camada de transporte, nao um backend Lightning. A geracao de faturas e delegada ao processador Lightning configurado (ex: Blink) ou a um endpoint HTTP Lightning.Pub.

## Pre-requisitos

- Uma **chave privada Nostr** configurada em `.env.local` (formato nsec)
- Um processador Lightning configurado (ex: Blink) ou um endpoint HTTP Lightning.Pub
- Um relay Nostr para comunicacao CLINK (ex: `wss://strfry.shock.network`)

## Configuracao

### 1. Variaveis de ambiente

Adicionar em `.env.local`:

```env
# Chave privada Nostr (formato nsec) -- necessaria para criptografia NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configuracao do Admin

Navegar ate **Admin > Config** e rolar para a secao **CLINK**:

- **nOffer**: Sua string nOffer Lightning.Pub (ex: `noffer1...`). Identifica sua conta de comerciante para carteiras CLINK.
- **Relay**: A URL do relay Nostr utilizada para comunicacao CLINK (ex: `wss://strfry.shock.network`)
- **Endpoint HTTP Lightning.Pub** (opcional): Se voce deseja usar uma instancia especifica do Lightning.Pub para geracao de faturas, insira sua URL HTTP aqui. Caso contrario, o processador Lightning configurado e utilizado.

### 3. Ativar CLINK como metodo de pagamento

Na pagina **Config**, sob **Metodos de pagamento**, ativar **Lightning** e definir o processador Lightning padrao como **CLINK**.

## Como Funciona

### Fluxo de pagamento

1. **Cliente faz o pedido** → be-BOP envia uma requisicao CLINK (kind 21001) ao Lightning.Pub via o relay do comerciante
2. **Lightning.Pub responde** → Retorna uma fatura bolt11 pelo valor exato
3. **Codigo QR exibido** → A fatura bolt11 e apresentada ao cliente
4. **Cliente paga** → Escaneia o QR com qualquer carteira Lightning e paga
5. **O recibo chega** → Lightning.Pub envia um segundo evento kind 21001 (recibo de pagamento) ao comerciante
6. **Pedido confirmado** → be-BOP recebe o recibo e marca o pedido como pago

### Protocolo CLINK

O protocolo CLINK utiliza o evento Nostr tipo 21001 com criptografia NIP-44:

- **Requisicao** (cliente → servidor): O cliente envia uma requisicao de pagamento criptografada com o valor
- **Resposta** (servidor → cliente): O servidor responde com a fatura bolt11 criptografada
- **Recibo** (Lightning.Pub → servidor): Apos o pagamento, Lightning.Pub envia um recibo confirmando o settlement
- **Settlement**: O cliente paga a fatura bolt11 via Lightning padrao

### Deteccao de pagamento

O pagamento e detectado exclusivamente via o **recibo Nostr** (segundo evento kind 21001 do Lightning.Pub). be-BOP **nao delega** a deteccao de pagamento ao processador Lightning subjacente (Blink, LND, etc.) pois esses processadores nao podem buscar faturas criadas pelo Lightning.Pub.

Se o recibo nao for recebido (ex: problemas de relay), o pagamento expirara apos o timeout da sessao (2 horas). Na pratica, os recibos chegam em segundos apos o pagamento.

### Componentes principais

- **nOffer**: Uma string de oferta do comerciante codificada em bech32 contendo a chave publica Nostr do comerciante, a URL do relay e o ID da oferta
- **Criptografia NIP-44**: Criptografia de ponta a ponta para requisicoes e respostas de pagamento
- **Armazenamento de sessoes**: As sessoes CLINK ativas sao persistidas em MongoDB com um indice TTL, sobrevivendo a reinicializacoes do servidor. Um cache em memoria fornece buscas rapidas.
- **Ouvinte persistente**: Uma assinatura Nostr de longa duracao no relay do comerciante que lida tanto com requisicoes de pagamento entrantes quanto com recibos de pagamento, sobrevivendo a reconexoes do relay

### Seguranca

- **Protecao SSRF do relay**: As URLs dos relays sao validadas contra faixas de IP privadas/internas antes de conectar
- **Validacao BOLT11**: Faturas recebidas do Lightning.Pub sao validadas por correspondencia de rede e consistencia de valor
- **Verificacao de assinaturas**: Todos os eventos Nostr entrantes sao verificados antes do processamento

## Carteiras compatveis

Qualquer carteira Lightning pode pagar o codigo QR bolt11. Para o fluxo Nostr CLINK, use uma carteira compatvel com CLINK:

- ShockWallet
- ZEUS
- Outras carteiras compatveis com CLINK

## Solucao de problemas

### Fatura nao criada

- Verificar se um processador Lightning esta configurado e habilitado (ex: Blink), ou se um endpoint HTTP Lightning.Pub foi definido
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

- Verificar se o relay e acessivel pelo servidor (a protecao SSRF pode bloquear URLs internas)
- Verificar se o Lightning.Pub envia recibos para o relay correto
- A sessao expira apos 2 horas -- se o recibo se atrasar apos esse prazo, o pagamento nao sera confirmado

## Detalhes Tecnicos

- **Tipo de evento Nostr**: 21001
- **Criptografia**: NIP-44 (versao 2)
- **Deteccao de pagamento**: Callback de recibo Nostr (segundo evento kind 21001)
- **Armazenamento de sessoes**: MongoDB com indice TTL (2 horas)
- **Relays padrao**: `wss://strfry.shock.network`, `wss://relay.shocknet.app`

## Settlement com nDebit

CLINK e **apenas uma camada de transporte** -- ele **nao exige nDebit** para settlement. O settlement de pagamentos e tratado inteiramente pelo processador Lightning padrao do comerciante (Blink, LND, Phoenixd, etc.) via a fatura bolt11. O comerciante recebe sats em seu backend Lightning existente.

Se um comerciante deseja usar nDebit para settlements entre nos (ex: com ShockWallet), isso e configurado em sua carteira, nao no be-BOP.
