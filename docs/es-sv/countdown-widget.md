# Documentación de cuenta regresiva

Disponible a través de **Admin** > **Widgets** > **Countdowns**, esta interfaz te permite configurar una cuenta regresiva que puede usarse para resaltar una fecha límite importante, como una oferta promocional o un evento especial.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Agregar una cuenta regresiva

Para agregar una cuenta regresiva, haz clic en **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Nombre**

- **Descripción**: Identificador interno único para la cuenta regresiva.

### 2. **Slug**

- **Descripción**: URL o clave de identificación única para la cuenta regresiva.
- **Restricciones**:
  - Solo puede contener letras minúsculas, números y guiones.
  - Útil para generar enlaces específicos.

### 3. **Título**

- **Descripción**: Título visible asociado a la cuenta regresiva.
- **Uso**: Este texto puede mostrarse en el sitio para contextualizar la cuenta regresiva.

### 4. **Descripción**

- **Descripción**: Texto opcional que describe los detalles de la cuenta regresiva.
- **Uso**: Ideal para agregar contexto o instrucciones sobre el evento.

### 5. **Finaliza el**

- **Descripción**: Fecha y hora de finalización de la cuenta regresiva.
- **Detalles**:
  - La zona horaria se basa en el navegador del usuario (mostrada en **GMT+0**).
  - Usa el calendario integrado para seleccionar la fecha y hora de forma intuitiva.

## Integración CMS

Para integrar tu cuenta regresiva en una zona o página CMS, agrégala de la siguiente manera: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

Y tu cuenta regresiva se mostrará a tus usuarios de la siguiente manera.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
