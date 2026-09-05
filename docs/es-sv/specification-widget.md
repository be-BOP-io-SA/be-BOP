# Documentación del Widget de Especificaciones

Accesible a través de **Admin** > **Widgets** > **Specifications**, los widgets de especificaciones pueden usarse en su be-BOP para integrar especificaciones en zonas o páginas CMS.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Crear una Especificación

Para agregar una especificación, haga clic en **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Título
- Ingrese un título que describa las especificaciones.

### 2. Slug
- Proporcione un identificador único. Este slug se usa como clave única para referencias internas o URLs.

### 3. Contenido
- Complete el contenido como tabla CSV estructurada con las columnas: **Categoría**, **Etiqueta**, **Valor**.

#### Ejemplo para un reloj:

```csv
"Caja y esfera";"Metal";"Oro rosa de 18 quilates"
"Caja y esfera";"Diámetro de la caja";"41"
"Caja y esfera";"Espesor";"9,78 mm"
"Movimiento";"Movimiento";"Chopard 01.03-C"
"Movimiento";"Tipo de cuerda";"Movimiento mecánico con cuerda automática"
"Movimiento";"Reserva de marcha";"Aproximadamente 60 horas"
```

## Integración CMS

Para agregar una especificación en una zona CMS, puede usar `[Specification=slug]`.

- Ejemplo en una zona CMS de un producto.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  Y al mostrar el producto, verá:
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
