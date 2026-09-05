# SumUp Configuration for the be-BOP Application

To integrate SumUp as a payment method in your **be-BOP** application, go to **Admin** > **Payment Settings** > **SumUp**.

![image](https://github.com/user-attachments/assets/9eea3d50-1963-4102-a8cc-502caeb295db)

## Configuration Settings

### 1. API Key

- **Description**: API key provided by SumUp to authenticate transactions.
- **Location**: Enter it in the **API Key** field in the configuration settings.
- **Example**: `YOUR_SUMUP_API_KEY`

### 2. Merchant Code

- **Description**: Unique merchant identification code provided by SumUp.
- **Location**: Enter it in the **Merchant Code** field.
- **Example**: `YOUR_MERCHANT_CODE`

### 3. Currency

- **Description**: Currency used for SumUp transactions in your **be-BOP** application.
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

![image](https://github.com/user-attachments/assets/d79fa78e-1ec9-4f71-b19e-5cea9861f278)

## Paying with Card

After configuration, you can now receive card payments.

![image](https://github.com/user-attachments/assets/2410c261-8346-4bc5-b959-1f2159300e2b)
