# Documentação do Widget de Especificações

Acessível via **Admin** > **Widgets** > **Specifications**, os widgets de especificações podem ser usados no seu be-BOP para integrar especificações em zonas ou páginas CMS. Este widget pode ser usado para fornecer especificações para os seus artigos no be-BOP.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Criar uma Especificação

Para adicionar uma especificação, clique em **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Title

- Introduza um título descrevendo as especificações.

### 2. Slug

- Forneça um identificador único.
  Este slug é usado como chave única para referências internas ou URLs.

### 3. Content

- Preencha o conteúdo como uma tabela CSV estruturada com as seguintes colunas:
  - **Category**: O grupo ao qual a especificação pertence.
  - **Label**: Nome específico da característica.
  - **Value**: Detalhe da especificação.

#### Exemplo de conteúdo para um relógio:

```csv
"Caixa e mostrador";"Metal";"Ouro rosa de 18 quilates"
"Caixa e mostrador";"Diâmetro da caixa";"41"
"Caixa e mostrador";"Espessura";"9,78 mm"
"Caixa e mostrador";"Diamantes (quilates)";"10,48"
"Caixa e mostrador";"Mostrador";"Ouro rosa de 18 quilates totalmente cravejado de diamantes"
"Caixa e mostrador";"Resistência à água";"100 metros"
"Caixa e mostrador";"Fundo da caixa";"cristal de safira"
"Movimento";"Movimento";"Chopard 01.03-C"
"Movimento";"Tipo de corda";"movimento mecânico com corda automática"
"Movimento";"Função";"horas e minutos"
"Movimento";"Reserva de marcha";"Reserva de marcha de aproximadamente 60 horas"
"Movimento";"Frequência";"4 Hz (28.800 vibrações por hora)"
"Movimento";"Espiral";"plana"
"Movimento";"Balanceiro";"três braços"
"Movimento";"Dimensões do movimento";"Ø 28,80 mm"
"Movimento";"Espessura do movimento";"4,95 mm"
"Movimento";"Número de componentes do movimento";"182"
"Movimento";"Rubis";"27"
"Bracelete e fecho";"Tipo de fecho";"fecho de báscula"
"Bracelete e fecho";"Material do fecho";"Ouro rosa de 18 quilates"

```

## Integração CMS

Para adicionar uma especificação a uma zona CMS, pode usar `[Specification=slug]`.

- Exemplo numa zona CMS de produto.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  E ao exibir o produto, verá:
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
