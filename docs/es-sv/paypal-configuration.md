# Configuración de PayPal

Esta sección permite configurar los ajustes de pago de PayPal para su be-BOP. Es accesible a través de **Admin** > **Payment Settings** > **Paypal**.

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Campos de Configuración

### **1. Client ID**
- **Descripción:** Identificador único asociado a su cuenta PayPal.
- **Cómo obtenerlo:** Inicie sesión en su cuenta PayPal, vaya a la sección de aplicaciones y API, y copie el `Client ID` correspondiente.

### **2. Secret**
- **Descripción:** Clave secreta utilizada para la autenticación con PayPal.
- **Cómo obtenerlo:** En la misma área donde se encuentra el `Client ID`, copie el campo `Secret`.

### **3. Sandbox Mode**
- **Descripción:** Marque esta casilla si las credenciales proporcionadas son para el entorno de prueba (sandbox) de PayPal.

### **4. Currency**
- **Descripción:** Establezca la moneda predeterminada utilizada para los pagos de PayPal.
- **Ejemplo:** `USD`
- **Opciones disponibles:**

  | Símbolo | Descripción                             |
  | ------- | --------------------------------------- |
  | `BTC`   | Bitcoin                                 |
  | `CHF`   | Franco suizo                            |
  | `EUR`   | Euro                                    |
  | `USD`   | Dólar estadounidense                    |
  | `ZAR`   | Rand sudafricano                        |
  | `SAT`   | Satoshi (unidad más pequeña de Bitcoin) |
  | `XOF`   | Franco CFA de África Occidental         |
  | `XAF`   | Franco CFA de África Central            |
  | `CDF`   | Franco congoleño                        |

## Acciones

- **Save**: Guarda los ajustes actuales.
- **Reset**: Restablece todos los campos a sus valores predeterminados.

## Pagar con PayPal

Después de configurar PayPal, puede recibir pagos con PayPal en su be-BOP.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
