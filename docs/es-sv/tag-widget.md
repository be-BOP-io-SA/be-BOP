# Documentación del Widget Tag

Accesible a través de **Admin** > **Widgets** > **Tag**, los tags son:

- Una forma de gestionar creadores/marcas/categorías sin un sistema pesado de gestión.
- Una forma de enriquecer las páginas web be-BOP con contenido estático y dinámico en páginas CMS.
- Una forma de dar a socios y vendedores un catálogo completo y contextualizado.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Familia de Tags
- Creators: para tags de creadores
- Retailers: para tags de tiendas
- Temporal: para tags temporales
- Events: para tags de eventos

## Tags Especiales
Existe un tag especial `pos-favorite`, ver [pos-touch-screen.md].

## Agregar un Tag

Haga clic en **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

### Campos del Formulario

- **Tag name**: El nombre que identifica el tag.
- **Slug**: Identificador único utilizado en la URL, para integración CMS. Auto-generado desde el nombre.
  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Opciones**
  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)
  [ ] **For widget use only**: Solo para integración CMS.
  [ ] **Available for product tagging**: Disponible para categorizar productos.
  [ ] **Use light/dark inverted mode**: Usar modo invertido claro/oscuro.

- **Tag Family**: La familia del tag.
  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Título mostrado en el tag durante la integración CMS.
- **Tag subtitle**: Subtítulo mostrado en el tag.
- **Short content**: Contenido corto a mostrar según la variación.
- **Full content**: Contenido largo a mostrar según la variación.
  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: Lista de fotos a subir. Cada foto se asocia a una variación.
  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Botones asociados a enlaces.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)
  - **Text**: Descripción del botón. _Ejemplo: "Ver Más"_
  - **URL**: Enlace URL al hacer clic.
  - **Open in new tab**: Abrir en nueva pestaña.

- **CSS Override**: Para sobreescribir el CSS existente del tag.

## Integración CMS

Para integrar un tag: `[Tag=slug?display=var-1]`.
Los valores `var` definen las variaciones de visualización, de `var-1` a `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

Y su tag se mostrará así:

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
