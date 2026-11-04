# Configuración de Stripe para la Aplicación be-BOP

Para integrar Stripe como método de pago en su aplicación **be-BOP**, vaya a **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Ajustes de Configuración

### 1. Secret Key
- **Descripción**: Su clave secreta de Stripe.
- **Ubicación**: Ingrésela en el campo **Secret Key**.
- **Ejemplo**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key
- **Descripción**: Su clave pública de Stripe.
- **Ubicación**: Ingrésela en el campo **Public key**.
- **Ejemplo**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency
- **Descripción**: Moneda utilizada para las transacciones Stripe.
- **Valores posibles**:

  | Símbolo | Descripción                             |
  | ------- | --------------------------------------- |
  | `BTC`   | Bitcoin                                 |
  | `CHF`   | Franco suizo                            |
  | `EUR`   | Euro                                    |
  | `USD`   | Dólar estadounidense                    |
  | `SAT`   | Satoshi (unidad más pequeña de Bitcoin) |

- **Ejemplo**: `USD`

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Una vez completados estos pasos, Stripe se agregará como método de pago en su plataforma.
