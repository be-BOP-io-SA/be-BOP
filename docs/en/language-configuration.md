Language Configuration

The **Admin** > **Config** > **Languages** section allows you to define the available languages in your application and configure the default language.

## Features

### Available Languages

- **Language list**: Check the boxes of the languages you want to make available in your be-BOP application. You must select at least one language.

  - Example: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Default Language

- **Default language**: Select a language that will be used if the user's preferred translation is not available among the options.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Language Selector Management

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Show or hide the language selector**: Click the **here** link to manage the visibility of the language selector in the user interface.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Custom Translation Keys

The **Custom Translation Keys** section allows you to customize translations for different languages in your application.

## Features

### Overview

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- You can define **specific translation keys** for each available language.
- Translation keys are defined in JSON format. This allows simple and structured management of your translations.

### Editing Translations

1. **Select a language**:
   - Each language is represented in a separate section (e.g., `en` for English, `es-sv` for El Salvador Spanish).
2. **Add your translations**:
   - Add or modify keys and their values in the JSON text field.
   - Example `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Saving

- Once translations are added or modified, changes are automatically applied after validation and saving.
