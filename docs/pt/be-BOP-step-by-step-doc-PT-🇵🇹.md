# be-BOP: Documentação Passo a Passo (🇵🇹)

# 1. Instalação e Acesso Inicial

**1.1. Instalação do be-BOP**

- **Pré-requisitos:**

    1. **Infraestrutura técnica:**

        - **Armazenamento S3 compatível:** Um serviço ou solução (ex.: MinIO, AWS S3, Scaleway, …) com a configuração do bucket (S3_BUCKET, S3_ENDPOINT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_REGION).

        - **Banco de dados MongoDB em ReplicaSet:** Uma instância local configurada em ReplicaSet ou a utilização de um serviço como MongoDB Atlas (variáveis MONGODB_URL e MONGODB_DB).

        - **Ambiente Node.js:** Node versão 18 ou superior, com Corepack ativado (`corepack enable`).

        - **Git LFS instalado:** Para gerenciar arquivos grandes (comando `git lfs install`).

    2. **Configuração das comunicações:**

        - **SMTP:** Credenciais SMTP válidas (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) para o envio de e-mails e notificações.

    3. **Segurança e notificações (mínimo um dos dois):**

        - **E-mail:** Uma conta de e-mail que permita a configuração SMTP para o envio de notificações.

        - **Chave Nostr (nsec):** Uma chave NSEC (pode ser gerada pelo be-BOP através da interface Nostr).

    4. **Métodos de pagamento compatíveis:**

        - Dispor de pelo menos um método de pagamento suportado pelo be-BOP, como:

            - Bitcoin

            - Lightning Network

            - PayPal

            - SumUp

            - Stripe

            - Transferências bancárias e pagamentos em dinheiro requerem validação manual.

    5. **Conhecimento do regime de IVA:**

        - É essencial conhecer o regime de IVA aplicável à sua atividade (ex.: venda com IVA do país do vendedor, isenção com justificativa, ou venda com a taxa de IVA do país do comprador) para configurar corretamente as opções de faturamento e cálculo de IVA no be-BOP.

    6. **Configuração das moedas:**

        - Determine claramente qual moeda principal usar, qual moeda secundária (se aplicável) e, para uma loja 100% BTC, qual moeda de referência usar para a contabilidade.

    7. **Outros pré-requisitos de negócios:**

        - Ter uma visão clara dos seus processos de pedido, gestão de estoque, política de taxas de envio, bem como das modalidades de pagamento e recebimento, online e/ou na loja.

        - Conhecer as obrigações legais (avisos legais, condições de uso, política de privacidade) para a implementação das páginas CMS obrigatórias.

- **Instalação:** Implante a aplicação através do script de instalação oficial no seu servidor e verifique se todas as dependências foram instaladas corretamente.

**1.2. Criação da conta Super-Admin**

- Acesse **/admin/login**

- Crie sua conta de super-admin escolhendo um identificador e uma senha segura. Prefira uma frase-senha com três palavras ou mais.

- Esta conta permitirá acessar todas as funcionalidades do back-office.

---

# 2. Segurança e Configuração do Back-Office

**2.1. Segurança do acesso**

- **Configuração do hash de acesso:**

    - Acesse **/admin/config** através da interface de administração.

    - Na seção dedicada à segurança (ex. “Admin hash”), defina uma cadeia única (hash).

    - Após salvar, a URL do back-office será alterada (por exemplo: **/admin-seuhash/login**) para limitar o acesso a pessoas autorizadas.

**2.2. Ativação do modo de manutenção (se necessário)**

- Ainda em **/admin/config**, (Config > Config através da interface gráfica) marque a opção **Enable maintenance mode** na parte inferior da página.

- Se necessário, indique uma lista de endereços IPv4 autorizados (separados por vírgulas) para permitir o acesso ao front-office durante a manutenção.

- O back-office permanece acessível para administradores.

**2.3. Configuração dos acessos de recuperação via e-mail ou Nostr**

- Ainda em **/admin/config**, através do módulo ARM, assegure-se de que a conta super-admin possui um endereço de e-mail ou uma npub de recuperação, facilitando o procedimento em caso de esquecimento da senha.

**2.4. Configuração da língua ou multilíngue**

- Em **Admin > Config > Languages**, ative ou desative o seletor de língua dependendo se o seu site é multilíngue ou monolíngue (desative para um site em uma única língua).

**2.5. Configuração do Layout, Logotipos e Favicon**

- Em **Admin > Merch > Layout**, configure a barra superior, a barra de navegação e o rodapé.

    - Certifique-se de ativar a opção “Display powered by be-BOP” no rodapé.

    - Não esqueça de definir os logotipos para os temas claro e escuro, bem como o favicon, através de **Admin > Merch > Pictures**.

---

# 3. Configuração da Identidade do Vendedor

**3.1. Parametrização da identidade**

- Acesse **/admin/identity** (Config > Identity através da interface gráfica) para preencher todas as informações relacionadas à sua empresa:

    - **Nome da empresa**, **endereço postal**, **e-mail de contato** que será usado para o envio de faturas e comunicações oficiais.

    - **Informações de faturamento** (opcionais) que aparecerão no canto superior direito das faturas.

- **Conta bancária:**

    - Para ativar o pagamento por transferência bancária, informe seu IBAN e BIC.

**3.2. (Para loja física) Exibição do endereço da loja**

- Para aqueles com uma loja física, duplique a configuração anterior adicionando em **/admin/identity** (ou através de uma seção dedicada) o endereço completo da loja, para que seja exibido em seus documentos oficiais e no rodapé, se aplicável.

---

# 4. Configuração das Moedas

**4.1. Definição das moedas em /admin/config**

- **Moeda principal:**

    - Esta moeda é exibida no front-office e nas faturas.

- **Moeda secundária (opcional):**

    - Pode ser usada para exibição ou como alternativa.

- **Moeda de referência para os preços:**

    - Permite fixar seus preços em uma moeda "estável".

    - Atenção: Um clique no botão de confirmação recalculará os preços de todos os produtos sem alterar os valores inseridos.

- **Moeda de conta:**

    - Usada para acompanhar a taxa de câmbio em um be-BOP totalmente em Bitcoin.

---

# 5. Configuração dos Métodos de Pagamento

Você pode definir a duração de um pagamento pendente no painel **Admin > Config**

**5.1. Pagamentos Bitcoin e Lightning**

- **Bitcoin nodeless (onchain):**

    - Em **Admin > Payment Settings > Bitcoin nodeless**, configure o módulo escolhendo o padrão BIP (apenas BIP84 por enquanto).

    - Informe a chave pública (formato **zpub**) gerada com uma carteira compatível (ex. Sparrow Wallet).

    - Não modifique o índice de derivação, que começa em 0 e é incrementado automaticamente.

    - Configure a URL de um explorador de blocos para verificar as transações (ex.: `https://mempool.space`).

- **PhoenixD para Lightning:**

    - Instale o PhoenixD no seu servidor seguindo as instruções em [https://phoenix.acinq.co/server/get-started](https://phoenix.acinq.co/server/get-started).

    - Em **Admin > Payment Settings > PhoenixD**, indique a URL da sua instância (se usar Docker, considere as particularidades de rede) e adicione a senha HTTP do PhoenixD. Se instalar o PhoenixD no mesmo servidor que o seu be-BOP, clique no botão Detect PhoenixD Server.

**Para usuários avançados**

É possível ter um nó Bitcoin completo e LND usando o .env e as credenciais RPC (+TOR recomendado) para um nó remoto. Alternativamente, você pode instalar o Bitcoin Core e o LND na mesma rede local que o seu be-BOP.

- **Bitcoin Core:**

    - Em **Admin > Payment Settings > Bitcoin core node**

- **Lightning LND:**

    - Em **Admin > Payment Settings > Lightning LND node**

**5.2. Pagamento por PayPal**

- Em **Admin > Payment Settings > Paypal**, insira seu Client ID e Secret obtidos na sua conta de desenvolvedor PayPal. [https://developer.paypal.com/api/rest/](https://developer.paypal.com/api/rest/)

- Marque **Those credentials are for the sandbox environment** se desejar usar o modo Sandbox (para testes) ou deixe como padrão para o modo de produção.

**5.3. Pagamento por SumUp**

- Em **Admin > Payment Settings > SumUp**, insira sua API Key e Merchant Code. [https://developer.sumup.com/api](https://developer.sumup.com/api)

- A moeda usada corresponde à do seu conta SumUp (geralmente a do país da sua empresa).

**5.4. Pagamento por Stripe**

- Em **Admin > Payment Settings > Stripe**, insira sua Secret Key e Public Key. [https://docs.stripe.com/api](https://docs.stripe.com/api)

- A moeda usada corresponde à do seu conta Stripe (geralmente a do país da sua empresa).

---

# 6. Gestão de Produtos

**6.1. Criação de um novo produto**

- Acesse **Admin > Merch > Products** para adicionar ou modificar um produto.

- **Informações básicas:**

    - Preencha o **Product name**, o **slug** (identificador único para a URL) e, se necessário, um **alias** para facilitar a adição através do campo dedicado no carrinho. Para produtos destinados à venda online (fora do Ponto de Venda), a adição de um alias não é necessária.

- **Precificação:**

    - Defina o preço em **Price Amount** e selecione a moeda em **Price Currency**. Você também pode criar produtos gratuitos ou de preço livre usando as opções do produto abaixo, marcando as caixas **This is a free product** e **This is a pay-what-you-want product**, respectivamente.

    - **Opções do produto:**

    - Indique se o produto é independente (adição única por pedido) ou se é um produto com variações (exemplo: uma camiseta S, M, L e XL não é independente).

    - Para produtos com variações, como o exemplo anterior, ative a opção **Product has light variations (no stock difference)** e adicione as variações (nome, valor e diferença de preço).

**6.2. Gestão de estoque**

- Para um produto com estoque limitado, marque **The product has a limited stock** e informe a quantidade disponível.

- O sistema também exibe o estoque reservado (em pedidos pendentes) e o estoque vendido.

- Você pode alterar o valor em minutos da duração em que um produto é considerado reservado em um carrinho pendente de pagamento em **Admin > Config**

---

# 7. Criação e Personalização de Páginas CMS e Widgets

**7.1. Páginas CMS obrigatórias**

- Crie em **Admin > Merch > CMS** as páginas essenciais, como:

    - `/home` (página inicial),

    - `/error` (página de erro),

    - `/maintenance` (página de manutenção),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (páginas legais e informativas obrigatórias).

- Essas páginas são destinadas a fornecer aos visitantes informações legais, de contato e a explicar o funcionamento da sua loja.

- Você pode adicionar quantas páginas desejar.

**7.2. Layout e elementos gráficos**

- Acesse **Admin > Merch > Layout** para personalizar a barra superior, a barra de navegação e o rodapé.

- Modifique os links, logotipos (via **Admin > Merch > Pictures**) e a descrição do seu site.

**7.3. Integração de widgets nas páginas CMS**

- Você pode criar diferentes Widgets em **Admin > Widgets**: Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries e Leaderboards.

- Use as tags específicas para integrar elementos dinâmicos, por exemplo:

    - Para exibir um produto: `[Product=slug?display=img-1]`

    - Para exibir uma imagem: `[Picture=slug width=100 height=100 fit=contain]`

    - Para integrar um slider: `[Slider=slug?autoplay=3000]`

    - Para adicionar um desafio, uma contagem regressiva, um formulário, etc., use respectivamente `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`.

---

# 8. Gestão de Pedidos e Relatórios

**8.1. Acompanhamento de pedidos**

- Em **Admin > Transaction > Orders**, você pode visualizar a lista de pedidos.

- Use os filtros disponíveis (Número do Pedido, Alias do Produto, Meio de Pagamento, E-mail, etc.) para refinar sua pesquisa.

- Você pode consultar os detalhes de um pedido (produtos pedidos, informações do cliente, endereço de entrega) e gerenciar o estado do pedido (confirmar, cancelar, adicionar etiquetas, consultar notas do pedido).

**8.2. Relatórios e exportação**

- Acesse **Admin > Config > Reporting** para consultar estatísticas mensais e anuais de pedidos, produtos e pagamentos.

- Cada seção (Detalhes do Pedido, Detalhes do Produto, Detalhes do Pagamento) oferece um botão **Export CSV** para baixar os dados.

---

# 9. Configuração da Mensageria Nostr (opcional)

**9.1. Configuração da chave Nostr**

- Em **Admin > Node Management > Nostr**, clique em **Criar uma nsec** se você ainda não possuir uma.  
    **NOTA:** Se você já gerou e configurou sua nsec via um cliente Nostr e a informou no seu arquivo .env, esta etapa pode ser omitida.

- Copie a chave NSEC gerada por você ou pelo be-BOP e adicione-a ao seu arquivo **.env.local** sob a variável `NOSTR_PRIVATE_KEY`.

**9.2. Funcionalidades associadas**

- Esta configuração permite enviar notificações via Nostr, ativar o cliente leve de administração e oferecer conexões sem senha por meio de links temporários.

---

# 10. Personalização do Design e Temas

- Em **Admin > Merch > Theme**, crie um tema definindo cores, fontes e estilos para os elementos do cabeçalho, corpo, rodapé, etc.

- Após criar o tema, aplique-o como tema ativo para sua loja.

---

# 11. Configuração dos Modelos de E-mails

- Acesse **Admin > Config > Templates** para configurar os modelos de e-mails (ex.: para redefinição de senha, notificações de pedido, etc.).

- Para cada modelo, informe o **Subject** e o **HTML body**.

- Os modelos aceitam variáveis como `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}`, etc.

---

# Para ir mais longe...

# 12. Configuração de Tags e Widgets Específicos

**12.1. Gestão de Tags**

- Em **Admin > Widgets > Tag**, crie tags para organizar seus produtos ou enriquecer suas páginas CMS.

- Preencha o **Tag name**, o **slug**, escolha a **Tag Family** (Creators, Retailers, Temporal, Events) e complete os campos opcionais (título, subtítulo, conteúdo curto e completo, CTAs).

**12.2. Integração via CMS**

- Para integrar uma tag em uma página, use a sintaxe:
    `[Tag=slug?display=var-1]`

# 13. Configuração de Arquivos para Download

**Adição de um arquivo**

- Em **Admin > Merch > Files**, clique em **New file**.

- Preencha o **nome do arquivo** (ex.: "Manual do produto") e faça o upload do arquivo através do botão **Procurar…**.

- Após adicionado, um link permanente é gerado e pode ser usado em suas páginas CMS para compartilhar o arquivo.

# 14. Nostr-bot

Na seção **Node Management > Nostr**, você pode configurar sua interface Nostr, que permite enviar notificações e interagir com seus clientes. Entre as opções disponíveis, você pode:

- Gerenciar a lista de relés usados pelo seu nostr-bot.

- Ativar ou desativar a mensagem de introdução automática enviada pelo bot.

- Certificar sua npub, associando a ela um logotipo, um nome e um domínio (alias Lightning BOLT12 para Zaps).

# 15. Sobrescrita de Rótulos de Tradução

Embora o be-BOP esteja disponível em várias línguas (inglês, francês, espanhol, etc.), é possível personalizar as traduções para adaptá-las às suas necessidades. Para isso, acesse **Config > Languages**, onde você pode carregar e editar os arquivos JSON de tradução. Esses arquivos para cada língua estão disponíveis em nosso repositório oficial no seguinte endereço:  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations)

---

# PARTE 2 Trabalho em Equipe e POS

# 1. Gestão de Usuários e Direitos de Acesso

**1.1. Criação de papéis**

- Em **Admin > Config > ARM**, clique em **Create a role** para definir papéis (ex.: Super Admin, Ponto de Venda, Verificador de ingressos).

- Para cada papel, especifique:

    - Os caminhos de acesso em **write access** e **read access**.

    - Os caminhos proibidos via **Forbidden access**.

**1.2. Gestão de usuários**

- Em **Admin > Users**, crie ou modifique usuários preenchendo:

    - O **login**, o **alias**, o **e-mail de recuperação** e, se aplicável, a **Recovery npub**.

    - Atribua o papel apropriado a cada usuário.

- Usuários com acesso somente leitura verão os menus em itálico e não poderão fazer alterações.

# 2. Configuração do Ponto de Venda (POS) para Venda em Loja

**2.1. Atribuição e acesso POS**

- Atribua o papel **Point of Sale (POS)** via **Admin > Config > ARM** ao usuário responsável pelo caixa.

- Os usuários POS se conectam através da página de identificação segura e são redirecionados para a interface dedicada (ex.: **/pos** ou **/pos/touch**).

**2.2. Funcionalidades específicas do POS**

- **Adição rápida via alias:** Em **/cart**, o campo de adição por alias permite escanear um código de barras (ISBN, EAN13) para adicionar o produto diretamente.

- **Opções de pagamento POS:**

    - Possibilidade de gerenciar pagamentos multimodos (dinheiro, cartão, lightning, etc.).

    - Opções específicas para isenção de IVA ou desconto presente com inserção obrigatória de uma justificativa gerencial.

- **Exibição para o cliente:**

    - Em uma tela dedicada (ex.: tablet ou tela externa via HDMI), exiba a página **/pos/session** para que o cliente possa acompanhar a evolução do seu pedido.