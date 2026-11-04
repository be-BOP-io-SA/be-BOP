# Documentação do Widget Tag

Acessível via **Admin** > **Widgets** > **Tag**, as tags são:

- Uma forma de gerir criadores/marcas/categorias sem um sistema pesado de gestão de categorias/marcas/fabricantes.
- Uma forma de enriquecer páginas web be-BOP com conteúdo estático e dinâmico em páginas CMS.
- Uma forma de dar a parceiros e vendedores um catálogo bonito e bem preenchido, cheio de contexto em torno dos produtos, sendo as categorias pseudo-dinâmicas mais do que apenas uma lista de produtos.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Família de Tags

As tags são classificadas em 4 famílias para uma organização mais fácil.

- Creators: para tags de criadores
- Retailers: para tags relacionadas com uma loja
- Temporal: para tags temporais
- Events: para tags de eventos

## Tags Especiais

Existe uma tag especial `pos-favorite`, ver [pos-touch-screen.md].

## Adicionar uma Tag

Para adicionar uma tag, clique em **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

A interface **"Add a tag"** permite aos utilizadores adicionar uma nova tag com informações específicas, como nome, slug, família, título, subtítulo...

### Campos do Formulário

- **Tag name**: O nome que identifica a tag.
- **Slug**: Identificador único usado no URL, para integração CMS... Gerado automaticamente a partir do nome.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Opções**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only**: Apenas para integração CMS, não pode ser usada como categoria.
  [ ] **Available for product tagging**: Disponível para categorizar produtos.
  [ ] **Use light/dark inverted mode**: Usar o modo invertido claro/escuro.

- **Tag Family**: A família da tag.

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Título exibido na tag durante a integração CMS.
- **Tag subtitle**: Subtítulo exibido na tag durante a integração CMS.
- **Short content**: Conteúdo curto a exibir de acordo com a variação.
- **Full content**: Conteúdo longo a exibir de acordo com a variação.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: Uma lista de fotos para carregar. Cada foto é associada a uma variação.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Botões, associados a links, encontrados ao exibir a tag numa zona ou página CMS.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text**: Descrição do botão associado à tag.
    _Exemplo: "Ver Mais"_
  - **URL**: Link URL apontando para uma página ou conteúdo adicional ao clicar no botão.
  - **Open in new tab**: Opção para abrir o link num novo separador do navegador.

- **CSS Override**: Para substituir o CSS existente na tag.

## Integração CMS

Para integrar uma tag numa zona ou página CMS, adicione-a da seguinte forma: `[Tag=slug?display=var-1]`.
Os valores `var` definem as variações de exibição possíveis, de `var-1` a `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

E a sua tag será exibida aos seus utilizadores da seguinte forma.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
