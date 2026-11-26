# Reporting Interface Documentation

This page allows you to view and export details about orders, products, and payments. It is accessible via the **Admin** > **Config** > **Reporting** tab.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

It displays reporting for the current month and year.

---

## Features

### 1. Reporting Filters

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Filter Options**: Allows filtering orders by their status:
  - `Include pending orders`: Include pending orders.
  - `Include expired orders`: Include expired orders.
  - `Include canceled orders`: Include canceled orders.
  - `Include partially paid orders`: Include partially paid orders.
- **Usage**: Check the corresponding boxes to include these order types in the report.
  By default, only paid orders are listed.

### 2. Order Detail

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Export CSV**: Allows exporting order details in CSV format.
- **Order Details Table**:
  - Displays order information. Each row represents an order.
  - `Order ID`: Unique order identifier (click to see more details).
  - `Order URL`: Direct link to the order.
  - `Order Date`: Order date.
  - `Order Status`: Order status (e.g., paid, pending).
  - `Currency`: Transaction currency.
  - `Amount`: Total order amount.
  - `Billing Country`: Billing country (if available).
  - `Billing Info`: Billing address information.
  - `Shipping Country`: Shipping country (if available).
  - `Shipping Info`: Shipping address information.
  - `Cart`: Items in the order cart.

### 3. Product Detail

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Export CSV**: Allows exporting product information associated with orders in CSV format.
- **Product Details Table**:
  - Displays information about products associated with orders. Each row corresponds to a product added for a specific order.
  - `Product URL`: Direct link to the product.
  - `Product Name`: Product name.
  - `Quantity`: Ordered quantity.
  - `Deposit`: Deposit amount for the product (if applicable).
  - `Order ID`: Associated order reference.
  - `Order Date`: Associated order date.
  - `Currency`: Transaction currency.
  - `Amount`: Total amount for this product.
  - `Vat Rate`: Applied VAT rate.

### 4. Payment Detail

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Export CSV**: Allows exporting payment details in CSV format.
- **Payment Details Table**:
  - Displays payment information associated with orders. Each row corresponds to a payment made for a specific order.
  - `Order ID`: Associated order reference.
  - `Invoice ID`: Invoice reference.
  - `Payment Date`: Payment date.
  - `Order Status`: Order status.
  - `Payment mean`: Payment method.
  - `Payment Status`: Payment status.
  - `Payment Info`: Payment information.
  - `Order Status`: Order status.
  - `Invoice`: Invoice number.
  - `Currency`: Store currency.
  - `Amount`: Payment amount converted with the currency.
  - `Cashed Currency`: Payment currency.
  - `Cashed Amount`: Payment amount converted with the payment currency.
  - `Billing Country`: Billing country.

### 5. Reporting Filter

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Used to filter reporting by selected month and year.

### 6. Order Synthesis

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Export CSV**: Allows exporting the order synthesis in CSV format.
- **Synthesis Table**:
  - Displays a summary of order statistics for a given period.
  - `Period`: Indicates the month and year of the period.
  - `Order Quantity`: Total number of orders placed during this period.
  - `Order Total`: Cumulative amount of all orders for the indicated period.
  - `Average Cart`: Average order amount for this period.
  - `Currency`: Currency in which orders were placed (e.g., BTC for Bitcoin).

### 7. Product Synthesis

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Export CSV**: Allows exporting the product synthesis in CSV format.
- **Synthesis Table**:
  - Displays a summary of product statistics for a given period.
  - `Period`: Indicates the month and year of the period.
  - `Product ID`: Product ID.
  - `Product Name`: Product name.
  - `Order Quantity`: Ordered quantity.
  - `Currency`: Currency in which orders were placed (e.g., BTC for Bitcoin).
  - `Total Price`: Order total (e.g., BTC for Bitcoin).

### 8. Payment Synthesis

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Export CSV**: Allows exporting the payment synthesis in CSV format.
- **Synthesis Table**:
  - Displays a summary of payment statistics for a given period.
  - `Period`: Indicates the month and year of the period.
  - `Payment Mean`: The payment method used.
  - `Payment Quantity`: The quantity paid.
  - `Total Price`: The total price paid.
  - `Currency`: Currency in which orders were placed (e.g., BTC for Bitcoin).
  - `Currency`: Currency in which orders were placed (e.g., BTC for Bitcoin).
  - `Average`: Average amount paid.

---

## Data Export

Each section (Order Detail, Product Detail, Payment Detail) has an `Export CSV` button to download the displayed data as a CSV file.

An example:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
