# PayPal Configuration

This section allows you to configure PayPal payment settings for your be-BOP. It is accessible via **Admin** > **Payment Settings** > **Paypal**.

![image](https://github.com/user-attachments/assets/67700d07-013e-4b4b-bc2e-53acc805a8e8)

## Configuration Fields

### **1. Client ID**

- **Description:** Unique identifier associated with your PayPal account.
- **How to obtain it:**
  - Log in to your PayPal account.
  - Go to the applications and API section.
  - Copy the corresponding `Client ID`.

### **2. Secret**

- **Description:** Secret key used for authentication with PayPal.
- **How to obtain it:**
  - In the same area where the `Client ID` is located, copy the `Secret` field.

### **3. Sandbox Mode**

- **Description:** Check this box if the credentials provided are for PayPal's test environment (sandbox).
- **Possible values:**
  - [x] Enabled (Test in sandbox environment)
  - [ ] Disabled (Production environment)

### **4. Currency**

- **Description:** Set the default currency used for PayPal payments.
- **Example:** `EUR` (Euros)
- **Available options:**

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

## Actions

### **Save**

- Saves the current settings in the application.

### **Reset**

- Resets all form fields to their default values.

## Paying with PayPal

After configuring PayPal, you can receive PayPal payments on your be-BOP.

![image](https://github.com/user-attachments/assets/6141cfbf-096e-4b61-b1d8-25f7423d4a4f)
