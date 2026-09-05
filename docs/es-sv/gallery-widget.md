# Documentación del widget de galería

Disponible a través de **Admin** > **Widgets** > **Gallery**, los widgets de galería pueden usarse en tu be-BOP para integrar galerías de 3 imágenes en zonas o páginas CMS.

![image](https://github.com/user-attachments/assets/77697e24-f90c-4e6e-828a-235b99da1d34)

## Agregar una galería

Para agregar una galería, haz clic en **Add contact form**.

![image](https://github.com/user-attachments/assets/9730f949-57a2-4508-aff9-edc3edcfa84c)

La interfaz **"Add a gallery"** permite a los usuarios agregar una nueva galería con información específica, como nombre, slug, contenido principal y contenido secundario.

### Campos del formulario

- **Gallery Name**:
  Campo de texto para definir el nombre de la galería.
  _Ejemplo: "Galería de Otoño"_

- **Gallery Slug**:
  Identificador único de la galería usado en la URL, para integración CMS...
  _Ejemplo: "autumn-gallery"_

- **Galería principal**:

  ![image](https://github.com/user-attachments/assets/6c5e6376-7150-44b0-9c8b-dbf9cde280eb)

  - **Gallery Title**: Título principal de la galería.
    _Ejemplo: "Best Photos Gallery"_
  - **Gallery Content**: Campo de texto para agregar descripciones o información específica sobre la galería.

- **Botón asociado**:

  - **Text**: Descripción del botón asociado a la galería.
    _Ejemplo: "Ver más"_
  - **URL**: Enlace URL que apunta a una página o contenido adicional al hacer clic en el botón.
  - **Open in new tab**: Opción para abrir el enlace en una nueva pestaña del navegador.

- **Galería secundaria** (hay 3):

  ![image](https://github.com/user-attachments/assets/282ee84b-fbc3-4c75-b443-0e1fcd4afe7e)

  - **Gallery subtitle**: Título de esta galería secundaria.
    _Ejemplo: "Best Photos Gallery"_
  - **Gallery subcontent**: Campo de texto para agregar descripciones o información específica sobre esta galería secundaria.

- **Imagen asociada**: Una imagen que se asociará con esta galería secundaria.

- **Botón asociado**:

  - **Text**: Descripción del botón asociado a esta galería secundaria.
    _Ejemplo: "Ver más"_
  - **URL**: Enlace URL que apunta a una página o contenido adicional al hacer clic en el botón.
  - **Open in new tab**: Opción para abrir el enlace en una nueva pestaña del navegador.

## Integración CMS

Para integrar una galería en una zona o página CMS, agrégala de la siguiente manera: `[Gallery=slug]`.

![image](https://github.com/user-attachments/assets/1ed5fa0c-05a5-4fc9-adad-cc84c871822c)

Y tu galería se mostrará a tus usuarios de la siguiente manera.

![image](https://github.com/user-attachments/assets/41161c2d-fd55-48b7-a78b-73e147eb48e6)
