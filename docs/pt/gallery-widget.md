# Documentação do Widget Galeria

Disponível via **Admin** > **Widgets** > **Gallery**, os widgets de galeria podem ser usados no seu be-BOP para integrar galerias de 3 imagens em zonas ou páginas CMS.

![image](https://github.com/user-attachments/assets/77697e24-f90c-4e6e-828a-235b99da1d34)

## Adicionar uma Galeria

Para adicionar uma galeria, clique em **Add contact form**.

![image](https://github.com/user-attachments/assets/9730f949-57a2-4508-aff9-edc3edcfa84c)

A interface **"Add a gallery"** permite aos utilizadores adicionar uma nova galeria com informações específicas, como nome, slug, conteúdo principal e conteúdo secundário.

### Campos do Formulário

- **Gallery Name**:
  Campo de texto para definir o nome da galeria.
  _Exemplo: "Galeria de Outono"_

- **Gallery Slug**:
  Identificador único da galeria usado no URL, para integração CMS...
  _Exemplo: "galeria-outono"_

- **Galeria Principal**:

  ![image](https://github.com/user-attachments/assets/6c5e6376-7150-44b0-9c8b-dbf9cde280eb)

  - **Gallery Title**: Título principal da galeria.
    _Exemplo: "Melhor Galeria de Fotos"_
  - **Gallery Content**: Campo de texto para adicionar descrições ou informações específicas sobre a galeria.

- **Botão associado**:

  - **Text**: Descrição do botão associado à galeria.
    _Exemplo: "Ver Mais"_
  - **URL**: Link URL apontando para uma página ou conteúdo adicional ao clicar no botão.
  - **Open in new tab**: Opção para abrir o link num novo separador do navegador.

- **Galeria Secundária** (existem 3):

  ![image](https://github.com/user-attachments/assets/282ee84b-fbc3-4c75-b443-0e1fcd4afe7e)

  - **Gallery subtitle**: Título desta galeria secundária.
    _Exemplo: "Melhor Galeria de Fotos"_
  - **Gallery subcontent**: Campo de texto para adicionar descrições ou informações específicas sobre esta galeria secundária.

- **Imagem associada**: Uma imagem que será associada a esta galeria secundária.

- **Botão associado**:

  - **Text**: Descrição do botão associado a esta galeria secundária.
    _Exemplo: "Ver Mais"_
  - **URL**: Link URL apontando para uma página ou conteúdo adicional ao clicar no botão.
  - **Open in new tab**: Opção para abrir o link num novo separador do navegador.

## Integração CMS

Para integrar uma galeria numa zona ou página CMS, adicione-a da seguinte forma: `[Gallery=slug]`.

![image](https://github.com/user-attachments/assets/1ed5fa0c-05a5-4fc9-adad-cc84c871822c)

E a sua galeria será exibida aos seus utilizadores da seguinte forma.

![image](https://github.com/user-attachments/assets/41161c2d-fd55-48b7-a78b-73e147eb48e6)
