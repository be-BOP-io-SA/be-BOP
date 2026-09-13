# Stripe Configuration for the be-BOP Application

To integrate Stripe as a payment method in your **be-BOP** application, go to **Admin** > **Payment Settings** > **Stripe**.

![Capture d'écran du 2024-11-15 15-43-21](https://github.com/user-attachments/assets/a690c8b8-db70-482c-ad87-072623823639)

## Configuration Settings

### 1. Secret Key

- **Description**: Your Stripe secret key.
- **Location**: Enter it in the **Secret Key** field in the configuration settings.
- **Example**: `YOUR_STRIPE_SECRET_KEY`

### 2. Public key

- **Description**: Your Stripe public key.
- **Location**: Enter it in the **Public key** field.
- **Example**: `YOUR_STRIPE_PUBLIC_KEY`

### 3. Currency

- **Description**: Currency used for Stripe transactions in your **be-BOP** application.
- **Location**: Enter it in the **Currency** field.
- **Possible values**:

  | Symbol | Description                          |
  | ------ | ------------------------------------ |
  | `BTC`  | Bitcoin                              |
  | `CHF`  | Swiss Franc                          |
  | `EUR`  | Euro                                 |
  | `USD`  | US Dollar                            |
  | `ZAR`  | South African Rand                   |
  | `SAT`  | Satoshi (smallest unit of Bitcoin)   |
  | `XOF`  | West African CFA Franc               |
  | `XAF`  | Central African CFA Franc            |
  | `CDF`  | Congolese Franc                      |

- **Example**: `EUR`

![image](https://github.com/user-attachments/assets/50d3e3d8-1006-4e80-bc74-5d06614ece2d)

Once these steps are completed, Stripe will be added as a payment method on your platform.
