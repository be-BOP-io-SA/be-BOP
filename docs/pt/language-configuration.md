Configuração de Idiomas

A secção **Admin** > **Config** > **Languages** permite definir os idiomas disponíveis na sua aplicação e configurar o idioma padrão.

## Funcionalidades

### Idiomas Disponíveis

- **Lista de idiomas**: Marque as caixas dos idiomas que deseja disponibilizar na sua aplicação be-BOP. Deve selecionar pelo menos um idioma.

  - Exemplo: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Idioma Padrão

- **Idioma padrão**: Selecione um idioma que será usado se a tradução preferida do utilizador não estiver disponível entre as opções.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Gestão do Seletor de Idiomas

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Mostrar ou ocultar o seletor de idiomas**: Clique no link **here** para gerir a visibilidade do seletor de idiomas na interface do utilizador.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Chaves de Tradução Personalizadas

A secção **Custom Translation Keys** permite personalizar traduções para diferentes idiomas na sua aplicação.

## Funcionalidades

### Visão Geral

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- Pode definir **chaves de tradução específicas** para cada idioma disponível.
- As chaves de tradução são definidas em formato JSON. Isto permite uma gestão simples e estruturada das suas traduções.

### Editar Traduções

1. **Selecionar um idioma**:
   - Cada idioma é representado numa secção separada (ex.: `en` para Inglês, `es-sv` para Espanhol de El Salvador).
2. **Adicionar as suas traduções**:
   - Adicione ou modifique chaves e os seus valores no campo de texto JSON.
   - Exemplo `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Guardar

- Uma vez adicionadas ou modificadas as traduções, as alterações são automaticamente aplicadas após validação e gravação.
