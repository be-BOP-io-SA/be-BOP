Configuración de idiomas

La sección **Admin** > **Config** > **Languages** te permite definir los idiomas disponibles en tu aplicación y configurar el idioma predeterminado.

## Funcionalidades

### Idiomas disponibles

- **Lista de idiomas**: Marca las casillas de los idiomas que deseas hacer disponibles en tu aplicación be-BOP. Debes seleccionar al menos un idioma.

  - Ejemplo: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Idioma predeterminado

- **Idioma predeterminado**: Selecciona un idioma que se usará si la traducción preferida del usuario no está disponible entre las opciones.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Gestión del selector de idiomas

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Mostrar u ocultar el selector de idiomas**: Haz clic en el enlace **here** para gestionar la visibilidad del selector de idiomas en la interfaz de usuario.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Claves de traducción personalizadas

La sección **Custom Translation Keys** te permite personalizar las traducciones para diferentes idiomas en tu aplicación.

## Funcionalidades

### Resumen

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- Puedes definir **claves de traducción específicas** para cada idioma disponible.
- Las claves de traducción se definen en formato JSON. Esto permite una gestión simple y estructurada de tus traducciones.

### Editar traducciones

1. **Seleccionar un idioma**:
   - Cada idioma se representa en una sección separada (ej. `en` para inglés, `es-sv` para español de El Salvador).
2. **Agregar tus traducciones**:
   - Agrega o modifica claves y sus valores en el campo de texto JSON.
   - Ejemplo `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Guardar

- Una vez que las traducciones se agregan o modifican, los cambios se aplican automáticamente después de la validación y el guardado.
