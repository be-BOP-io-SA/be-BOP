# Configuración de Bitcoin Nodeless

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Esta página te permite configurar el módulo "Bitcoin nodeless" para generar direcciones y rastrear pagos en Bitcoin manteniendo el control total de los fondos en tu propia billetera.
Es accesible a través de **Admin** > **Payment Settings** > **Bitcoin nodeless**.

---

## **Configuración**

### **1. Estándar BIP**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Descripción**: Estándar BIP utilizado para generar direcciones Bitcoin.
- **Opciones disponibles**:
  - `BIP 84` (actualmente, esta es la única opción soportada).
- **Instrucciones**:
  - Si estás usando una billetera compatible, elige `BIP 84`.

---

### **2. Clave pública (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Descripción**: Una clave pública en formato `zpub` para transacciones Bitcoin.
- **Instrucciones**:
  - Usa una billetera como **Sparrow Wallet** para generar una clave `zpub` o `vpub` (para testnet).
  - Asegúrate de que la ruta de derivación sea:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Ingresa la clave en el campo.

---

### **3. Índice de derivación**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Descripción**: El índice de la dirección a generar.
- **Instrucciones**:
  - Por defecto, comienza en `0` y se incrementa en `1` por cada nueva dirección generada.
  - **No modifiques este valor** a menos que sepas lo que estás haciendo — esto podría llevar a la reutilización de direcciones o crear direcciones que no serán detectadas por tu billetera.

---

### **4. URL de Mempool**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Descripción**: URL de la API de Mempool para verificar fondos entrantes en las direcciones generadas.
- **Ejemplo predeterminado**:
  - Testnet: `https://mempool.space/testnet`
- **Instrucciones**:
  - Si alojas tu propia instancia de Mempool, puedes reemplazar esta URL.
  - Para testnet, agrega el sufijo `/testnet`.

---

## **Próximas direcciones generadas**

Las próximas direcciones generadas a partir de esta configuración se muestran en la sección **"Next addresses"**. Estas direcciones se basan en la clave pública y el índice de derivación.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
