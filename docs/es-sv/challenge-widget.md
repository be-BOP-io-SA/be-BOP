# Documentación del widget de desafío

Accesible a través de **Admin** > **Widgets** > **Challenge**, los widgets de desafío pueden usarse en tu be-BOP para rastrear desafíos de ventas, apoyo, etc. Pueden integrarse en zonas o páginas CMS.

![image](https://github.com/user-attachments/assets/88bfde44-acee-40e9-8b81-4bb278072065)

## Agregar un desafío

Para agregar un desafío, haz clic en **Add challenge**.

![image](https://github.com/user-attachments/assets/5797b4ca-f7d7-4fa0-9f5e-3fe7e4349083)

### 1. **Nombre del desafío**

El nombre del desafío. Un título corto y descriptivo que resume el objetivo del desafío.

### 2. **Modo**

El modo del desafío, que puede ser un número de artículos vendidos (**TotalProducts**) o un monto de dinero a recolectar (**MoneyAmount**).

### 3. **Meta**

El objetivo a alcanzar para el desafío. Acompañado de un campo de **currency** si el modo es **MoneyAmount**, que representa la moneda.

### 4. **Fecha de inicio**

La fecha en que comienza el desafío.

### 5. **Fecha de finalización**

La fecha límite para completar el desafío.

### 6. **Productos**

Una lista de productos cuyas ventas contribuyen al progreso del desafío.

## Integración CMS

Para integrar un desafío en una zona o página CMS, agrégalo de la siguiente manera: `[Challenge=slug]`.

![image](https://github.com/user-attachments/assets/25361bb3-1f69-477e-89d4-10a2abcf7779)

Y tu desafío se mostrará a tus usuarios de la siguiente manera.

![image](https://github.com/user-attachments/assets/cc368907-e559-4a24-a6f0-5ae0aa2ba220)
